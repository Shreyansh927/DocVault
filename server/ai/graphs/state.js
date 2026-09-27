import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
  ...MessagesAnnotation.spec,

  userId: Annotation(),

  route: Annotation(),

  intent: Annotation(),

  toolResult: Annotation(),

  proposedMoves: Annotation(),

  hitlDecision: Annotation(),

  retrievedDocuments: Annotation(),

  retrievedContextFileId: Annotation(),

  retrievedContextFolderId: Annotation(),

  retrievalTimings: Annotation(),

  rerankedDocuments: Annotation(),

  retrievedContext: Annotation(),

  finalResponse: Annotation(),

  evaluationResult: Annotation(),

  mcpToken: Annotation(),

  retryCount: Annotation({
    reducer: (_, next) => next,
    default: () => 0,
  }),

  retryReason: Annotation(),
});
