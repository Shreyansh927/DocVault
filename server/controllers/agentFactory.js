import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
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

  // const ollamaAgent = createAgent({
  //   model: new ChatOllama({
  //     model: "llama3:latest",
  //     baseUrl: "http://localhost:11434",
  //     temperature: 0,
  //   }),
  //   tools,
  //   systemPrompt,
  //   checkpointer: memory,
  // });

  const groqAgent = createAgent({
    model: new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      apiKey: process.env.GROQ_API_KEY,
    }),

    tools,

    systemPrompt,

    checkpointer: memory,
  });

  return {
    invoke: async (payload, config) => {
      // try {
      //   return await ollamaAgent.invoke(payload, config);
      // } catch (ollamaError) {
      //   console.error("Ollama agent failed:", ollamaError.message);

      try {
        return await groqAgent.invoke(payload, config);
        
      } catch (groqError) {
        console.error("Gemini fallback failed:", groqError.message);

        try {
          return await geminiAgent.invoke(payload, config);
        } catch (geminiError) {
          console.error("Groq fallback failed:", geminiError);
        }
      }
    },
  };
};
