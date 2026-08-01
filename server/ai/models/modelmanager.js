import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";

import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";
import { ChatCohere } from "@langchain/cohere";
import { tavily } from "@tavily/core";

const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});

class ModelManager {
  static gemini() {
    return new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  static embeddings() {
    return new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-001",
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  static groq() {
    return new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  static ollama() {
    return new ChatOllama({
      model: "llama3:latest",
      baseUrl: "http://localhost:11434",
      temperature: 0,
    });
  }

  static cohere() {
    return new ChatCohere({
      model: "command-a-03-2025",
      temperature: 0,
      apiKey: process.env.COHERE_API_KEY,
    });
  }

  static async searchWeb(query) {
    return await tavilyClient.search(query, {
      searchDepth: "advanced",
      maxResults: 5,
      topic: "general",
    });
  }
}

export default ModelManager;
