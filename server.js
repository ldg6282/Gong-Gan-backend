const WebSocket = require("ws");
const http = require("http");

const rooms = new Map();

const server = http.createServer((_, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket server running\n");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "createRoom":
          if (rooms.has(data.roomId)) {
            ws.send(JSON.stringify({ type: "error", message: "Room already exists" }));
          } else {
            rooms.set(data.roomId, data.url);
            ws.send(JSON.stringify({ type: "roomCreated", roomId: data.roomId }));
          }
          break;

        case "joinRoom":
          if (rooms.has(data.roomId)) {
            ws.send(JSON.stringify({ type: "roomJoined", url: rooms.get(data.roomId) }));
          } else {
            ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
          }
          break;

        default:
          ws.send(JSON.stringify({ type: "error", message: "Unknown action" }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
    }
  });
});
