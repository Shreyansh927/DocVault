import "dotenv/config";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

let client;
let transport;
let connectionPromise;

export async function getComposioMcpClient() {
  if (client && connectionPromise) {
    await connectionPromise;
    return client;
  }

  if (!process.env.COMPOSIO_MCP_URL) {
    throw new Error("COMPOSIO_MCP_URL is missing");
  }

  if (!process.env.COMPOSIO_MCP_CONSUMER_API_KEY) {
    throw new Error("COMPOSIO_MCP_CONSUMER_API_KEY is missing");
  }

  client = new Client({
    name: "docvault",
    version: "1.0.0",
  });

  transport = new StreamableHTTPClientTransport(
    new URL(process.env.COMPOSIO_MCP_URL),
    {
      requestInit: {
        headers: {
          "x-consumer-api-key": process.env.COMPOSIO_MCP_CONSUMER_API_KEY,
        },
      },
    },
  );

  connectionPromise = client.connect(transport);

  try {
    await connectionPromise;
    return client;
  } catch (error) {
    client = undefined;
    transport = undefined;
    connectionPromise = undefined;
    throw error;
  }
}
