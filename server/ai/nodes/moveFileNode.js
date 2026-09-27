import { de } from "zod/v4/locales";
import { db } from "../../db.js";
import { getCurrentQuery } from "../../utils/getCurrentQuery.js";
import ModelManager from "../models/modelmanager.js";
import { rewriteQuery } from "../planner/rewriteQuery.js";
// import { movingFileTool } from "../tools/moveFileTool.js";

export async function moveFileNode(state) {
  const { moves } = state.intent.parameters;
  const query = getCurrentQuery(state);
  const rewrittenQuery = await rewriteQuery(state.messages);
  const userId = state.userId;
  console.log("original query" + query);
  console.log("new query:" + rewrittenQuery);

  const result = [];

  for (const move of moves) {
    const { fileName, destinationFolder } = move;
    const user = await db.query(`SELECT id FROM users WHERE id = $1`, [userId]);

    if (!user.rows.length) {
      return {
        success: false,
        message: "User not found.",
      };
    }
    const exactFolder = await db.query(
      `
        SELECT *
        FROM folders
        WHERE user_id = $1
        AND folder_name ILIKE $2
        LIMIT 1
      `,
      [userId, destinationFolder],
    );
    if (!exactFolder.rows.length) {
      return {
        success: false,
        message: `Destination folder not found for ${destinationFolder}.`,
      };
    }

    const similarfileName =
      await ModelManager.embeddings().embedQuery(fileName);

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
    if (!fileResult.rows.length) {
      return {
        success: false,
        message: `File not found for ${fileName}.`,
      };
    }
    const file = fileResult.rows[0];

    result.push({
      fileId: file.id,
      fileName: file.filename,
      destinationFolderId: exactFolder.rows[0].id,
      destinationFolderName: exactFolder.rows[0].folder_name,
    });
  }

  console.log("Final moves to be processed:", result);

  return {
    proposedMoves: result,
  };
}
