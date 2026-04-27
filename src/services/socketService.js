import { io } from 'socket.io-client';
import { getStoredToken } from './tokenService';
import { Platform } from 'react-native';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'https://unihelp-backend-a5f3.onrender.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  async connect() {
    if (this.socket?.connected) return;

    const token = await getStoredToken();
    if (!token) return;

    console.log('[SocketService] Connecting to:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      // Increase timeout for slow connections (Render spin-up)
      timeout: 20000,
      reconnectionAttempts: 5,
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
