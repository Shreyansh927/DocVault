import { WebSocketServer } from "ws";
import { redisPublisher, redisSubscriber } from "../redis.js";

const REDIS_CHANNEL = "chat-messages";

const clients = new Map();

export function initializeWebSocket(server) {
  const wsServer = new WebSocketServer({
    server,
    path: "/ws",
  });

  // Receive messages from Redis
  redisSubscriber.subscribe(REDIS_CHANNEL);

  redisSubscriber.on("message", (channel, message) => {
    if (channel !== REDIS_CHANNEL) return;

    try {
      const data = JSON.parse(message);

      const client = clients.get(Number(data.receiverId));

      if (client && client.readyState === client.OPEN) {
        client.send(message);
      }
    } catch (error) {
      console.error("Redis message error:", error);
    }
  });

  // WebSocket connection
  wsServer.on("connection", (websocket) => {
    console.log("WebSocket connected");

    websocket.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        console.log("WebSocket message:", message);

        // Register user
        if (message.type === "connect") {
          const userId = Number(message.userId);

          websocket.userId = userId;

          clients.set(userId, websocket);

          websocket.send(
            JSON.stringify({
              type: "connected",
              userId,
            }),
          );

          return;
        }

        // Publish chat message
        // if (message.type === "message") {
        //   await redisPublisher.publish(REDIS_CHANNEL, JSON.stringify(message));
        // }
      } catch (error) {
        console.error("WebSocket error:", error);
      }
    });

    websocket.on("close", () => {
      if (websocket.userId) {
        clients.delete(websocket.userId);

        console.log(`User ${websocket.userId} disconnected`);
      }
    });

    websocket.on("error", (error) => {
      console.error("WebSocket connection error:", error);
    });
  });

  console.log("WebSocket server initialized");

  return wsServer;
}
