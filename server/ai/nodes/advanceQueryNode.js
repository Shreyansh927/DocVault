export const advanceQueryNode = async (state) => {
  const currentIndex = state.nextQueryIndex ?? 0;

  const nextIndex = currentIndex + 1;

  console.log("==============================");
  console.log("ADVANCE QUERY");
  console.log("Current Index:", currentIndex);
  console.log("Next Index:", nextIndex);
  console.log("==============================");

  return {
    nextQueryIndex: nextIndex,
  };
};
