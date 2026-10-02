import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { composio } from "../../utils/composioClient.js";
import { db } from "../../db.js";

const TOOL = "GOOGLEDRIVE_FIND_FILE";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is missing.");
}

/* =========================================================
   Gemini Embeddings
========================================================= */

const genAI = new GoogleGenerativeAI(API_KEY);

const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

/* =========================================================
   Utilities
========================================================= */

function parse(value) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Recursively find a Google Drive file-list response.
 *
 * Expected shape somewhere inside the Composio response:
 *
 * {
 *   files: [...],
 *   nextPageToken: "..."
 * }
 */
function findPage(value, seen = new Set()) {
  const parsed = parse(value);

  if (!parsed || typeof parsed !== "object" || seen.has(parsed)) {
    return null;
  }

  seen.add(parsed);

  if (Array.isArray(parsed.files)) {
    return parsed;
  }

  const children = Array.isArray(parsed) ? parsed : Object.values(parsed);

  for (const child of children) {
    const result = findPage(child, seen);

    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Escape a string before putting it inside a
 * Google Drive q expression.
 *
 * Example:
 *
 * O'Reilly
 *
 * becomes:
 *
 * O\'Reilly
 */
function escapeDriveQuery(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

/**
 * Normalize a file returned by Google Drive.
 */
function normalizeFile(file) {
  if (!file?.id) {
    return null;
  }

  if (file.trashed === true) {
    return null;
  }

  return {
    id: file.id,
    name: file.name ?? "(unnamed)",
    mimeType: file.mimeType ?? null,
    webViewLink:
      file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
  };
}

/* =========================================================
   Embeddings
========================================================= */

async function embedText(text) {
  const result = await embeddingModel.embedContent(String(text ?? ""));

  return result.embedding.values;
}

/* =========================================================
   Cosine Similarity
========================================================= */

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return 0;
  }

  if (a.length !== b.length) {
    throw new Error(
      `Embedding dimensions do not match: ${a.length} vs ${b.length}`,
    );
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  if (!normA || !normB) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* =========================================================
   Semantic Ranking
========================================================= */

/**
 * Rank only the candidates returned by Google Drive.
 *
 * This is intentionally NOT used against the entire Drive.
 */
async function rankFilesSemantic(files, query) {
  if (!files.length) {
    return [];
  }

  const queryEmbedding = await embedText(query);

  const ranked = [];

  const concurrency = 5;

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const results = await Promise.all(
      batch.map(async (file) => {
        try {
          const embedding = await embedText(file.name);

          return {
            ...file,
            score: cosineSimilarity(queryEmbedding, embedding),
          };
        } catch (error) {
          console.error(
            `[Google Drive] Embedding failed for "${file.name}":`,
            error.message,
          );

          return {
            ...file,
            score: 0,
          };
        }
      }),
    );

    ranked.push(...results);
  }

  return ranked
    .filter((file) => file.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...file }) => file);
}

/* =========================================================
   Google Drive Node
========================================================= */

