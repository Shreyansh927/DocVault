import { z } from "zod";
import { db } from "../../db.js";
import { tool } from "langchain/tools";
import ModelManager from "../models/modelmanager.js";
import { performance } from "node:perf_hooks";

import { cohereRerank } from "../../utils/cohereReRankerClient.js";

export const searchDocsInfo = tool(
  async ({ query, userId }) => {
    console.log("search tool called !!!");
    const timings = {};
    const startTime = performance.now();

    // embedding
    const embedStart = performance.now();
    const searchEmbedding = await ModelManager.embeddings().embedQuery(query);
    timings.embeddingEnds = performance.now() - embedStart;

    // pgvector search
    const pgvectorStart = performance.now();
    try {
      const { rows } = await db.query(
        `SELECT f.filename, f.ai_summary, fo.folder_name, f.id , f.folder_id FROM files as f LEFT JOIN folders as fo 
            ON fo.id = f.folder_id WHERE fo.user_id = $1 AND f.deleted_at IS NULL ORDER BY (f.new_embedding <-> $2) LIMIT 6`,
        [userId, `[${searchEmbedding.join(",")}]`],
      );
      timings.pgvectorEnds = performance.now() - pgvectorStart;

      // const friendsWhoAllowedAccessToMe = await db.query(
      //   `SELECT * FROM friends as f WHERE f.show_folders = TRUE AND friend_id = $1`,
      //   [userId],
      // );
      // console.log(friendsWhoAllowedAccessToMe.rows);

      // let friendAllowedFoldersContenxt = "";

      // if (friendsWhoAllowedAccessToMe.rows.length !== 0) {
      //   for (let friend of friendsWhoAllowedAccessToMe.rows) {
      //     if (friend.length !== 0) {
      //       const friendId = friend.user_id;
      //       const friendDocsContext = await db.query(
      //         `SELECT f.filename, f.ai_summary, fo.folder_name, f.id , f.folder_id FROM files as f INNER JOIN folders as fo
      //       ON fo.id = f.folder_id WHERE fo.user_id = $1 AND f.deleted_at IS NULL ORDER BY (f.new_embedding <-> $2) LIMIT 1 `,
      //         [friendId, `[${searchEmbedding.join(",")}]`],
      //       );
      //       console.log(friendDocsContext.rows);
      //       const context = friendDocsContext.rows
      //         .map(
      //           (c) =>
      //             ` FileName: ${c.filename}
      //    FolderName: ${c.folder_name}
      //    AiSummary: ${c.ai_summary}
      //    FileId: ${c.id},
      //    FolderId: ${c.folder_id}
      // `,
      //         )
      //         .join(" ");
      //       friendAllowedFoldersContenxt += context;
      //     }
      //     console.log(friendAllowedFoldersContenxt);
      //   }

      //   console.log(friendAllowedFoldersContenxt);
      // }

      // const { rows } = await db.query(`
      //   SELECT f.filename, f.ai_summary, fo.folder_name, f.id , f.folder_id FROM files as f INNER JOIN folders as fo
      //     ON f.folder_id = fo.id INNER JOIN friends as fr ON
      //   `);

      // console.log(rows);
      console.log(rows);

      const context = rows.map(
        (c) =>
          ` FileName: ${c.filename}
         FolderName: ${c.folder_name}
         AiSummary: ${c.ai_summary}
         FileId: ${c.id},
         FolderId: ${c.folder_id}
      `,
      );

      // cohere rerank
      const rerankStart = performance.now();
      const reRankedResponse = await cohereRerank.rerank({
        model: "rerank-multilingual-v3.0",
        query: query,
        documents: context,
        topN: 3,
      });
      timings.rerankEnds = performance.now() - rerankStart;

      const rerankedRows = reRankedResponse.results.map(
        (result) => rows[result.index],
      );

      let finalReRankedResponse = rerankedRows
        .map(
          (c) => `
            FileName: ${c.filename}
            FolderName: ${c.folder_name}
            AiSummary: ${c.ai_summary}
            FileId: ${c.id}
            FolderId: ${c.folder_id}
            `,
        )
        .join("\n");

      finalReRankedResponse = JSON.stringify(finalReRankedResponse, null, 2);

      console.log(reRankedResponse);

      const bestDoc = rerankedRows[0];

      const fileId = bestDoc.id;
      const folderId = bestDoc.folder_id;

      const schema = z.object({
        content: z.string(),
      });

      // cohere llm
      const llmStart = performance.now();

      const model = ModelManager.cohere();

      const res = await model.invoke([
        {
          role: "system",
          content: `
You are answering questions about a document.

Return ONLY valid JSON.

The JSON MUST ALWAYS have exactly these keys:

{
  "content": "",
  
}

Rules:

1. Put the answer to the user's question inside "content" as plain text.

4. Never return any other JSON format.
5. Never omit any field.
6. Never wrap content inside another object.
`,
        },
        {
          role: "user",
          content: `
Question:
${query}

Context:
${finalReRankedResponse}
`,
        },
      ]);

      console.log(" RAW COHERE RESPONSE==");
      console.dir(res, { depth: null });

      console.log("typeof res.content:", typeof res.content);
      console.log("res.content:", res.content);
      console.log("JSON.stringify(res.content):", JSON.stringify(res.content));

      if (typeof res.content !== "string") {
        throw new Error("Expected res.content to be a string.");
      }

      const content = res.content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      console.log("After cleanup:", JSON.stringify(content));

      const parsed = schema.parse(JSON.parse(content));
      // console.log("ollama res!!");

      console.log(parsed);
      console.log(typeof parsed);
      timings.llmEnds = performance.now() - llmStart;

      const totalTime = performance.now() - startTime;
      console.log("Timings:", timings);
      console.log("Total time taken:", totalTime, "ms");

      return {
        content: parsed.content,
        folderId,
        fileId,
        timings: {
          embeddingMs: Number(timings.embeddingEnds.toFixed(2)),
          pgVectorMs: Number(timings.pgvectorEnds.toFixed(2)),
          rerankMs: Number(timings.rerankEnds.toFixed(2)),
          llmMs: Number(timings.llmEnds.toFixed(2)),
          totalMs: Number(totalTime.toFixed(2)),
        },
        retrievedDocuments: rows.map((row) => ({
          fileId: row.id,
          folderId: row.folder_id,
          filename: row.filename,
        })),

        rerankedDocuments: rerankedRows.map((row) => ({
          fileId: row.id,
          folderId: row.folder_id,
          filename: row.filename,
        })),

        context: finalReRankedResponse,
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  {
    name: "search_info_from_files",
    description:
      "you have to search for the query asked by user, taking files data as context ",
    schema: z.object({
      query: z.string(),
      userId: z.number(),
    }),
  },
);

export const searchInfoUsingTravilyTool = tool(
  async ({ query, userId }) => {
    try {
      console.log("Travily tool called!!");
      let tavilyContext = "";
      const user = await db.query(`SELECT * from users WHERE id =$1`, [userId]);
      if (user.rows[0].id) {
        const tavilySearchResults = await ModelManager.searchWeb(query);
        console.log(tavilySearchResults.results);

        for (const searchResult of tavilySearchResults.results.slice(0, 1)) {
          const cont = `Title: ${searchResult.title}
        Content: ${searchResult.content}
        
        `;
          tavilyContext += cont;
        }

        const model = await ModelManager.cohere();

        const llmResponse = await model.invoke([
          {
            role: "system",
            content: `
You only answer question from the provided tavily search results as context.
Always prioritize the first search result.
answer in a concise manner in between 50-60 words.
`,
          },
          {
            role: "user",
            content: `
Question:
${query}

Context:
${tavilyContext}
`,
          },
        ]);

        console.log("===== FULL RESPONSE =====");
        console.dir(llmResponse, { depth: null });

        console.log("===== TYPE =====");
        console.log(typeof llmResponse.content);

        console.log("===== CONTENT =====");
        console.log(llmResponse.content);

        console.log("===== STRINGIFIED =====");
        console.log(JSON.stringify(llmResponse.content));

        return llmResponse.content;
      }
    } catch (err) {
      throw err;
    }
  },
  {
    name: "search_web_with_tavily",
    description:
      "Search the web using Tavily and answer the user question using the search results.",
    schema: z.object({ query: z.string(), userId: z.number() }),
  },
);
