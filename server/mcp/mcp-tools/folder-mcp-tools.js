import { z } from "zod";
import {
  createFolderTool,
  deleteFoldersTool,
  restoreFoldersTool,
  toggleVisibiltyTool,
} from "../../ai/tools/folderTool.js";

/**
 * Registers DocVault folder-related MCP tools.
 */
export function registerFolderTools(server, getUserId) {
  // --------------------------------------------------
  // CREATE FOLDER
  // --------------------------------------------------

  server.registerTool(
    "create_folder",
    {
      title: "Create Folder",
      description:
        "Create one or more folders in the authenticated user's DocVault account.",

      inputSchema: z.object({
        folderNames: z
          .array(z.string().min(1))
          .min(1)
          .describe("Names of the folders to create."),

        category: z
          .enum(["Public", "Private"])
          .nullable()
          .optional()
          .describe("Visibility category of the folders."),
      }),
    },

    async ({ folderNames, category }) => {
      console.log("=================================");
      console.log("[MCP] create_folder INVOKED");
      console.log("[MCP] folderNames:", folderNames);
      console.log("[MCP] category:", category);
      console.log("=================================");

      try {
        const userId = getUserId();

        console.log("[MCP] userId:", userId);

        const result = await createFolderTool.invoke({
          folderNames,
          userId,
          category,
        });

        console.log("[MCP] create_folder RESULT:", result);

        return {
          content: [
            {
              type: "text",
              text: String(result),
            },
          ],
        };
      } catch (error) {
        console.error("[MCP] create_folder ERROR:", error);

        return {
          content: [
            {
              type: "text",
              text: `Failed to create folders: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // --------------------------------------------------
  // DELETE FOLDER
  // --------------------------------------------------

  server.registerTool(
    "delete_folders",
    {
      title: "Delete Folders",
      description:
        "Soft-delete one or more folders belonging to the authenticated DocVault user.",

      inputSchema: z.object({
        folderNames: z.array(z.string().min(1)).min(1),
      }),
    },

    async ({ folderNames }) => {
      try {
        const userId = getUserId();

        const result = await deleteFoldersTool.invoke({
          folderNames,
          userId,
        });

        return {
          content: [
            {
              type: "text",
              text: String(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to delete folders: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // --------------------------------------------------
  // RESTORE FOLDER
  // --------------------------------------------------

  server.registerTool(
    "restore_folders",
    {
      title: "Restore Folders",
      description:
        "Restore previously soft-deleted folders belonging to the authenticated user.",

      inputSchema: z.object({
        folderNames: z.array(z.string().min(1)).min(1),
      }),
    },

    async ({ folderNames }) => {
      try {
        const userId = getUserId();

        const result = await restoreFoldersTool.invoke({
          folderNames,
          userId,
        });

        return {
          content: [
            {
              type: "text",
              text: String(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to restore folders: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // --------------------------------------------------
  // CHANGE VISIBILITY
  // --------------------------------------------------

  server.registerTool(
    "toggle_folder_visibility",
    {
      title: "Toggle Folder Visibility",
      description:
        "Change a folder between Public and Private visibility for the authenticated user.",

      inputSchema: z.object({
        folderNames: z.array(z.string().min(1)).min(1),

        category: z.enum(["Public", "Private"]),
      }),
    },

    async ({ folderNames, category }) => {
      try {
        const userId = getUserId();

        const result = await toggleVisibiltyTool.invoke({
          userId,
          folderNames,
          category,
        });

        return {
          content: [
            {
              type: "text",
              text: String(result),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to change folder visibility: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