export async function googleDriveNode(state, config) {
  /* -------------------------------------------------------
     1. Authenticated User
  ------------------------------------------------------- */

  const rawUserId = config?.configurable?.userId;

  if (
    rawUserId === undefined ||
    rawUserId === null ||
    String(rawUserId).trim() === ""
  ) {
    throw new Error("Missing authenticated user ID.");
  }

  const userId = String(rawUserId);

  console.log(`[Google Drive] Authenticated user: ${userId}`);

  /* -------------------------------------------------------
     2. Get Connected Google Drive Account
  ------------------------------------------------------- */

  const { rows } = await db.query(
    `
      SELECT connected_account_id
      FROM user_integrations
      WHERE user_id = $1
        AND provider = $2
        AND UPPER(status) = $3
      LIMIT 1
    `,
    [userId, "google_drive", "ACTIVE"],
  );

  const accountId = rows[0]?.connected_account_id;

  if (!accountId) {
    throw new Error("Connect your Google Drive account first.");
  }

  console.log(`[Google Drive] Connected account: ${accountId}`);

  /* -------------------------------------------------------
     3. Verify Connected Account
  ------------------------------------------------------- */

  const account = await composio.connectedAccounts.get(accountId);

  if (String(account.status).toUpperCase() !== "ACTIVE") {
    throw new Error("Your Google Drive connection is not active.");
  }

  /* -------------------------------------------------------
     4. Create Composio MCP Session
  ------------------------------------------------------- */

  const session = await composio.create(userId, {
    mcp: true,
    toolkits: ["googledrive"],
    connectedAccounts: {
      googledrive: [accountId],
    },
  });

  if (!session?.mcp?.url) {
    throw new Error("Composio MCP URL is missing.");
  }

  /* -------------------------------------------------------
     5. Create MCP Client
  ------------------------------------------------------- */

  const client = new MultiServerMCPClient({
    composio: {
      transport: "http",

      url: session.mcp.url,

      headers: {
        ...(session.mcp.headers ?? {}),

        ...(process.env.COMPOSIO_API_KEY
          ? {
              "x-api-key": process.env.COMPOSIO_API_KEY,
            }
          : {}),
      },
    },
  });

  try {
    /* -----------------------------------------------------
       6. Discover Composio Tools
    ----------------------------------------------------- */

    const tools = await client.getTools();

    const discovery = tools.find(
      (tool) => tool.name === "COMPOSIO_SEARCH_TOOLS",
    );

    const execute = tools.find(
      (tool) => tool.name === "COMPOSIO_MULTI_EXECUTE_TOOL",
    );

    if (!discovery || !execute) {
      throw new Error("Required Composio MCP tools are unavailable.");
    }

    /* -----------------------------------------------------
       7. Discover Google Drive Tool
    ----------------------------------------------------- */

    const discoveryResult = parse(
      await discovery.invoke({
        queries: [
          {
            use_case:
              "Search Google Drive files using q, fields, pageSize and pageToken.",
          },
        ],

        session: {
          generate_id: true,
        },
      }),
    );

    const discoveryPayload = discoveryResult?.data ?? discoveryResult;

    const sessionId = discoveryPayload?.session?.id;

    const discoveredCandidates = (discoveryPayload?.results ?? []).flatMap(
      (item) => item.primary_tool_slugs ?? [],
    );

    if (!sessionId || !discoveredCandidates.includes(TOOL)) {
      throw new Error(`${TOOL} was not discovered for this session.`);
    }

    console.log(`[Google Drive] Tool discovered: ${TOOL}`);

    console.log(`[Google Drive] Composio session: ${sessionId}`);

    /* =====================================================
       8. Execute One Drive Page
    ===================================================== */

    async function fetchPage(driveQuery, pageToken = undefined, pageSize = 20) {
      const argumentsObject = {
        q: driveQuery,

        fields: "nextPageToken,files(id,name,mimeType,webViewLink,trashed)",

        pageSize: Math.min(Math.max(Number(pageSize) || 20, 1), 50),
      };

      /*
       * VERY IMPORTANT:
       *
       * Do NOT send pageToken on the first request.
       *
       * Only add it when Google Drive actually returned
       * nextPageToken from the previous request.
       */
      if (pageToken) {
        argumentsObject.pageToken = pageToken;
      }

      console.log("===== GOOGLE DRIVE REQUEST =====");

      console.dir(argumentsObject, { depth: null });

      const raw = await execute.invoke({
        tools: [
          {
            tool_slug: TOOL,

            arguments: argumentsObject,
          },
        ],

        /*
         * IMPORTANT:
         * Continue using the SAME Composio session.
         */
        session_id: sessionId,

        sync_response_to_workbench: false,

        current_step: "Google Drive file search",

        current_step_metric: "search",
      });

      console.log("===== GOOGLE DRIVE RAW RESPONSE =====");

      console.dir(parse(raw), { depth: null });

      const page = findPage(raw);

      if (!page) {
        throw new Error(
          `Google Drive returned an unexpected response: ${JSON.stringify(
            raw,
          )}`,
        );
      }

      if (page.success === false || page.error) {
        throw new Error(
          `Google Drive search failed: ${JSON.stringify(page.error ?? page)}`,
        );
      }

      const normalizedFiles = (page.files ?? [])
        .map(normalizeFile)
        .filter(Boolean);

      return {
        files: normalizedFiles,

        nextPageToken: page.nextPageToken || undefined,
      };
    }

    /* =====================================================
       9. Paginated Drive Search
    ===================================================== */

    async function fetchAll(driveQuery, { maxPages = 10, pageSize = 20 } = {}) {
      const files = [];

      const seenFileIds = new Set();
      const seenTokens = new Set();

      let pageToken;

      let pageNumber = 0;

      while (pageNumber < maxPages) {
        pageNumber++;

        const page = await fetchPage(driveQuery, pageToken, pageSize);

        console.log(
          `[Google Drive] Page ${pageNumber}: ${page.files.length} files`,
        );

        for (const file of page.files) {
          if (!seenFileIds.has(file.id)) {
            seenFileIds.add(file.id);
            files.push(file);
          }
        }

        /*
         * No nextPageToken means we're finished.
         */
        if (!page.nextPageToken) {
          break;
        }

        /*
         * Protect against a broken API/tool repeatedly
         * returning the same token.
         */
        if (seenTokens.has(page.nextPageToken)) {
          throw new Error("Google Drive returned a repeated pagination token.");
        }

        seenTokens.add(page.nextPageToken);

        /*
         * IMPORTANT:
         *
         * The ONLY token we ever send to the next request
         * is the exact token returned here.
         */
        pageToken = page.nextPageToken;
      }

      if (pageNumber >= maxPages && pageToken) {
        console.warn(
          `[Google Drive] Pagination stopped at safety limit (${maxPages} pages).`,
        );
      }

      return files;
    }

    /* =====================================================
       10. Read Intent
    ===================================================== */

    const intent = state?.intent ?? {};

    const action = String(intent.action ?? "").toLowerCase();

    const query = String(intent.parameters?.query ?? "").trim();

    console.log("===== GOOGLE DRIVE INTENT =====");

    console.dir(
      {
        action,
        query,
      },
      { depth: null },
    );

    /* =====================================================
       11. SEARCH
    ===================================================== */

    if (action === "search") {
      if (!query) {
        throw new Error("A search query is required.");
      }

      /*
       * ---------------------------------------------------
       * Extract useful search terms.
       *
       * Example:
       *
       * "blenditai resume"
       *
       * becomes:
       *
       * ["blenditai", "resume"]
       * ---------------------------------------------------
       */

      const searchTerms = query
        .split(/\s+/)
        .map((word) => word.replace(/[^\p{L}\p{N}._-]/gu, "").trim())
        .filter((word) => word.length >= 2);

      /*
       * If no usable terms exist, fall back to
       * semantic-ish listing of a small set.
       */
      if (!searchTerms.length) {
        const candidates = await fetchAll("trashed = false", {
          maxPages: 2,
          pageSize: 20,
        });

        const files = await rankFilesSemantic(candidates, query);

        return {
          toolResult: {
            files,
            count: files.length,
          },
        };
      }

      /* ---------------------------------------------------
         First try Drive-native name search.
      --------------------------------------------------- */

      const nameConditions = searchTerms.map(
        (term) => `name contains '${escapeDriveQuery(term)}'`,
      );

      /*
       * OR gives us broader candidate discovery.
       *
       * Example:
       *
       * name contains 'blenditai'
       * OR
       * name contains 'resume'
       */
      const driveQuery = `trashed = false and (${nameConditions.join(" or ")})`;

      console.log("===== DRIVE NATIVE SEARCH =====");

      console.log("Query:", driveQuery);

      /*
       * Fetch at most 2 pages for normal search.
       *
       * This prevents an ordinary search from
       * crawling someone's entire Drive.
       */
      let candidates = await fetchAll(driveQuery, {
        maxPages: 2,
        pageSize: 20,
      });

      /*
       * ---------------------------------------------------
       * If Drive-native search returned nothing,
       * perform a very limited fallback.
       *
       * IMPORTANT:
       * We still don't crawl the entire Drive.
       * ---------------------------------------------------
       */

      if (!candidates.length) {
        console.log("[Google Drive] Native name search returned no results.");

        /*
         * Get a small initial sample.
         *
         * This fallback is intentionally limited.
         */
        candidates = await fetchAll("trashed = false", {
          maxPages: 2,
          pageSize: 20,
        });
      }

      console.log(`[Google Drive] Candidates found: ${candidates.length}`);

      /* ---------------------------------------------------
         Semantic ranking
      --------------------------------------------------- */

      const files = await rankFilesSemantic(candidates, query);

      console.log(`[Google Drive] Semantic matches: ${files.length}`);

      return {
        toolResult: {
          files,
          count: files.length,
          query,
        },
      };
    }

    /* =====================================================
       12. LIST
    ===================================================== */

    if (action === "list") {
      /*
       * Listing is the one case where pagination actually
       * makes sense.
       *
       * Still impose a safety limit.
       */
      const files = await fetchAll("trashed = false", {
        maxPages: 10,
        pageSize: 50,
      });

      return {
        toolResult: {
          files,
          count: files.length,
        },
      };
    }

    /* =====================================================
       13. Unsupported Action
    ===================================================== */

    throw new Error(`Unsupported Drive action: ${action}`);
  } finally {
    /* -----------------------------------------------------
       Always close MCP client
    ----------------------------------------------------- */

    try {
      await client.close();
    } catch (error) {
      console.error(
        "[Google Drive] Failed to close MCP client:",
        error.message,
      );
    }
  }
}
