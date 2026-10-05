import ModelManager from "../models/modelmanager.js";

export async function rewriteQuery({ query, messages = [] }) {
  const prompt = `
You are a conversational query rewriter for a document Q&A system.

Your ONLY task is to rewrite the CURRENT TASK into a standalone,
self-contained question or request.

CURRENT TASK:
${query}

CONVERSATION HISTORY:
${JSON.stringify(messages)}

IMPORTANT:

The CURRENT TASK is the primary input.

Conversation history may ONLY be used to resolve references
such as:
- it
- this
- that
- he
- him
- his
- she
- her
- they
- them
- previous file
- previous folder
- previous document

Do NOT replace the current task with an older user request.

Do NOT merge multiple tasks from the conversation into the
current task.

Do NOT reintroduce tasks that belong to previous iterations.

DO NOT answer the request.

DO NOT retrieve information.

DO NOT invent names, people, documents, folders, or entities.

DO NOT change the user's intent.

==================================================
REFERENCE RESOLUTION
==================================================

Resolve a reference only when the referenced entity is clearly
established by the relevant conversation history.

Prefer the most recent relevant exchange.

NEVER guess an entity.

If the reference cannot be resolved with high confidence,
keep the original reference.

==================================================
ACTION PRESERVATION
==================================================

NEVER change the requested action.

move → move
delete → delete
summarize → summarize
find → find
explain → explain

==================================================
DOCUMENT PRESERVATION
==================================================

Preserve explicit document names, filenames, file types,
folder names, and entity names.

For example:

CURRENT TASK:
Summarize the art craft PDF

Output:
Summarize the art craft PDF

Do NOT transform it into something vague such as:
Summarize the user's creative documents.

Another example:

CURRENT TASK:
Summarize Shreyansh's Aadhar card

Output:
Summarize Shreyansh's Aadhar card

Do NOT remove "Shreyansh" or "Aadhar card".

==================================================
OUTPUT
==================================================

Return ONLY the rewritten question/request.

No explanation.
No JSON.
No markdown.
No quotation marks.
`;

  const response = await ModelManager.cohere().invoke([
    {
      role: "system",
      content: prompt,
    },
  ]);

  const content =
    typeof response.content === "string"
      ? response.content
      : String(response.content);

  const cleanedContent = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  console.log("===== QUERY REWRITE =====");
  console.log("Current Query:", query);
  console.log("Rewritten:", cleanedContent);

  return cleanedContent;
}
