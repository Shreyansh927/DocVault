import ModelManager from "../models/modelmanager.js";

export async function rewriteQuery(messages) {
  const prompt = `
You are a conversational query rewriter.

Your task is to rewrite ONLY the latest user question into a standalone question.

Rules:
- Use previous conversation to resolve references.
- Resolve pronouns like:
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

Do NOT answer the question.

Return ONLY the rewritten question.

Examples:

Conversation:

Human:
What is my Aadhaar number?

Assistant:
Your Aadhaar number is 6583 8917 0326.

Human:
What is its Virtual ID?

Output:
What is the Virtual ID of my Aadhaar card?

--------------------------

Conversation:

Human:
Summarize Resume.pdf

Assistant:
...

Human:
Explain the second paragraph.

Output:
Explain the second paragraph of Resume.pdf.

if it , him represent external source then use "action" : "search-travily"
`;

  const response = await ModelManager.cohere().invoke([
    {
      role: "system",
      content: prompt,
    },
    ...messages,
  ]);

  console.log("Full Rewrite Response:");
  console.dir(response, { depth: null });

  console.log("Type of content:", typeof response.content);
  console.log("Raw content:", response.content);
  console.log("Escaped content:", JSON.stringify(response.content));

  const content = response.content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  console.log("Cleaned content:", JSON.stringify(content));

  return content;
}
