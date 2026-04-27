import { io } from 'socket.io-client';
import { getStoredToken } from './authService';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  async connect() {
    if (this.socket?.connected) return;

    const token = await getStoredToken();
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'], // Faster and avoids CORS issues sometimes
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Chat Server');
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from Chat Server:', reason);
    });

    // Handle incoming messages
    this.socket.on('receive_message', (message) => {
      this._emit('message', message);
    });

    // Handle notifications
    this.socket.on('new_message_notification', (data) => {
      this._emit('notification', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChat(chatId) {
    if (this.socket) {
      this.socket.emit('join_chat', chatId);
    }
  }

  leaveChat(chatId) {
    if (this.socket) {
      this.socket.emit('leave_chat', chatId);
    }
  }

  sendMessage(chatId, text, recipientId) {
    if (this.socket) {
      this.socket.emit('send_message', { chatId, text, recipientId });
    }
  }

  // Simple event emitter pattern
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      this.listeners.set(event, eventListeners.filter(l => l !== callback));
    }
  }

  _emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }
}

const socketService = new SocketService();
export default socketService;
