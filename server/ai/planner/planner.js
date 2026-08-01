import { z } from "zod";

import ModelManager from "../models/modelmanager.js";
import { plannerPrompt } from "./prompt.js";

const plannerSchema = z.object({
  route: z.enum(["folders", "documents", "permissions", "chat", "moveFile"]),

  action: z.string(),

  parameters: z.object({
    folderNames: z.array(z.string()).optional(),

    category: z.enum(["Public", "Private"]).nullable().optional(),

    // movingFileName: z.string().optional(),

    // destinationFolderName: z.string().optional(),

    permissions: z
      .array(
        z.object({
          friendName: z.string(),
          accessType: z.enum(["allow", "revoke"]),
        }),
      )
      .optional(),

    query: z.string().optional(),

    moves: z
      .array(
        z.object({
          fileName: z.string(),
          destinationFolder: z.string(),
        }),
      )
      .optional(),
    path: z.string().optional(),
  }),
});

export async function planner(messages) {
  const plannerModel = ModelManager.cohere();

  const response = await plannerModel.invoke([
    {
      role: "system",
      content: plannerPrompt,
    },
    ...messages,
  ]);

  console.log("Full response:");
  console.dir(response, { depth: null });

  console.log("Type of content:", typeof response.content);
  console.log("Raw content:", response.content);
  console.log("Escaped content:", JSON.stringify(response.content));

  const content = response.content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  console.log("Cleaned content:", JSON.stringify(content));

  return plannerSchema.parse(JSON.parse(content));
}
