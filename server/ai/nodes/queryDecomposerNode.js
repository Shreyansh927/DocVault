import ModelManager from "../models/modelmanager.js";

export const queryDecomposerNode = async (state) => {
  try {
    // Get the original user query
    const lastMessage = state.messages?.at(-1);

    if (!lastMessage) {
      throw new Error("No user message found");
    }

    const userQuery =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    console.log("\n=================================");
    console.log("QUERY DECOMPOSER");
    console.log("=================================");
    console.log("Original Query:", userQuery);

    const model = ModelManager.cohere();

    const prompt = `
You are a query decomposition component for a document-management AI agent.

Your ONLY responsibility is to decompose the user's request into
independent atomic tasks.

The downstream agent can execute ONE task at a time.

Rules:

1. If the user request contains only one task, return exactly one task.

2. If the user request contains multiple tasks, split them into
   separate atomic tasks.

3. Each task must represent ONE logical action or request.

4. Preserve the user's original intent.

5. Preserve the order in which the user expressed the tasks.

6. Do NOT execute any task.

7. Do NOT answer the user's request.

8. Do NOT invent additional tasks.

9. Do NOT combine multiple actions into one task.

10. A task can depend conceptually on a previous task, but for now
    simply preserve the correct order.

11. Return ONLY a valid JSON array of strings.
    Do not return markdown.
    Do not return explanations.

Examples:

User:
"Create a folder called Projects"

Output:
[
  "Create a folder called Projects"
]

User:
"Create a folder called Projects and move resume.pdf into it"

Output:
[
  "Create a folder called Projects",
  "Move resume.pdf into the Projects folder"
]

User:
"Create a folder called Projects and move resume.pdf and driving license into it"

Output:
[
  "Create a folder called Projects",
  "Move resume.pdf and driving license into the Projects folder"
]

User:
"Delete folder XYZ, summarize ABC.pdf, and find all PDF files"

Output:
[
  "Delete folder XYZ",
  "Summarize ABC.pdf",
  "Find all PDF files"
]

User:
"Create folder Work, move report.pdf into it, summarize the report,
and tell me the three most important points"

Output:
[
  "Create folder Work",
  "Move report.pdf into the Work folder",
  "Summarize report.pdf",
  "Tell me the three most important points from report.pdf"
]

User request:
${userQuery}
`;

    const response = await model.invoke(prompt);

    const rawContent =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    console.log("Raw Decomposer Response:");
    console.log(rawContent);

    // Remove accidental markdown code fences
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let queries;

    try {
      queries = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse decomposer output:");
      console.error(cleanedContent);

      throw new Error("Query decomposer returned invalid JSON");
    }

    // Validate the output
    if (!Array.isArray(queries)) {
      throw new Error("Query decomposer must return an array");
    }

    if (queries.length === 0) {
      throw new Error("Query decomposer returned zero queries");
    }

    if (
      !queries.every(
        (query) => typeof query === "string" && query.trim().length > 0,
      )
    ) {
      throw new Error("Query decomposer returned invalid queries");
    }

    const cleanedQueries = queries.map((query) => query.trim());

    console.log("Decomposed Queries:");
    cleanedQueries.forEach((query, index) => {
      console.log(`${index + 1}. ${query}`);
    });

    console.log("Total Queries:", cleanedQueries.length);
    console.log("=================================\n");

    return {
      queries: cleanedQueries,
    };
  } catch (error) {
    console.error("Query Decomposer Error:", error);

    throw error;
  }
};
