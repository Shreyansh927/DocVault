import ModelManager from "../models/modelmanager.js";

export const evaluationNode = async (state) => {
  console.log("===== EVALUATION NODE =====");

  try {
    const {
      messages,
      finalResponse,
      retrievedContext,
      retrievedDocuments,
      rerankedDocuments,
      retrievalTimings,
      
    } = state;

    console.log("===== EVALUATION INPUT =====");
    console.log("Question:", messages);
    console.log("Final Response:", finalResponse);
    console.log("Retrieved Context:", retrievedContext);
    console.log("Retrieved Documents:", retrievedDocuments);
    console.log("Reranked Documents:", rerankedDocuments);

    const model = await ModelManager.cohere();

    const evaluationPrompt = `
You are an expert evaluator for a RAG-based question answering system.

USER QUESTION:
${JSON.stringify(messages)}

GENERATED ANSWER:
${JSON.stringify(finalResponse)}

RETRIEVED CONTEXT:
${JSON.stringify(retrievedContext)}

RETRIEVED DOCUMENTS:
${JSON.stringify(retrievedDocuments)}

RERANKED DOCUMENTS:
${JSON.stringify(rerankedDocuments)}

Evaluate the generated answer using these metrics.

1. Faithfulness
Is the answer supported by the retrieved context?
Does it contain unsupported claims?

2. Answer Relevance
Does the answer directly address the user's question?

3. Context Relevance
Is the retrieved context relevant to the question?

4. Completeness
Does the answer cover the important information required?

5. Clarity and Coherence
Is the answer clear and logically structured?

6. Context Recall
Does the retrieved context contain the information necessary
to answer the question?

Give each score from 0 to 10.

Return ONLY valid JSON:

{
  "faithfulness": {
    "score": 0,
    "reason": ""
  },
  "answerRelevance": {
    "score": 0,
    "reason": ""
  },
  "contextRelevance": {
    "score": 0,
    "reason": ""
  },
  "completeness": {
    "score": 0,
    "reason": ""
  },
  "clarityAndCoherence": {
    "score": 0,
    "reason": ""
  },
  "contextRecall": {
    "score": 0,
    "reason": ""
  },
  "overall": {
    "score": 0,
    "reason": ""
  }
}
`;

    const llmResponse = await model.invoke([
      {
        role: "system",
        content:
          "You are an expert RAG evaluation system. Evaluate objectively.",
      },
      {
        role: "user",
        content: evaluationPrompt,
      },
    ]);

    console.log("===== EVALUATION RESPONSE =====");
    console.log(llmResponse.content);

    return {
      evaluationResult: llmResponse.content,
    };
  } catch (err) {
    console.error("Error in evaluationNode:", err);
    throw err;
  }
};
