import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

export async function callMcpTool(name, args, mcpToken) {
  if (!mcpToken) {
    throw new Error("Missing MCP authentication token");
  }

  console.log("=================================");
  console.log("[MCP CLIENT] Calling:", name);
  console.log("[MCP CLIENT] Arguments:", args);
  console.log("=================================");

  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:5000/mcp"),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${mcpToken}`,
        },
      },
    },
  );

  const client = new Client({
    name: "docvault-langgraph-client",
    version: "1.0.0",
  });

  try {
    await client.connect(transport);

    const result = await client.callTool({
      name,
      arguments: args,
    });

    console.log("[MCP CLIENT] Result:", result);

    if (result.isError) {
      const message =
        result.content
          ?.filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n") || `MCP tool ${name} failed`;

      throw new Error(message);
    }

    return result;
  } finally {
    await client.close();
  }
}
