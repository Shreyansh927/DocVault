import { builder } from "./builder.js";

import { checkPointer } from "../memory/checkpointer.js";

export const graph = builder.compile({
  checkpointer: checkPointer,
});
