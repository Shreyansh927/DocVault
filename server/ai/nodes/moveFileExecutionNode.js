import { db } from "../../db.js";

export async function moveFileExecutionNode(state) {
  console.log("=================================");
  console.log("===== MOVE FILE EXECUTION =====");
  console.log("=================================");

  const finalProposedMoves = state.proposedMoves;
  const userId = state.userId;

  console.log("User ID:", userId);
  console.log("Moves:", finalProposedMoves);

  if (!finalProposedMoves?.length) {
    throw new Error("No proposed moves found");
  }

  const result = [];

  for (const move of finalProposedMoves) {
    const { fileId, fileName, destinationFolderId, destinationFolderName } =
      move;

    console.log(
      `Moving ${fileName} (${fileId}) → ${destinationFolderName} (${destinationFolderId})`,
    );

    // Verify destination belongs to this user
    const folderResult = await db.query(
      `
      SELECT id
      FROM folders
      WHERE id = $1
        AND user_id = $2
      `,
      [destinationFolderId, userId],
    );

    if (!folderResult.rows.length) {
      throw new Error(`Destination folder not found: ${destinationFolderName}`);
    }

    // Verify file belongs to this user
    const fileResult = await db.query(
      `
      SELECT f.id, f.filename
      FROM files f
      JOIN folders fo ON fo.id = f.folder_id
      WHERE f.id = $1
        AND fo.user_id = $2
      `,
      [fileId, userId],
    );

    if (!fileResult.rows.length) {
      throw new Error(`File not found or does not belong to user: ${fileName}`);
    }

    // ACTUAL MOVE
    await db.query(
      `
      UPDATE files
      SET folder_id = $1
      WHERE id = $2
      `,
      [destinationFolderId, fileId],
    );

    console.log(`SUCCESS: ${fileName} moved to ${destinationFolderName}`);

    result.push({
      fileId,
      fileName,
      destinationFolderId,
      destinationFolderName,
      success: true,
    });
  }

  return {
    toolResult: result,
  };
}
