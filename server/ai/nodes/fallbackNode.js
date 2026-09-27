// fallbackNode.js

export async function fallbackNode(state) {
  return {
    finalResponse: {
      res: "I wasn't able to generate a sufficiently reliable answer. Please try rephrasing your question.",
      fileId: null,
      folderId: null,
    },
  };
}
