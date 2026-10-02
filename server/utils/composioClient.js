import { Composio } from "@composio/core";

const apiKey = process.env.COMPOSIO_API_KEY;

if (!apiKey) {
  throw new Error("COMPOSIO_API_KEY is missing");
}

export const composio = new Composio({ apiKey });
