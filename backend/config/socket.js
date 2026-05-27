/**
 * config/socket.js — NO-OP STUB
 * ─────────────────────────────────────────────
 * WebSocket / socket.io has been intentionally DISABLED.
 * The server no longer initializes a socket.io Server instance.
 *
 * This stub keeps the same exports so index.js doesn't crash
 * on `const { initSocket } = require('./config/socket')`.
 *
 * To re-enable sockets in the future:
 *   1. Restore the full implementation from git history.
 *   2. Re-add `socket.io` to package.json dependencies.
 *   3. Un-comment `initSocket(server)` in index.js.
 */

const initSocket = (server) => {
  console.log('[Socket] WebSocket disabled — running in REST-only mode.');
  // No socket.io Server created.
};

const getIO = () => {
  // Returns null safely. Routes/controllers that called getIO() should
  // check the return value before using it.
  return null;
};

module.exports = { initSocket, getIO };
