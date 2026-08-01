// utils/getCurrentQuery.js

export function getCurrentQuery(state) {
  const messages = state.messages ?? [];

  if (messages.length === 0) {
    throw new Error("No messages found in graph state");
  }

  const latestMessage = messages[messages.length - 1];
  return latestMessage.content;
}
