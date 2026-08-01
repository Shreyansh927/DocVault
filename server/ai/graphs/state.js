import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
  ...MessagesAnnotation.spec,

  userId: Annotation(),

  route: Annotation(),

  intent: Annotation(),

  toolResult: Annotation(),

  retrievedDocuments: Annotation(),

  retrievedContextFileId: Annotation(),

  retrievedContextFolderId: Annotation(),

  finalResponse: Annotation(),
});
