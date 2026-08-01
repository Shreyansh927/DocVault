import { db } from "../../db.js";
import { getCurrentQuery } from "../../utils/getCurrentQuery.js";
import ModelManager from "../models/modelmanager.js";
import { planner } from "../planner/planner.js";
export async function plannerNode(state) {
  console.log("Planner state:");
  console.dir(state, { depth: null });

  const query = getCurrentQuery(state);


  const embedding = await ModelManager.embeddings().embedQuery(query);

  await db.query(
    `INSERT INTO semantic_search_logs
        (
            user_id,
            query,
            query_embedding,
            status,
            created_at
        )
        VALUES
        (
            $1,$2,$3,'PROCESSING',NOW()
        )`,
    [state.userId, query, `[${embedding.join(",")}]`],
  );

  const intent = await planner(state.messages);
  console.log(
    state.messages.map((m) => ({
      type: m._getType?.() ?? m.constructor.name,
      content: m.content,
    })),
  );
  console.log(JSON.stringify(intent, null, 2));

  return {
    intent,
    route: intent.route,
  };
}