const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Realtime server is running!");
});

/* =========================
   QUẢN LÝ PHÒNG ĐUA
========================= */

const rooms = {};

io.on("connection", (socket) => {
  console.log("Connect:", socket.id);

  /* TẠO PHÒNG */
  socket.on("createRoom", ({ roomId, player }) => {
    if (rooms[roomId]) {
      socket.emit("errorMessage", "Room exists");
      return;
    }

    rooms[roomId] = {
      hostId: socket.id,
      status: "waiting",
      players: [{ id: socket.id, ...player }]
    };

    socket.join(roomId);
    io.to(roomId).emit("roomUpdate", rooms[roomId]);
  });

  /* JOIN PHÒNG */
  socket.on("joinRoom", ({ roomId, player }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit("errorMessage", "Room not found");
      return;
    }
    if (room.status !== "waiting") {
      socket.emit("errorMessage", "Race started");
      return;
    }

    room.players.push({ id: socket.id, ...player });
    socket.join(roomId);
    io.to(roomId).emit("roomUpdate", room);
  });

  /* START RACE */
  socket.on("startRace", (roomId) => {
    const room = rooms[roomId];
    if (!room || socket.id !== room.hostId) return;

    room.status = "countdown";
    let count = 3;

    const timer = setInterval(() => {
      io.to(roomId).emit("countdown", count);

      if (count === 0) {
        clearInterval(timer);
        room.status = "racing";
        io.to(roomId).emit("raceStart");
      }
      count--;
    }, 1000);
  });

  /* SYNC VỊ TRÍ */
  socket.on("playerMove", ({ roomId, state }) => {
    socket.to(roomId).emit("playerMove", {
      id: socket.id,
      state
    });
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.players = room.players.filter(p => p.id !== socket.id);

      if (room.players.length === 0) {
        delete rooms[roomId];
      } else {
        if (room.hostId === socket.id) {
          room.hostId = room.players[0].id;
        }
        io.to(roomId).emit("roomUpdate", room);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
