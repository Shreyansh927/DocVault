import { z } from "zod";
import { accessControlTool } from "../../ai/tools/permissiontool.js";

/**
 * Registers DocVault folder-related MCP tools.
 */
export function registerPermissonTools(server, getUserId) {
  // --------------------------------------------------
  // Persmission mcp
  // --------------------------------------------------

  server.registerTool(
    "permission-access-control",
    {
      title: "Permission control",
      description: "permission access control on command.",

      inputSchema: z.object({
        permissions: z
          .array(
            z.object({
              friendName: z.string().min(1),
              accessType: z.enum(["allow", "revoke"]),
            }),
          )
          .min(1)
          .describe("Friends and their folder access permissions."),
      }),
    },

    async ({ permissions }) => {
      console.log("=================================");
      console.log("[MCP] permission-access-control INVOKED");
      console.log("[MCP] permissions:", permissions);

      console.log("=================================");

      try {
        const userId = getUserId();

        console.log("[MCP] userId:", userId);

        const result = await accessControlTool.invoke({
          permissions,
          userId,
        });

        console.log("[MCP] permission-access-control RESULT:", result);

        return {
          content: [
            {
              type: "text",
              text: String(result),
            },
          ],
        };
      } catch (error) {
        console.error("[MCP] permission-access-control ERROR:", error);

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
}
