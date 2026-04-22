/**
 * backend/utils/socket.js
 * Socket.IO singleton — call init(httpServer) once in server.js,
 * then getIo() anywhere else to emit events.
 */

"use strict";

let _io = null;

function init(httpServer) {
  const { Server } = require("socket.io");
  _io = new Server(httpServer, {
    cors: {
      origin:      process.env.FRONTEND_URL || "http://localhost:8081",
      credentials: true,
    },
  });

  _io.on("connection", (socket) => {
    // Clients join the "soc" room only — keeps broadcasts scoped
    socket.on("join-soc", () => socket.join("soc"));
    socket.on("disconnect", () => {});
  });

  console.log("[Socket.IO] Initialized");
  return _io;
}

function getIo() {
  return _io; // may be null if called before init — callers must guard
}

module.exports = { init, getIo };
