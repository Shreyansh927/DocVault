import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateEmbedding = async (text) => {
  try {
    const result = await genAI.models.embedContent({
      model: "gemini-embedding-001",

      contents: [
        {
          role: "user",

          parts: [
            {
              text,
            },
          ],
        },
      ],
    });

    return result.embeddings[0].values.slice(0, 3072);
  } catch (err) {
    console.error(err);

    return null;
  }
};
