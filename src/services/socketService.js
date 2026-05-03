/**
 * socketService.js — NO-OP STUB
 * ─────────────────────────────────────────────
 * WebSocket / socket.io has been intentionally REMOVED.
 * The app now communicates exclusively via REST API polling.
 *
 * This stub keeps the same public interface so that any remaining
 * import of socketService does NOT crash — every method is a safe no-op.
 *
 * DO NOT import 'socket.io-client' here. That package causes reconnect
 * loops and "Page Unresponsive" errors when the WebSocket server is
 * unavailable (e.g. Render free-tier cold starts, CORS mismatches).
 */

class SocketService {
  // All methods are safe no-ops — they log a warning but never throw.

  connect() {
    console.log('[SocketService] DISABLED — using REST polling instead of WebSockets.');
  }

  disconnect() {}

  joinChat(_chatId) {}

  leaveChat(_chatId) {}

  sendMessage(_chatId, _text, _recipientId) {
    console.warn('[SocketService] sendMessage() called on disabled socket — use REST API instead.');
  }

  on(_event, _callback) {}

  off(_event, _callback) {}

  _emit(_event, _data) {}
}

const socketService = new SocketService();
export default socketService;
