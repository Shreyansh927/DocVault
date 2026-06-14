import { tool } from "langchain/tools";
import { createFallbackAgent } from "./agentFactory.js";
import { db } from "../db.js";

import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";

import { ChatOllama } from "@langchain/ollama";

import { z } from "zod";

let currentUserId = null;
let userCurrentQuery = null;

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",

  apiKey: process.env.GEMINI_API_KEY,
});

const geminiResponse = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",

  apiKey: process.env.GEMINI_API_KEY,
});

const ollamaResponse = new ChatOllama({
  model: "llama3:latest",
  baseUrl: "http://localhost:11434",
});

const generateFinalResponse = async (context, userQuery) => {
  try {
    const result = await geminiResponse.invoke([
      {
        role: "system",

        content: `
You are DocVault's AI assistant.

The following context comes from the authenticated user's OWN uploaded documents.

The user has explicitly requested information from their own files.

You MUST answer ONLY using the provided context.

If the requested information exists in the context, provide it exactly.

Do NOT refuse requests for personal identifiers (such as Aadhaar numbers, PAN numbers, passport details, phone numbers, addresses, or dates of birth) when they are present in the authenticated user's own documents.

If the answer is not present in the context, simply state that it could not be found in the user's documents.

Context:
${context}

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
    console.log("LLM result for final response generation:", result.content);

    return result.content;
  } catch (error) {
    console.error("Error generating final response:", error);

    return "I found relevant documents but " + "couldn't generate a response.";
  }
};

// const getRequiredFilesTool = tool(
//   async ({ currentUserId, userCurrentQuery }) => {
//     try {
//       const queryEmbedding = await embeddings.embedQuery(userCurrentQuery);

//       if (!queryEmbedding) {
//         return "Sorry, I couldn't understand your query.";
//       }
//       const finalEmbedding = `[${queryEmbedding.join(",")}]`;

//       const { rows } = await db.query(
//         `SELECT
//               f.filename,
//               f.ai_summary,
//               fo.folder_name
//             FROM files f
//             JOIN folders fo
//               ON fo.id = f.folder_id
//             WHERE fo.user_id = $1
//               AND f.deleted_at IS NULL
//               AND f.new_embedding IS NOT NULL
//             ORDER BY f.new_embedding <-> $2
//             LIMIT 3`,
//         [currentUserId, finalEmbedding],
//       );

//       if (rows.length === 0) {
//         return "No relevant documents were found.";
//       } else {
//         return rows
//           .map(
//             (row) => `
// Filename: ${row.filename}
// Folder: ${row.folder_name}
// Summary: ${row.ai_summary}
//             `,
//           )
//           .join("\n\n");
//       }
//     } catch (error) {
//       console.error("Error in getRequiredFilesTool:", error);
//       return "An error occurred while fetching the required files.";
//     }
//   },
// );

const createFolderTool = tool(
  async ({ folderName, userId, category }) => {
    console.log(" createFolderTool called with:", {
      folderName,
      userId,
      category,
    });

    try {
      const user = await db.query(`SELECT id FROM users WHERE id=$1`, [userId]);
      if (!user.rows.length) {
        return "User not found.";
      }

      // check if folder already exists
      const exists = await db.query(
        `SELECT 1 FROM folders WHERE folder_name=$1 AND user_id=$2`,
        [folderName.trim(), userId],
      );

      if (exists.rows.length) {
        return "Folder already exists.";
      }

      // await redis?.del(`userFolders:${userId}`);

      await db.query(
        `INSERT INTO folders (folder_name, user_id, category)
       VALUES ($1, $2, $3)`,
        [folderName.trim(), userId, category],
      );

      return "Folder created successfully.";
    } catch (err) {
      console.error("Error in createFolderTool:", err);
      return "An error occurred while creating the folder.";
    }
  },
  {
    name: "create_folder",
    description: `
Create a new folder for the authenticated user.`,
    schema: z.object({
      folderName: z.string(),
      userId: z.number(),
      category: z.string().optional(),
    }),
  },
);

const movingFilesTool = tool(
  async ({ userId, movingFileName, destinationFolderName }) => {
    console.log(" movingFilesTool called with:", {
      userId,
      movingFileName,
      destinationFolderName,
    });

    try {
      // Check user exists
      const user = await db.query(`SELECT id FROM users WHERE id = $1`, [
        userId,
      ]);

      if (!user.rows.length) {
        return "User not found.";
      }

      // Find destination folder
      const folderResult = await db.query(
        `
        SELECT id
        FROM folders
        WHERE folder_name = $1
          AND user_id = $2
        `,
        [destinationFolderName.trim(), userId],
      );

      if (!folderResult.rows.length) {
        return "Destination folder not found.";
      }

      const destinationFolderId = folderResult.rows[0].id;

      // Find file and its current folder
      const fileResult = await db.query(
        `
        SELECT
          f.id,
          f.folder_id
        FROM files f
        JOIN folders fo
          ON fo.id = f.folder_id
        WHERE f.filename = $1
          AND fo.user_id = $2
        `,
        [movingFileName.trim(), userId],
      );

      if (!fileResult.rows.length) {
        return "Source file not found.";
      }

      const fileId = fileResult.rows[0].id;

      const sourceFolderId = fileResult.rows[0].folder_id;

      // Prevent moving to same folder
      if (sourceFolderId === destinationFolderId) {
        return `The file '${movingFileName}' is already in folder '${destinationFolderName}'.`;
      }

      // Move file
      await db.query(
        `
        UPDATE files
        SET folder_id = $1
        WHERE id = $2
        `,
        [destinationFolderId, fileId],
      );

      return `File '${movingFileName}' moved successfully to folder '${destinationFolderName}'.`;
    } catch (error) {
      console.error("Error in movingFilesTool:", error);

      return "An error occurred while moving the file.";
    }
  },

  {
    name: "move_file",

    description: `
Move an existing file from one folder to another for the authenticated user.

Use this tool whenever the user asks to:

- move a file
- transfer a document
- relocate a document
- shift a file to another folder
`,

    schema: z.object({
      userId: z.number(),

      movingFileName: z.string(),

      destinationFolderName: z.string(),
    }),
  },
);

export const aiQueryResponse = async (req, res) => {
  try {
    let userId = req.user.id;
    currentUserId = userId;

    let { q } = req.query;
    userCurrentQuery = q;

    if (!q?.trim()) {
      return res.status(400).json({
        error: "Query is required",
      });
    }

    const fetchUserQueryResponse = tool(
      async ({ userQuery }) => {
        console.log("TOOL CALLED");
        console.log("User Query:", userQuery);
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
            LIMIT 1
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
          console.log("Retrieved context for user query:", context);

          return `CONTEXT START
${context}
CONTEXT END`;
        } catch (error) {
          console.error("Semantic search error:", error);

          return "An error occurred while searching " + "your documents.";
        }
      },

      {
        name: "search_user_documents",

        description: `
Use this tool ONLY when the user asks about:

- document contents
- summaries of files
- information extracted from documents
- questions answerable using document text

DO NOT use this tool for:

- moving files
- folder operations
- file location queries
- metadata retrieval
- file management tasks
        `,

        schema: z.object({
          userQuery: z.string(),
        }),
      },
    );

    const tools = [fetchUserQueryResponse, createFolderTool, movingFilesTool];

    const mainAgent = createFallbackAgent(
      tools,

      `
You are DocVault's AI assistant.

The user is authenticated and querying their OWN uploaded documents.

If the user asks for information that may exist inside their documents,
including personal identifiers such as Aadhaar numbers, PAN numbers,
passport details, invoice numbers, dates, addresses, or phone numbers,
you MUST first use the available document search tools.

Only refuse requests that attempt to retrieve information belonging
to OTHER users or information not present in the authenticated user's documents.

Never assume you cannot access information before searching the user's documents.


      `,
    );

    const result = await mainAgent.invoke(
      {
        messages: [
          {
            role: "user",

            content: `userId: ${userId}

User Query: ${q}`,
          },
        ],
      },

      {
        configurable: {
          thread_id: userId.toString(),
        },
      },
    );

    console.log("RESULT:");
    console.dir(result, { depth: null });
    console.log("TYPE:", typeof result);
    console.log("KEYS:", Object.keys(result));

    const finalAnswer =
      result.messages[result.messages.length - 1]?.content ||
      "No response generated.";

    console.log("Final agent response:", finalAnswer);

    return res.json({
      response: finalAnswer,
    });
  } catch (error) {
    console.error("Error handling user query:", error);

    return res.status(500).json({
      error: "An error occurred while processing your request.",
    });
  }
};
