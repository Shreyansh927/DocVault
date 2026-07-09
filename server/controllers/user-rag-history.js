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
