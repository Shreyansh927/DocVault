import { tool } from "langchain/tools";
import { createFallbackAgent } from "./agentFactory.js";
import { db } from "../db.js";

import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";

import { z } from "zod";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",

  apiKey: process.env.GEMINI_API_KEY,
});

const geminiResponse = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",

  apiKey: process.env.GEMINI_API_KEY,
});

const generateFinalResponse = async (context, userQuery) => {
  try {
    const result = await geminiResponse.invoke([
      {
        role: "system",

        content: `
You are DocVault's AI assistant.

Answer ONLY using the retrieved document context.

If the answer cannot be determined from the context,
say:

"I couldn't find relevant information in your documents."
        `,
      },

      {
        role: "user",

        content: `
User Query:
${userQuery}

Retrieved Context:
${context}
        `,
      },
    ]);

    return result.content;
  } catch (error) {
    console.error("Error generating final response:", error);

    return "I found relevant documents but " + "couldn't generate a response.";
  }
};

export const aiQueryResponse = async (req, res) => {
  try {
    const userId = req.user.id;

    const { q } = req.query;

    if (!q?.trim()) {
      return res.status(400).json({
        error: "Query is required",
      });
    }

    const fetchUserQueryResponse = tool(
      async ({ userQuery }) => {
        try {
          const queryEmbedding = await embeddings.embedQuery(userQuery);

          if (!queryEmbedding) {
            return "Sorry, I couldn't understand your query.";
          }

          const finalEmbedding = `[${queryEmbedding.join(",")}]`;

          const { rows } = await db.query(
            `
            SELECT
              f.filename,
              f.ai_summary,
              fo.folder_name
            FROM files f
            JOIN folders fo
              ON fo.id = f.folder_id
            WHERE fo.user_id = $1
              AND f.deleted_at IS NULL
              AND f.new_embedding IS NOT NULL
            ORDER BY f.new_embedding <-> $2
            LIMIT 3
            `,
            [userId, finalEmbedding],
          );

          if (rows.length === 0) {
            return "No relevant documents were found.";
          }

          const context = rows
            .map(
              (row) => `
Filename: ${row.filename}

Folder: ${row.folder_name}

Summary: ${row.ai_summary}
            `,
            )
            .join("\n\n");

          return await generateFinalResponse(context, userQuery);
        } catch (error) {
          console.error("Semantic search error:", error);

          return "An error occurred while searching " + "your documents.";
        }
      },

      {
        name: "search_user_documents",

        description: `
Search the authenticated user's stored documents.

Use this tool whenever the user asks about:

- file contents
- document summaries
- folder locations
- information contained inside uploaded documents
        `,

        schema: z.object({
          userQuery: z.string(),
        }),
      },
    );

    const mainAgent = createFallbackAgent(
      [fetchUserQueryResponse],

      `
You are DocVault's AI assistant.

You can help users:

- locate files,
- identify folders,
- answer questions about uploaded documents.

Available tools:

1. search_user_documents

Rules:

- Use ONLY the tools listed above.
- Never invent tool names.
- Never perform web searches.
- Never call brave_search.
- Never call google_search.
- If the user's question is unrelated to documents,
answer directly without tools.
- When the user asks about documents,
always use search_user_documents.
      `,
    );

    const result = await mainAgent.invoke(
      {
        messages: [
          {
            role: "user",

            content: q,
          },
        ],
      },

      {
        configurable: {
          thread_id: userId.toString(),
        },
      },
    );

    const finalAnswer =
      result.messages[result.messages.length - 1]?.content ||
      "No response generated.";

    return res.json({
      answer: finalAnswer,
    });
  } catch (error) {
    console.error("Error handling user query:", error);

    return res.status(500).json({
      error: "An error occurred while processing your request.",
    });
  }
};
