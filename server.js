const WebSocket = require("ws");
const http = require("http");

const rooms = new Map();
const clients = new Map();
let currentRoomId = null;

const server = http.createServer((_, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket server running\n");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const messageText = message.toString();

    try {
      const data = JSON.parse(messageText);

      switch (data.type) {
        case "createRoom": {
          if (rooms.has(data.roomId)) {
            ws.send(
              JSON.stringify({
                type: "error",
                context: "createRoom",
                errorCode: "roomAlreadyExists",
                message: "Room already exists",
              }),
            );
          } else {
            rooms.set(data.roomId, data.url);
            ws.send(JSON.stringify({ type: "roomCreated", roomId: data.roomId }));
          }
          break;
        }

        case "joinRoom": {
          if (rooms.has(data.roomId)) {
            currentRoomId = data.roomId;
            clients.set(ws, currentRoomId);
            ws.send(
              JSON.stringify({
                type: "roomJoined",
                url: rooms.get(data.roomId),
                roomId: data.roomId,
              }),
            );

            wss.clients.forEach((client) => {
              if (client !== ws && clients.get(client) === currentRoomId) {
                client.send(
                  JSON.stringify({
                    type: "clientJoined",
                    message: "A new client has joined the room.",
                  }),
                );
              }
            });
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                context: "joinRoom",
                errorCode: "roomNotFound",
                message: "Room not found",
              }),
            );
          }
          break;
        }

        case "scrollUpdate": {
          const clientRoomId = clients.get(ws);
          if (clientRoomId) {
            wss.clients.forEach((client) => {
              if (client !== ws && clients.get(client) === clientRoomId) {
                client.send(JSON.stringify(data));
              }
            });
          } else {
            clients.set(ws, data.roomId);
            ws.send(JSON.stringify({ type: "roomJoined", roomId: data.roomId }));
          }
          break;
        }

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              context: "unknownAction",
              errorCode: "unknown",
              message: "Unknown action",
            }),
          );
      }
    } catch (e) {
      ws.send(
        JSON.stringify({
          type: "error",
          context: "invalidMessageFormat",
          errorCode: "invalidFormat",
          message: "Invalid message format",
        }),
      );
    }
  });

  ws.on("close", () => {
    const roomId = clients.get(ws);
    if (roomId) {
      clients.delete(ws);
    }
  });
});
