import { tool } from "langchain/tools";
import { z } from "zod";
import { db } from "../../db.js";
import ModelManager from "../models/modelmanager.js";

export const movingFileTool = tool(
  async ({ userId, moves, query }) => {
    console.log("move tool called!!");
    console.log(moves);
    try {
      const results = [];

      // Verify user
      const user = await db.query(`SELECT id FROM users WHERE id = $1`, [
        userId,
      ]);

      if (!user.rows.length) {
        return {
          success: false,
          message: "User not found.",
        };
      }
      
      for (const move of moves) {
        const { fileName, destinationFolder } = move;
        console.log(fileName, destinationFolder);

        // Find destination folder
        const folderResult = await db.query(
          `
          SELECT id
          FROM folders
          WHERE user_id = $1
          AND folder_name ILIKE $2
          LIMIT 1
          `,
          [userId, destinationFolder],
        );

        if (!folderResult.rows.length) {
          results.push({
            file: fileName,
            destination: destinationFolder,
            status: "Destination folder not found",
          });

          continue;
        }

        const destinationFolderId = folderResult.rows[0].id;

        const similarfileName =
          await ModelManager.embeddings().embedQuery(query);

        // Find file
        const fileResult = await db.query(
          `
          SELECT
    f.id,
    f.filename,
    f.folder_id,
    (f.new_embedding <=> $2) AS distance
FROM files f
JOIN folders fo
ON fo.id = f.folder_id
WHERE fo.user_id = $1
ORDER BY distance
LIMIT 5;
          `,
          [userId, `[${similarfileName.join(",")}]`],
        );
        console.log(fileResult.rows);

        // if (!fileResult.rows.length) {
        //   results.push({
        //     file: fileName,
        //     destination: destinationFolder,
        //     status: "File not found",
        //   });

        //   continue;
        // }

        const file = fileResult.rows[0];

        if (file.folder_id === destinationFolderId) {
          results.push({
            file: file.filename,
            destination: destinationFolder,
            status: "Already in destination folder",
          });

          continue;
        }

        await db.query(
          `
          UPDATE files
          SET folder_id = $1
          WHERE id = $2
          `,
          [destinationFolderId, file.id],
        );

        results.push({
          file: file.filename,
          destination: destinationFolder,
          status: "Moved",
        });
      }

      console.log(results);

      return {
        success: true,
        results,
      };
    } catch (err) {
      console.error(err);

      return {
        success: false,
        message: "Failed to move files.",
      };
    }
  },
  {
    name: "move_file",
    description:
      "Move one or more files into destination folders for the authenticated user.",

    schema: z.object({
      userId: z.number(),
      query: z.string(),
      moves: z.array(
        z.object({
          fileName: z.string(),
          destinationFolder: z.string(),
        }),
      ),
    }),
  },
);
