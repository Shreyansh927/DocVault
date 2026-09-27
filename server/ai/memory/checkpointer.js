// checkpointer.js

import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

export const checkPointer = PostgresSaver.fromConnString(
  process.env.DATABASE_URL,
);

export async function initializeCheckpointer() {
  await checkPointer.setup();
  console.log("LangGraph checkpointer initialized");
}
