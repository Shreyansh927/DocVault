import z from "zod";
import { db } from "../../db.js";
import { tool } from "langchain/tools";

export const accessControlTool = tool(
  async ({ userId, permissions }) => {
    try {
      console.log("Access control tool called");

      const results = [];
      console.log(permissions);

      for (const permission of permissions) {
        const { friendName, accessType } = permission;

        // Find friend (flexible match)
        const friend = await db.query(
          `
          SELECT id, name
          FROM users
          WHERE LOWER(name) LIKE LOWER('%' || $1 || '%')
          LIMIT 2
          `,
          [friendName],
        );

        if (friend.rows.length === 0) {
          results.push({
            friend: friendName,
            status: "Friend not found",
          });
          continue;
        }

        if (friend.rows.length > 1) {
          results.push({
            friend: friendName,
            status: "Multiple matches found",
          });
          continue;
        }

        const friendId = friend.rows[0].id;
        const actualName = friend.rows[0].name;

        // Verify connection
        const connection = await db.query(
          `
          SELECT 1
          FROM connections
          WHERE
              (sender_id = $1 AND receiver_id = $2)
              OR
              (sender_id = $2 AND receiver_id = $1)
          LIMIT 1
          `,
          [userId, friendId],
        );

        if (!connection.rows.length) {
          results.push({
            friend: actualName,
            status: "Not connected",
          });
          continue;
        }

        await db.query(
          `
          UPDATE friends
          SET show_folders = $1
          WHERE
              user_id = $2
              AND friend_id = $3
          `,
          [accessType === "allow", userId, friendId],
        );

        results.push({
          friend: actualName,
          status: accessType === "allow" ? "Access Allowed" : "Access Revoked",
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
        message: "Failed to update folder permissions.",
      };
    }
  },

  {
    name: "toggle_folder_access",

    description: `
Allow or revoke access to the authenticated user's folders.

Supports one or multiple friends.

Examples:

Allow Rahul and Aman

Revoke Rahul

Allow John_12

If multiple close matches exist, return them for clarification instead of guessing.
`,

    schema: z.object({
      userId: z.number(),

      permissions: z.array(
        z.object({
          friendName: z.string(),
          accessType: z.enum(["allow", "revoke"]),
        }),
      ),
    }),
  },
);
