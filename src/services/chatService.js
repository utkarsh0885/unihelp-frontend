import apiClient from './apiClient';

/**
 * Fetch all active conversations for the user
 */
export const getMyChats = async () => {
  const response = await apiClient.get('/api/chat');
  return response.data;
};

/**
 * Initialize a new chat or get existing one
 */
export const initChat = async (recipientId, recipientName, item = null) => {
  const response = await apiClient.post('/api/chat/init', {
    recipientId,
    recipientName,
    item
  });
  return response.data;
};

/**
 * Fetch historical messages for a chat
 */
export const getChatMessages = async (chatId) => {
  const response = await apiClient.get(`/api/chat/${chatId}/messages`);
  return response.data;
};

/**
 * Get total unread count across all chats
 */
export const getTotalUnreadCount = async () => {
  try {
    const response = await apiClient.get('/api/chat/unread-count');
    return response.data.count;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
};
