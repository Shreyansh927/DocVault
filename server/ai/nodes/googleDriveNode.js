import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { composio } from "../../utils/composioClient.js";
import { db } from "../../db.js";

const TOOL = "GOOGLEDRIVE_FIND_FILE";
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) throw new Error("GEMINI_API_KEY is missing.");

const genAI = new GoogleGenerativeAI(API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

const parse = (v) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

function findPage(value, seen = new Set()) {
  const v = parse(value);
  if (!v || typeof v !== "object" || seen.has(v)) return null;
  seen.add(v);

  if (Array.isArray(v.files)) return v;

  for (const child of Array.isArray(v) ? v : Object.values(v)) {
    const result = findPage(child, seen);
    if (result) return result;
  }
  return null;
}

async function embedText(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error("Embedding dimensions do not match.");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  if (!normA || !normB) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function rankFilesSemantic(files, query) {
  const queryEmbedding = await embedText(query);
  const ranked = [];
  const concurrency = 5;

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const results = await Promise.all(
      batch.map(async (file) => {
        const embedding = await embedText(file.name);

        return {
          ...file,
          score: cosineSimilarity(queryEmbedding, embedding),
        };
      }),
    );

    ranked.push(...results);
  }

  return ranked
    .filter((file) => file.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...file }) => file);
}

export async function googleDriveNode(state, config) {
  const userId = String(config.configurable?.userId ?? "");

  if (!userId) {
    throw new Error("Missing authenticated user ID.");
  }

  const { rows } = await db.query(
    `SELECT connected_account_id
     FROM user_integrations
     WHERE user_id = $1
       AND provider = $2
       AND UPPER(status) = $3
     LIMIT 1`,
    [userId, "google_drive", "ACTIVE"],
  );

  const accountId = rows[0]?.connected_account_id;

  if (!accountId) {
    throw new Error("Connect your Google Drive account first.");
  }

  const account = await composio.connectedAccounts.get(accountId);

  if (String(account.status).toUpperCase() !== "ACTIVE") {
    throw new Error("Your Google Drive connection is not active.");
  }

  const session = await composio.create(userId, {
    mcp: true,
    toolkits: ["googledrive"],
    connectedAccounts: { googledrive: [accountId] },
  });

  if (!session.mcp?.url) {
    throw new Error("Composio MCP URL is missing.");
  }

  const client = new MultiServerMCPClient({
    composio: {
      transport: "http",
      url: session.mcp.url,
      headers: {
        ...(session.mcp.headers ?? {}),
        "x-api-key": process.env.COMPOSIO_API_KEY,
      },
    },
  });

  try {
    const tools = await client.getTools();

    const discovery = tools.find((t) => t.name === "COMPOSIO_SEARCH_TOOLS");
    const execute = tools.find((t) => t.name === "COMPOSIO_MULTI_EXECUTE_TOOL");

    if (!discovery || !execute) {
      throw new Error("Required Composio MCP tools are unavailable.");
    }

    const result = parse(
      await discovery.invoke({
        queries: [
          {
            use_case:
              "List Google Drive files with q, fields, pageSize and pageToken.",
          },
        ],
        session: { generate_id: true },
      }),
    );

    const payload = result?.data ?? result;
    const sessionId = payload?.session?.id;
    const candidates = (payload?.results ?? []).flatMap(
      (item) => item.primary_tool_slugs ?? [],
    );

    if (!sessionId || !candidates.includes(TOOL)) {
      throw new Error(`${TOOL} was not discovered for this session.`);
    }

    async function fetchAll(q) {
      const files = [];
      const seenTokens = new Set();
      let pageToken;

      do {
        const raw = await execute.invoke({
          tools: [
            {
              tool_slug: TOOL,
              arguments: {
                q,
                fields: "nextPageToken,files(id,name,webViewLink,trashed)",
                pageSize: 1000,
                ...(pageToken ? { pageToken } : {}),
              },
            },
          ],
          session_id: sessionId,
          sync_response_to_workbench: false,
          current_step: "Google Drive file search",
          current_step_metric: String(files.length),
        });

        const page = findPage(raw);

        if (!page || page.success === false || page.error) {
          throw new Error(
            `Google Drive search failed: ${JSON.stringify(page?.error ?? raw)}`,
          );
        }

        for (const file of page.files) {
          if (!file?.id || file.trashed === true) continue;

          files.push({
            id: file.id,
            name: file.name ?? "(unnamed)",
            webViewLink:
              file.webViewLink ??
              `https://drive.google.com/file/d/${file.id}/view`,
          });
        }

        pageToken = page.nextPageToken || undefined;

        if (pageToken && seenTokens.has(pageToken)) {
          throw new Error("Repeated Google Drive pagination token.");
        }

        if (pageToken) seenTokens.add(pageToken);

        if (seenTokens.size > 10000) {
          throw new Error("Google Drive pagination safety limit exceeded.");
        }
      } while (pageToken);

      return [...new Map(files.map((f) => [f.id, f])).values()];
    }

    const intent = state.intent ?? {};
    const action = String(intent.action ?? "").toLowerCase();
    const query = String(intent.parameters?.query ?? "").trim();

    let files;

    if (action === "list") {
      files = await fetchAll("trashed = false");
    } else if (action === "search") {
      if (!query) {
        throw new Error("A search query is required.");
      }

      const candidates = await fetchAll("trashed = false");
      files = await rankFilesSemantic(candidates, query);
    } else {
      throw new Error(`Unsupported Drive action: ${action}`);
    }

    return {
      toolResult: {
        files,
        count: files.length,
      },
    };
  } finally {
    await client.close();
  }
}
