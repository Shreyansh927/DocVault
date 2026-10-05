// utils/getCurrentQuery.js

export function getCurrentQuery(state) {
  if (!state.currentQuery) {
    throw new Error("No current query found");
  }

  return state.currentQuery;
}
