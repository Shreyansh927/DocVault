import "dotenv/config";

import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

/**
 * Create a Tavily MCP client
 */
const createClient = async () => {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not loaded");
  }

  if (!apiKey.startsWith("tvly-")) {
    throw new Error("TAVILY_API_KEY does not start with tvly-");
  }

  const client = new Client({
    name: "docvault",
    version: "1.0.0",
  });

  const transport = new StreamableHTTPClientTransport(
    new URL(`https://mcp.tavily.com/mcp/?tavilyApiKey=${apiKey}`),
  );

  await client.connect(transport);

  console.log("Connected to Tavily MCP");

  return client;
};

// List available MCP tools
const listTools = async (client) => {
  return await client.listTools();
};

// Search the web using Tavily MCP
const searchWeb = async (client, query) => {
  const result = await client.callTool({
    name: "tavily_search",
    arguments: {
      query,
      max_results: 5,
      search_depth: "advanced",
      topic: "general",
      include_favicon: true,
    },
  });

  console.log("===== RAW MCP RESULT =====");
  console.dir(result, { depth: null });

  return result.structuredContent;
};

/**
 * Create and connect the client once
 */
const tavilyClient = await createClient();

export { tavilyClient, listTools, searchWeb };
