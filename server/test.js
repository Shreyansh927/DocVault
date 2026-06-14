// test.js
import { ChatOllama } from "@langchain/ollama";

const llm = new ChatOllama({
  model: "qwen3:latest",
  baseUrl: "http://127.0.0.1:11434",
  temperature: 0,
});

console.log("START");

try {
  const response = await llm.invoke("Say hello");

  console.log("DONE");

  console.log(response.content);
} catch (error) {
  console.error(error);
}
