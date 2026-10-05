import { getCurrentQuery } from "../../utils/getCurrentQuery.js";
import { planner } from "../planner/planner.js";

export async function plannerNode(state) {
  const query = getCurrentQuery(state);

  console.log("=================================");
  console.log("PLANNER");
  console.log("Current Query:", query);
  console.log("Query Index:", state.nextQueryIndex);
  console.log("=================================");

  const intent = await planner(query);

  console.log("Planner Intent:");
  console.log(JSON.stringify(intent, null, 2));

  return {
    intent,
    route: intent.route,
  };
}
