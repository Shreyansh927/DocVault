import { db } from "../db.js";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",

  apiKey: process.env.GEMINI_API_KEY,
});

export const RelatedRag = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;
    console.log(q);
    let queryEmbedding = await embeddings.embedQuery(q);
    queryEmbedding = `[${queryEmbedding.join(",")}]`;
    const { rows } = await db.query(
      `
        SELECT query, response, created_at FROM semantic_search_logs WHERE user_id = $1  
        ORDER BY (query_embedding <-> $2) LIMIT 2
        `,
      [userId, queryEmbedding],
    );
    console.log(rows);
    return res.status(200).json({ relatedResponses: rows });
  } catch (err) {
    console.log(err);
    return res.status(501).json({ error: err });
  }
};

export const getFullRagHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await db.query(
      `SELECT id, user_id, query, response, created_at, file_id, folder_id, timing, retrieved_documents, reranked_documents FROM ai_query_jobs WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return res.status(200).json({ ragHistory: rows });
  } catch (err) {
    console.log(err);
    return res.status(501).json({ error: err });
  }
};

export const getTracesOfQuery = async (req, res) => {
  try {
    const userId = req.user.id;
    const {queryId} = req.query;
    const { rows } = await db.query(
      `SELECT id, query, timing, retrieved_documents, reranked_documents FROM ai_query_jobs WHERE user_id=$1 AND id=$2`,
      [userId, queryId],
    );
    console.log(JSON.stringify(rows, null, 2));
    return res.status(200).json({ response: rows[0] });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err });
  }
};
