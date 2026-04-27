import apiClient from './apiClient';

// ══════════════════════════════════════
// POSTS
// ══════════════════════════════════════

export const getPosts = async (category = null) => {
  const url = category ? `/api/posts?category=${category}` : '/api/posts';
  const response = await apiClient.get(url);
  return response.data;
};

export const addPost = async (post) => {
  const response = await apiClient.post('/api/posts', post);
  return response.data;
};

export const toggleLikePost = async (postId) => {
  const response = await apiClient.put(`/api/posts/${postId}/like`);
  return response.data;
};

export const toggleSavePost = async (postId) => {
  const response = await apiClient.put(`/api/posts/${postId}/save`);
  return response.data;
};

export const deletePostService = async (postId) => {
  const response = await apiClient.delete(`/api/posts/${postId}`);
  return response.data;
};

export const updatePostService = async (postId, updates) => {
  const response = await apiClient.put(`/api/posts/${postId}`, updates);
  return response.data;
};

export const votePollService = async (postId, optionIndex) => {
  const response = await apiClient.post(`/api/posts/${postId}/vote`, { optionIndex });
  return response.data;
};

// ══════════════════════════════════════
// COMMENTS
// ══════════════════════════════════════

export const getCommentsForPost = async (postId) => {
  const response = await apiClient.get(`/api/comments/post/${postId}`);
  return response.data;
};

export const addCommentService = async (comment) => {
  const response = await apiClient.post('/api/comments', comment);
  return response.data;
};

export const deleteCommentService = async (commentId) => {
  const response = await apiClient.delete(`/api/comments/${commentId}`);
  return response.data;
};

// ══════════════════════════════════════
// DOUBTS / NOTES / ITEMS (Redirected to Posts with Categories)
// ══════════════════════════════════════

export const getDoubts = () => getPosts('Lost & Found'); // Lost & Found is used for doubts in UI sometimes?
export const getNotes = () => getPosts('Notes');
export const getItems = () => getPosts('Buy/Sell');
export const getEvents = () => getPosts('Events');

// For now, let's keep the existing UI categories mapping
export const subscribeToPosts = (callback) => {
  // Simple polling fallback or just fetch once
  getPosts().then(callback);
  const interval = setInterval(() => getPosts().then(callback), 10000);
  return () => clearInterval(interval);
};

export const subscribeToComments = (postId, callback) => {
  getCommentsForPost(postId).then(callback);
  const interval = setInterval(() => getCommentsForPost(postId).then(callback), 5000);
  return () => clearInterval(interval);
};

export const subscribeToDoubts = (callback) => {
  const fetch = () => getPosts('General').then(callback);
  fetch();
  const interval = setInterval(fetch, 10000);
  return () => clearInterval(interval);
};

export const subscribeToNotes = (callback) => {
  const fetch = () => getPosts('Notes').then(callback);
  fetch();
  const interval = setInterval(fetch, 10000);
  return () => clearInterval(interval);
};

export const subscribeToItems = (callback) => {
  const fetch = () => getPosts('Buy/Sell').then(callback);
  fetch();
  const interval = setInterval(fetch, 10000);
  return () => clearInterval(interval);
};

export const subscribeToEvents = (callback) => {
  const fetch = () => getPosts('Events').then(callback);
  fetch();
  const interval = setInterval(fetch, 10000);
  return () => clearInterval(interval);
};

export const subscribeToChats = (callback) => {
  const fetch = () => apiClient.get('/api/chat').then(res => callback(res.data));
  fetch();
  const interval = setInterval(fetch, 10000);
  return () => clearInterval(interval);
};

// Other services can be added as needed following the same pattern
export const initSeedData = async () => {};

/**
 * Update user online/offline status
 */
export const updateUserPresence = async (userId, isOnline) => {
  try {
    if (!userId) return;
    const response = await apiClient.put(`/api/users/${userId}/presence`, { isOnline });
    return response.data;
  } catch (error) {
    console.error('[DataService] Error updating user presence:', error);
    return null;
  }
};

export const subscribeToActiveUsersCount = (callback) => {
  // Placeholder
  callback(1);
  return () => {};
};
