const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const PORT = process.env.PORT || 3000;

// API test
app.get("/", (req, res) => {
  res.send("Realtime server is running!");
});

// Game rooms
const rooms = {};

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("joinRoom", (roomId, playerData) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, ...playerData });

    io.to(roomId).emit("playersUpdate", rooms[roomId]);
  });

  socket.on("playerMove", (roomId, state) => {
    socket.to(roomId).emit("playerMove", {
      id: socket.id,
      state
    });
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(p => p.id !== socket.id);
      io.to(roomId).emit("playersUpdate", rooms[roomId]);
    }
  });
});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
