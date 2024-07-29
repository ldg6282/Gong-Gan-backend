const WebSocket = require("ws");
const http = require("http");

const rooms = new Map();
const clients = new Map();

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
            rooms.set(data.roomId, { url: data.url, clients: new Set() });
            ws.send(JSON.stringify({ type: "roomCreated", roomId: data.roomId }));
          }
          break;
        }

        case "joinRoom": {
          if (rooms.has(data.roomId)) {
            const room = rooms.get(data.roomId);
            room.clients.add(ws);
            clients.set(ws, { roomId: data.roomId, userId: data.userId });
            ws.send(
              JSON.stringify({
                type: "roomJoined",
                url: room.url,
                roomId: data.roomId,
                userId: data.userId,
              }),
            );

            if (room.clients.size >= 2) {
              const firstClient = Array.from(room.clients)[0];
              firstClient.send(
                JSON.stringify({
                  type: "initiatePeerConnection",
                  message: "Please create an offer",
                }),
              );
            }

            room.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "clientJoined",
                    message: "A new client has joined the room.",
                    userId: data.userId,
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

        case "webrtcOffer":
        case "webrtcAnswer":
        case "webrtcIceCandidate": {
          const clientInfo = clients.get(ws);
          if (clientInfo) {
            const room = rooms.get(clientInfo.roomId);
            if (room) {
              room.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({
                      ...data,
                      userId: clientInfo.userId,
                    }),
                  );
                }
              });
            }
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                context: data.type,
                errorCode: "notInRoom",
                message: "You are not in a room",
              }),
            );
          }
          break;
        }

        case "urlChange":
        case "scrollUpdate":
        case "clickEvent": {
          const clientInfo = clients.get(ws);
          if (clientInfo) {
            const room = rooms.get(clientInfo.roomId);
            if (room) {
              room.clients.forEach((client) => {
                if (
                  client !== ws &&
                  client.readyState === WebSocket.OPEN &&
                  clients.get(client).userId !== data.userId
                ) {
                  client.send(JSON.stringify(data));
                }
              });
            }
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                context: data.type,
                errorCode: "notInRoom",
                message: "You are not in a room",
              }),
            );
          }
          break;
        }

        case "drawEvent": {
          const clientInfo = clients.get(ws);
          if (clientInfo) {
            const room = rooms.get(clientInfo.roomId);
            if (room) {
              room.clients.forEach((client) => {
                if (
                  client !== ws &&
                  client.readyState === WebSocket.OPEN &&
                  clients.get(client).userId !== data.userId
                ) {
                  client.send(JSON.stringify(data));
                }
              });
            }
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                context: data.type,
                errorCode: "notInRoom",
                message: "You are not in a room",
              }),
            );
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
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      const room = rooms.get(clientInfo.roomId);
      if (room) {
        room.clients.delete(ws);
        if (room.clients.size === 0) {
          rooms.delete(clientInfo.roomId);
        } else {
          room.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "clientLeft",
                  message: "A client has left the room.",
                }),
              );
            }
          });
        }
      }
      clients.delete(ws);
    }
  });
});
