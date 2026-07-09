import officeParser from "officeparser";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const extractTextFromFile = async (file) => {
  try {
    if (
      file.mimetype.includes("presentation") ||
      file.mimetype.includes("wordprocessingml")
    ) {
      return await officeParser.parseOfficeAsync(file.buffer);
    }

    if (file.mimetype === "text/plain") {
      return file.buffer.toString("utf-8");
    }

    return null;
  } catch (err) {
    console.error(err);

    return null;
  }
};

export const summarizeFileWithAI = async (file) => {
  try {
    if (!file) return null;

    if (file.mimetype === "application/pdf") {
      const base64PDF = file.buffer.toString("base64");

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",

        contents: [
          {
            role: "user",

            parts: [
              {
                text: "Summarize this document.",
              },

              {
                inlineData: {
                  mimeType: "application/pdf",

                  data: base64PDF,
                },
              },
            ],
          },
        ],
      });

      return result.text;
    }

    if (file.mimetype.startsWith("image/")) {
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",

        contents: [
          {
            role: "user",

            parts: [
              {
                text: "Summarize this image.",
              },

              {
                inlineData: {
                  mimeType: file.mimetype,

                  data: file.buffer.toString("base64"),
                },
              },
            ],
          },
        ],
      });

      return result.text;
    }

    const extracted = await extractTextFromFile(file);

    if (!extracted) return null;

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",

      contents: `Summarize\n\n${extracted}`,
    });

    return result.text;
  } catch (err) {
    console.error(err);

    return null;
  }
};
