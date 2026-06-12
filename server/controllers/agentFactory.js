import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const memory = new MemorySaver();

export const createFallbackAgent = (tools, systemPrompt) => {
  const geminiAgent = createAgent({
    model: new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
      apiKey: process.env.GEMINI_API_KEY,
    }),

    tools,

    systemPrompt,

    checkpointer: memory,
  });

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
      try {
        return await geminiAgent.invoke(payload, config);
      } catch (geminiError) {
        console.error("Gemini agent failed:", geminiError.message);

        try {
          return await groqAgent.invoke(payload, config);
        } catch (groqError) {
          console.error("Groq fallback failed:", groqError);

          return {
            messages: [
              {
                role: "assistant",

                content:
                  "Sorry, I couldn't process your request at the moment.",
              },
            ],
          };
        }
      }
    },
  };
};
