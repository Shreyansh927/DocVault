import { db } from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const aiQueryResponse = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    const userId = req.user.id;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Query is required" });
    }

    const userName = await db.query(`SELECT name FROM users WHERE id=$1`, [
      userId,
    ]);
    console.log(userName.rows[0].name);

    /* ---------- FETCH USER FILE SUMMARIES ---------- */
    const result = await db.query(
      `
      SELECT files.ai_summary
      FROM files
      JOIN folders ON folders.id = files.folder_id
      WHERE folders.user_id = $1
        AND files.ai_summary IS NOT NULL
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        answer: "No documents found to answer your question.",
      });
    }

    /* ---------- COMBINE SUMMARIES ---------- */
    const combinedText = result.rows.map((row) => row.ai_summary).join("\n");

    // safety cap (Gemini token control)
    const safeText = combinedText.slice(0, 12000);

    /* ---------- GEMINI SETUP ---------- */
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    /* ---------- PROMPT (Q&A, NOT SUMMARY) ---------- */
    const prompt = `
You are answering questions using ONLY the user's uploaded document content.

Rules:
- if i used keywords like my in the query then treat the person as ${userName} and ans query according to him.

- If the answer is not present, say "I could not find this information in your documents."
- Do NOT guess or invent information.
- Be concise and clear.

User Question:
"${q}"

Document Content:
${safeText}
`;

    const aiResponse = await model.generateContent(prompt);

    return res.json({
      answer: aiResponse.response.text(),
    });
  } catch (err) {
    console.error("AI QUERY ERROR:", err);

    return res.status(500).json({
      error: "Error generating AI response",
    });
  }
};
