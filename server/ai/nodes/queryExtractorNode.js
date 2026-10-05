export const queryExtractorNode = async (state) => {
  const index = state.nextQueryIndex ?? 0;

  const currentQuery = state.queries?.[index];

  if (!currentQuery) {
    throw new Error(`No query found at index ${index}`);
  }

  console.log("=================================");
  console.log("QUERY EXTRACTOR");
  console.log("Index:", index);
  console.log("Current Query:", currentQuery);
  console.log("=================================");

  return {
    currentQuery,
  };
};
