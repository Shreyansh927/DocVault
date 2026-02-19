import { db } from "../db.js";
import { GoogleGenAI } from "@google/genai";

const TOP_K = 20;
const MAX_CONTEXT_CHARS = 200000;

export const aiQueryResponse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Query is required" });
    }

    const genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    /* =====================================================
       STEP 1: Generate Embedding for User Query (NEW SDK)

    ===================================================== */
    const generateEmbedding = async (text) => {
      try {
        const result = await genAI.models.embedContent({
          model: "gemini-embedding-001",
          contents: [
            {
              role: "user",
              parts: [{ text }],
            },
          ],
        });

        return result.embeddings[0].values.slice(0, 1536);
      } catch (err) {
        console.error("Gemini embedding failed:", err);
        return null;
      }
    };

    const queryEmbedding = await generateEmbedding(q);

    if (!queryEmbedding) {
      return res.status(500).json({ error: "Embedding failed" });
    }

    /* =====================================================
       STEP 2: Vector Search (pgvector similarity)
    ===================================================== */
    const { rows } = await db.query(
      `
      SELECT f.filename, f.ai_summary, f.embedding, fo.folder_name
      FROM files f
      JOIN folders fo ON fo.id = f.folder_id
      WHERE fo.user_id = $1
        AND f.deleted_at IS NULL
        AND f.embedding IS NOT NULL
      ORDER BY f.embedding <-> $2
      LIMIT $3
      `,
      [userId, `[${queryEmbedding.join(",")}]`, TOP_K],
    );

    if (!rows.length) {
      return res.json({
        answer: "I could not find this information in your documents.",
      });
    }

    /* =====================================================
       STEP 3: Build Context
    ===================================================== */
    let context = "";
    let totalChars = 0;

    for (const row of rows) {
      const chunk = `
File: ${row.filename}
Content:
${row.ai_summary}
embedding: ${row.embedding}
Folder: ${row.folder_name}
---
`;

      totalChars += chunk.length;
      if (totalChars > MAX_CONTEXT_CHARS) break;

      context += chunk;
    }

    /* =====================================================
       STEP 4: Generate Final Answer (NEW SDK)
    ===================================================== */
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are an AI assistant.

Answer strictly using the document context below.
If the information is not present, respond exactly with:
"I could not find this information in your documents."

User Question:
${q}

Document Context:
${context}
`,
            },
          ],
        },
      ],
    });

    const answer = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return res.json({
      answer:
        answer && answer.length > 0
          ? answer
          : "I could not find this information in your documents.",
    });
  } catch (err) {
    console.error("AI QUERY ERROR:", err.message);
    return res.status(500).json({
      error: "Error generating AI response",
    });
  }
};
