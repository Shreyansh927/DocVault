import { tool } from "langchain/tools";
import { createFallbackAgent } from "./agentFactory.js";
import { db } from "../db.js";
import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";
import { z } from "zod";

// Gemini LLM
const geminiResponse = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
});

// Gemini Embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.GEMINI_API_KEY,
});

// Generate final answer using retrieved context
const generateFinalResponse = async (responseContext, userId, userQuery) => {
  try {
    const result = await geminiResponse.invoke([
      {
        role: "system",
        content: `
You are DocVault's AI assistant.

Your job is to help users locate files, identify folders,
retrieve document-related information, and answer questions
based ONLY on the provided context.

If the answer cannot be determined from the context,
say that you could not find relevant information.
        `,
      },

      {
        role: "user",
        content: `
User ID: ${userId}

User Query:
${userQuery}

Retrieved Context:
${responseContext}

Answer the user's query concisely.
        `,
      },
    ]);

    return result.content;
  } catch (err) {
    console.error("Error generating Gemini response:", err);

    return "Sorry, I couldn't process your request at the moment.";
  }
};

// Semantic search tool
const fetchUserQueryResponse = tool(
  async ({ userQuery, userId }) => {
    try {
      // Generate embedding
      const queryEmbedding = await embeddings.embedQuery(userQuery);

      if (!queryEmbedding) {
        return "Sorry, I couldn't understand your query.";
      }

      const finalEmbedding = `[${queryEmbedding.join(",")}]`;

      // Search pgvector
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
Summary: ${row.ai_summary}
Folder: ${row.folder_name}
        `,
        )
        .join("\n\n");

      return await generateFinalResponse(context, userId, userQuery);
    } catch (error) {
      console.error("Error inside semantic search tool:", error);

      return "An error occurred while searching your documents.";
    }
  },

  {
    name: "search_user_documents",

    description:
      "Search the user's documents semantically and answer questions about them.",

    schema: z.object({
      userQuery: z.string(),

      userId: z.number(),
    }),
  },
);

// Agent tools
const tools = [fetchUserQueryResponse];

// Main Agent
const mainAgent = createFallbackAgent(
  tools,

  `
You are DocVault's AI assistant.

You help users:
- Locate documents,
- Identify folder locations,
- Retrieve information from stored files,
- Answer questions based on semantic search results.

Always use the available tools whenever the user asks
about their documents.
`,
);

// API Controller
export const aiQueryResponse = async (req, res) => {
  try {
    const userId = req.user.id;

    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        error: "Query is required",
      });
    }

    const result = await mainAgent.invoke(
      {
        messages: [
          {
            role: "user",

            content: `
User ID: ${userId}

Command:
${q}
            `,
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
