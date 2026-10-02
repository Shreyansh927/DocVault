import { z } from "zod";

import ModelManager from "../models/modelmanager.js";
import { plannerPrompt } from "./prompt.js";

const plannerSchema = z.object({
  route: z.enum([
    "folders",
    "documents",
    "permissions",
    "chat",
    "moveFile",
    "googleDrive",
  ]),

  action: z.string(),

  parameters: z.object({
    folderNames: z.array(z.string()).optional(),

    category: z.enum(["Public", "Private"]).nullable().optional(),

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

    trashed: z.boolean().optional(),

    fields: z.string().optional(),

    pageSize: z.number().int().min(1).max(1000).optional(),
  }),
});

/**
 * Extract the first complete JSON object from the model response.
 * Handles Markdown fences and explanatory text before or after the JSON.
 */
function extractJsonObject(content) {
  if (typeof content !== "string") {
    throw new Error(
      `Expected planner content to be a string; received ${typeof content}.`,
    );
  }

  const text = content.trim();
  const start = text.indexOf("{");

  if (start === -1) {
    throw new Error("Planner response does not contain a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  throw new Error("Planner response contains incomplete JSON.");
}

export async function planner(messages) {
  const plannerModel = ModelManager.cohere();

  const response = await plannerModel.invoke([
    {
      role: "system",
      content: plannerPrompt,
    },
    ...messages,
  ]);

  console.log("[Planner] Full response:");
  console.dir(response, { depth: null });

  const content = response.content;

  console.log("[Planner] Content type:", typeof content);
  console.log("[Planner] Raw content:", content);

  try {
    const jsonText = extractJsonObject(content);

    console.log("[Planner] Extracted JSON:", jsonText);

    const parsed = JSON.parse(jsonText);

    // Validate the parsed object against your existing schema.
    const validated = plannerSchema.parse(parsed);

    console.log("[Planner] Validated route:", validated.route);
    console.log("[Planner] Validated action:", validated.action);

    return validated;
  } catch (error) {
    console.error("[Planner] Failed to parse or validate response:", error);
    throw error;
  }
}
