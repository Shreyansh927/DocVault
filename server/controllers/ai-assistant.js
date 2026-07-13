import { tool } from "langchain/tools";
import { createFallbackAgent } from "./agentFactory.js";
import { db } from "../db.js";

import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";

import { ChatOllama } from "@langchain/ollama";

import { z } from "zod";
// import { query } from "express";

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

// tool for controlling access to public folder to any friend

const accessControlTool = tool(
  async ({ userId, friendNames, accessType }) => {
    try {
      console.log("function called")
      const friend = await db.query(
        `SELECT id FROM users WHERE LOWER(name)=LOWER($1)`,
        [friendNames],
      );

      if (!friend.rows.length) {
        return `User '${friendNames}' not found.`;
      }

      const friendId = friend.rows[0].id;

      const authenticateFriend = await db.query(
        `
        SELECT 1
        FROM connections
        WHERE
          (sender_id = $1 AND receiver_id = $2)
          OR
          (sender_id = $2 AND receiver_id = $1)
        `,
        [userId, friendId],
      );

      if (!authenticateFriend.rows.length) {
        return `${friendNames} is not in your connections list.`;
      }

      if (accessType === "allow") {
        await db.query(
          `
          UPDATE friends
          SET show_folders = TRUE
          WHERE user_id = $1
            AND friend_id = $2
          `,
          [userId, friendId],
        );

        return `Folder access allowed for ${friendNames}.`;
      }

      await db.query(
        `
        UPDATE friends
        SET show_folders = FALSE
        WHERE user_id = $1
          AND friend_id = $2
        `,
        [userId, friendId],
      );

      return `Folder access revoked for ${friendNames}.`;
    } catch (err) {
      console.error(err);

      return "An error occurred while updating folder permissions.";
    }
  },

  {
    name: "toggle_folder_access",

    description: `
Allow or revoke folder access for one of the user's connected friends.

The friend name provided by the user may not exactly match the stored name in the database. Interpret the user's intent flexibly and identify the most likely friend by considering close matches, nicknames, case differences, spaces, underscores, and trailing numbers.

Examples:
- User says "Rana" → stored name is "rana_12".
- User says "Aman" → stored name is "aman_kumar".
- User says "John" → stored name is "john123".

If exactly one reasonable match exists among the user's connected friends, use that friend automatically.

If multiple close matches exist (e.g., "rana_12" and "rana_22"), ask the user for clarification instead of making assumptions.

Only report that a friend cannot be found if there are no reasonable matches in the user's connected friend list.

Never search outside the user's existing connections. and i can give command to allow or revoke access to my folders for many friends at a time so be prepared
`,

    schema: z.object({
      userId: z.number(),

      friendNames: z
        .array(z.string())
        .min(1, "At least one friend name is required"),

      accessType: z.enum(["allow", "revoke"]),
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

suppose if user asks to move let say adhaar card file or any other file you have to understand his intent and first confirm which file he wants to move show him exactly which files he wants to move and then once he confirms it then directly move them to folder he already said or if he didn't say any folder then ask him to which folder he wants to move the file and then move it to that folder. Provide the list of all file nnames you think he is referring to if did'nt provide the exact name.But most imp thing whatever file you think is close to what user is referring to you to first confirm it 
by returning the name of the you think , once user confirms it then directly move to the destination folder user once said.
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

    let qurEmbedding = "";
    let resEmbedding = "";

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
          qurEmbedding = finalEmbedding;
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
- use this tool to search the exact file name , user might be referring to when he asks
  to move file to any particular folder.
-But most imp thing whatever file you think is close to what user is referring to you to first confirm it 
by returning the name of the you think , once user confirms it then directly move to the destination folder user once said.
        `,

        schema: z.object({
          userQuery: z.string(),
        }),
      },
    );

    const tools = [
      fetchUserQueryResponse,
      createFolderTool,
      movingFilesTool,
      accessControlTool,
    ];

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

    const re = await embeddings.embedQuery(finalAnswer);
    resEmbedding = `[${re.join(",")}]`;

    await db.query(
      `
      INSERT INTO semantic_search_logs (user_id, query, query_embedding, response, response_embedding, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      
      `,
      [userId, q, qurEmbedding, finalAnswer, resEmbedding],
    );

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
