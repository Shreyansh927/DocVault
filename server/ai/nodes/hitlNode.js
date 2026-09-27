import { interrupt } from "@langchain/langgraph";

export async function hitlNode(state) {
  console.log("=================================");
  console.log("===== HITL NODE ENTERED =====");
  console.log("=================================");

  const proposedMoves = state.proposedMoves;

  console.log("Proposed moves:", proposedMoves);

  const humanDecision = interrupt({
    type: "file_movement_approval",
    message: "Please review and approve the following file movements.",
    moves: proposedMoves,
  });

  console.log("===== INTERRUPT RESUMED =====");
  console.log("Decision:", humanDecision);

  if (humanDecision === "approved") {
    return {
      hitlDecision: "approved",
    };
  }

  return {
    hitlDecision: "rejected",
  };
}
