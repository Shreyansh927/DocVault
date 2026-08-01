import { tool } from "langchain/tools";
import { z } from "zod";
import { db } from "../../db.js";

export const createFolderTool = tool(
  async ({ folderNames, userId, category }) => {
    try {
      for (const folderName of folderNames) {
        const exists = await db.query(
          `SELECT 1 FROM folders WHERE folder_name=$1 AND user_id=$2`,
          [folderName.trim(), userId],
        );

        if (!exists.rows.length) {
          await db.query(
            `INSERT INTO folders(folder_name, user_id, category)
             VALUES($1, $2, $3)`,
            [folderName.trim(), userId, category],
          );
        }
      }

      return "Folders created successfully.";
    } catch (err) {
      console.error(err);
      return "Failed to create folders.";
    }
  },
  {
    name: "create_folder",

    description: "Creates one or more folders for the authenticated user.",

    schema: z.object({
      folderNames: z.array(z.string()),
      userId: z.number(),
      category: z.enum(["Public", "Private"]).nullable().optional(),
    }),
  },
);

export const deleteFoldersTool = tool(
  async ({ folderNames, userId }) => {
    try {
      for (const folderName of folderNames) {
        const exists = await db.query(
          `SELECT 1 FROM folders WHERE folder_name=$1 AND user_id=$2`,
          [folderName.trim(), userId],
        );

        if (exists.rows.length) {
          await db.query(
            `UPDATE folders SET is_deleted = true WHERE user_id=$1 AND folder_name=$2`,
            [userId, folderName.trim()],
          );
        }
      }

      return "Folders deleted successfully.";
    } catch (err) {
      console.error(err);
      return "Failed to create folders.";
    }
  },
  {
    name: "create_folder",

    description: "Creates one or more folders for the authenticated user.",

    schema: z.object({
      folderNames: z.array(z.string()),
      userId: z.number(),
    }),
  },
);

export const restoreFoldersTool = tool(
  async ({ folderNames, userId }) => {
    try {
      for (const folderName of folderNames) {
        const exists = await db.query(
          `SELECT 1 FROM folders WHERE folder_name=$1 AND user_id=$2 AND is_deleted=true`,
          [folderName.trim(), userId],
        );

        if (exists.rows.length) {
          await db.query(
            `UPDATE folders SET is_deleted = false WHERE user_id=$1 AND folder_name=$2`,
            [userId, folderName.trim()],
          );
        }
      }

      return "Folders restored successfully.";
    } catch (err) {
      console.error(err);
      return "Failed to restore folders.";
    }
  },
  {
    name: "restore_folder",

    description: "Restores one or more folders for the authenticated user.",

    schema: z.object({
      folderNames: z.array(z.string()),
      userId: z.number(),
    }),
  },
);

export const toggleVisibiltyTool = tool(
  async ({ userId, folderNames, category }) => {
    try {
      const user = await db.query(`SELECT * FROM users WHERE id=$1`, [userId]);
      if (!user.rows.length) {
        return "unauthenticated user!!";
      }
      for (const folderName of folderNames) {
        const folderExist = await db.query(
          `SELECT 1 FROM folders WHERE LOWER(folder_name) = LOWER($1) AND user_id=$2`,
          [folderName, userId],
        );
        if (!folderExist.rows.length) {
          return "folder does'nt exist!!";
        }
        await db.query(
          `UPDATE folders SET category=$1 WHERE folder_name=$2 AND user_id=$3`,
          [category, folderName, userId],
        );
      }
      return "all folders visibilty updated successfully!!";
    } catch (err) {
      console.log(err);
    }
  },
  {
    name: "toggle_visibilty_of_folders",
    description: "you have toggle the visiblity of folder as per user request",
    schema: z.object({
      userId: z.number(),
      folderNames: z.array(z.string()),
      category: z.enum(["Public", "Private"]),
    }),
  },
);
