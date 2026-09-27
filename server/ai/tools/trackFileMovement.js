import { tool } from "langchain/tools";
import { z } from "zod";
import { db } from "../../db.js";
import ModelManager from "../models/modelmanager.js";

export const prepareFileMovementTool = tool(
  async ({ userId, moves, query }) => {
    try {
      const fileFinalDestination = [];

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
          return {
            success: false,
            message: `Destination folder not found for ${destinationFolder}.`,
          };
        }

        const similarfileName =
          await ModelManager.embeddings().embedQuery(fileName);

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
        if (!fileResult.rows.length) {
          return {
            success: false,
            message: `File not found for ${fileName}.`,
          };
        }
        const closestFile = fileResult.rows[0];
        fileFinalDestination.push({
          fileId: closestFile.id,
          fileName: closestFile.filename,
          destinationFolder,
        });
      }
      return {
        success: true,
        message: "File movement prepared successfully.",
        data: fileFinalDestination,
      };
    } catch (err) {
      console.error(err);
      return {
        success: false,
        message: "An error occurred while preparing file movement.",
      };
    }
  },
  {
    name: "prepareFileMovementTool",
    description:
      "Prepares the file movement by validating the moves and checking for required traces.",
    schema: z.object({
      userId: z.number(),
      moves: z.array(z.any()),
      query: z.string(),
    }),
  },
);
