import apiClient from './apiClient';

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
