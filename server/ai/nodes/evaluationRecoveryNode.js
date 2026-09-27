export async function evaluationRecoveryNode(state) {
  const score = state.evaluationResult?.answerRelevance?.score ?? 0;

  return {
    retryCount: (state.retryCount ?? 0) + 1,
    retryReason:
      state.evaluationResult?.answerRelevance?.reason ??
      `Low answer relevance score: ${score}`,
  };
}
