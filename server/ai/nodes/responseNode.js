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
    },
  };
}