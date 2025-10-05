const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

class RoomManager {
  constructor() {
    this.rooms = {};
  }

  createRoom() {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.rooms[roomCode] = {
      streamer: null,
      viewers: new Set(),
    };
    console.log(`Room created: ${roomCode}`);
    return roomCode;
  }

  joinRoom(roomCode, ws) {
    const room = this.rooms[roomCode];
    if (!room) {
      return { error: "Room not found" };
    }

    const clientId = uuidv4();
    // The first person to join after creation is the streamer
    if (!room.streamer) {
      room.streamer = { ws, clientId };
      console.log(`Streamer ${clientId} joined room ${roomCode}`);
      return { role: "streamer", clientId };
    } else {
      const viewer = { ws, clientId };
      room.viewers.add(viewer);
      console.log(`Viewer ${clientId} joined room ${roomCode}`);
      // Notify the streamer that a new viewer has joined
      if (room.streamer.ws.readyState === WebSocket.OPEN) {
        room.streamer.ws.send(
          JSON.stringify({ type: "viewer-joined", from: clientId })
        );
      }
      return { role: "viewer", clientId };
    }
  }

  leaveRoom(roomCode, clientId) {
    const room = this.rooms[roomCode];
    if (!room) return;

    if (room.streamer && room.streamer.clientId === clientId) {
      console.log(`Streamer left room ${roomCode}. Closing room.`);
      for (const viewer of room.viewers) {
        if (viewer.ws.readyState === WebSocket.OPEN) {
          viewer.ws.send(JSON.stringify({ type: "streamer-disconnected" }));
          viewer.ws.close();
        }
      }
      delete this.rooms[roomCode];
    } else {
      room.viewers.forEach((viewer) => {
        if (viewer.clientId === clientId) {
          room.viewers.delete(viewer);
          console.log(`Viewer ${clientId} left room ${roomCode}`);
        }
      });
    }
  }

  sendMessage(roomCode, senderId, message) {
    const room = this.rooms[roomCode];
    if (!room || !room.streamer) return;

    const data = JSON.parse(message);
    data.from = senderId;

    const recipientId = data.to;
    if (recipientId) {
      const isRecipientStreamer = recipientId === room.streamer.clientId;
      const recipient = isRecipientStreamer
        ? room.streamer
        : [...room.viewers].find((v) => v.clientId === recipientId);

      if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
        recipient.ws.send(JSON.stringify(data));
      } else {
        console.warn(
          `Recipient ${recipientId} not found or connection not open.`
        );
      }
    }
  }
}

class SignalingServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.roomManager = new RoomManager();
    this.clientMap = new Map(); // Maps ws connection to { clientId, roomCode }

    this.wss.on("connection", this.handleConnection.bind(this));
    console.log("Signaling Server initialized.");
  }

  handleConnection(ws) {
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === "create-room") {
          const roomCode = this.roomManager.createRoom();
          const result = this.roomManager.joinRoom(roomCode, ws);
          this.clientMap.set(ws, { clientId: result.clientId, roomCode });
          ws.send(JSON.stringify({ type: "room-created", roomCode }));
        } else if (data.type === "join-room") {
          const roomCode = data.roomCode;
          const result = this.roomManager.joinRoom(roomCode, ws);
          if (result.error) {
            ws.send(JSON.stringify({ type: "error", message: result.error }));
          } else {
            this.clientMap.set(ws, { clientId: result.clientId, roomCode });
            ws.send(JSON.stringify({ type: "room-joined" }));
          }
        } else {
          const clientInfo = this.clientMap.get(ws);
          if (clientInfo) {
            this.roomManager.sendMessage(
              clientInfo.roomCode,
              clientInfo.clientId,
              message
            );
          }
        }
      } catch (error) {
        console.error("Failed to process message:", message, error);
      }
    });

    ws.on("close", () => {
      const clientInfo = this.clientMap.get(ws);
      if (clientInfo) {
        this.roomManager.leaveRoom(clientInfo.roomCode, clientInfo.clientId);
        this.clientMap.delete(ws);
      }
    });
  }
}

module.exports = SignalingServer;
