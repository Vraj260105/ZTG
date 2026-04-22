/**
 * frontend/src/lib/socket.ts
 * Singleton socket.io-client instance.
 * All components import this same object — one connection per browser tab.
 */

import { io, Socket } from "socket.io-client";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

// Connect lazily — the connection only opens when this module is first imported
export const socket: Socket = io(BASE_URL, {
  autoConnect:       false,  // we control connect/disconnect manually
  reconnectionDelay: 2000,
  transports:        ["websocket", "polling"],
});

/**
 * Call this when the SOC admin logs in / mounts the protected layout.
 * Joins the "soc" room so the server targets events only to admins.
 */
export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
    socket.once("connect", () => {
      socket.emit("join-soc");
    });
  }
}

/** Call on logout */
export function disconnectSocket() {
  socket.disconnect();
}
