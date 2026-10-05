import { searchDocsInfo, searchInfoUsingTravilyTool } from "../tools/chat.js";

import { getCurrentQuery } from "../../utils/getCurrentQuery.js";
import { rewriteQuery } from "../planner/rewriteQuery.js";

export async function chatNode(state) {
  const action = state.intent.action;

  const query = getCurrentQuery(state);

  const rewrittenQuery = await rewriteQuery({
    query,
    messages: state.messages,
  });

  console.log("=================================");
  console.log("CHAT NODE");
  console.log("Original Query:", query);
  console.log("Rewritten Query:", rewrittenQuery);
  console.log("=================================");

  if (action === "search") {
    const result = await searchDocsInfo.invoke({
      query: rewrittenQuery,
      userId: state.userId,
    });

    console.log("Retrieved Documents:");
    console.log(result.retrievedDocuments);

    console.log("Reranked Documents:");
    console.log(result.rerankedDocuments);

    return {
      toolResult: result.content,

      retrievedContextFolderId: result.folderId,
      retrievedContextFileId: result.fileId,

      retrievalTimings: result.timings,

      retrievedDocuments: result.retrievedDocuments,
      rerankedDocuments: result.rerankedDocuments,

      retrievedContext: result.context,
    };
  }

  if (action === "search-travily") {
    const result = await searchInfoUsingTravilyTool.invoke({
      query: rewrittenQuery,
      userId: state.userId,
    });

    return {
      toolResult: result.content,
      retrievedContext: result.tavilySources,
      retrievedContextFolderId: null,
      retrievedContextFileId: null,
    };
  }
}
