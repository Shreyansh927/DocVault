import { toolresults } from "googleapis/build/src/apis/toolresults/index.js";
import { searchDocsInfo, searchInfoUsingTravilyTool } from "../tools/chat.js";
import { getCurrentQuery } from "../../utils/getCurrentQuery.js";

import { rewriteQuery } from "../planner/rewriteQuery.js";

export async function chatNode(state) {
  const action = state.intent.action;

  let query = getCurrentQuery(state);
  const rewrittenQuery = await rewriteQuery(state.messages);

  console.log("Original Query:", query);
  console.log("Rewritten Query:", rewrittenQuery);

  if (action === "search") {
    const result = await searchDocsInfo.invoke({
      query: rewrittenQuery,
      userId: state.userId,
    });

    console.log(result.retrievedDocuments);
    console.log(result.rerankedDocuments);

    return {
      toolResult: result.content,
      retrievedContextFolderId: result.folderId,
      retrievedContextFileId: result.fileId,
      retrievalTimings: result.timings,
      retrievedDocuments: result.retrievedDocuments,
      rerankedDocuments: result.rerankedDocuments,

      retrievalContext: result.context,
    };
  }

  if (action === "search-travily") {
    const result = await searchInfoUsingTravilyTool.invoke({
      query: rewrittenQuery,
      userId: state.userId,
    });

    return {
      toolResult: result,
      retrievedContextFolderId: null,
      retrievedContextFileId: null,
    };
  }
}
