import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const memory = new MemorySaver();

export const createFallbackAgent = (tools, systemPrompt) => {
  const geminiAgent = createAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-3.5-flash",
      temperature: 0,
      apiKey: process.env.GEMINI_API_KEY,
    }),
    tools,
    systemPrompt,
    checkpointer: memory,
  });

  const groqAgent = createAgent({
    model: new ChatGroq({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      apiKey: process.env.GROQ_API_KEY,
    }),
    tools,
    systemPrompt,
    checkpointer: memory,
  });

  return {
    invoke: async (payload, config) => {
      try {
        return await geminiAgent.invoke(payload, config);
      } catch (error) {
        console.error("Gemini agent failed:", error.message);

        return await groqAgent.invoke(payload, config);
      }
    },
  };
};
