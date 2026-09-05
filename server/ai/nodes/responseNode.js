import { AIMessage } from "@langchain/core/messages";

export async function responseNode(state) {
  return {
    messages: [
      new AIMessage({
        content: JSON.stringify(state.toolResult ?? {}),
      }),
    ],

    finalResponse: {
      res: state.toolResult,
      FileId: state.retrievedContextFileId,
      FolderId: state.retrievedContextFolderId,
      Timing: state.retrievalTimings,
      intent: state.intent,
      retrievedDocuments: state.retrievedDocuments,
      rerankedDocuments: state.rerankedDocuments,

      context: state.retrievedContext,
      evaluationResult: state.evaluationResult,
    },
    evaluationResult: state.evaluationResult,
  };
}
