import apiClient from './apiClient';

// ══════════════════════════════════════
// POSTS
// ══════════════════════════════════════

export const getPosts = async (category = null, limit = null, cursor = null) => {
  let url = '/api/posts';
  const params = [];
  if (category) params.push(`category=${encodeURIComponent(category)}`);
  if (limit) params.push(`limit=${limit}`);
  if (cursor) params.push(`cursor=${encodeURIComponent(cursor)}`);
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  console.log(`[DataService] ▶ GET ${url}`);
  try {
    const response = await apiClient.get(url);
    console.log(`[DataService] ✅ GET ${url} → status=${response.status}`);
    return response.data;
  } catch (err) {
    const status = err?.response?.status ?? 'NO_RESPONSE';
    const msg = err?.response?.data?.error || err?.message || 'Unknown error';
    console.error(`[DataService] ❌ GET ${url} → status=${status}, error=${msg}`);
    throw err;
  }
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

export const getSavedPostsService = async () => {
  const response = await apiClient.get('/api/posts/saved');
  return response.data;
};

export const deletePostService = async (postId) => {
  const response = await apiClient.delete(`/api/posts/${postId}`);
  return response.data;
};

export const updatePostService = async (postId, updates) => {
  console.log("UPDATE POST REQUEST", postId, updates);
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
// CATEGORY HELPERS
// ══════════════════════════════════════

export const getDoubts = () => getPosts('Lost & Found');
// getNotes removed — Notes are now stored in a separate Firestore collection.
export const getItems = () => getPosts('Buy/Sell');
export const getEvents = () => getPosts('Events');

// ══════════════════════════════════════
// SUBSCRIBE HELPERS
// Each subscribe calls the callback immediately, then polls every 10s.
// On ANY error, the callback is called with an empty array so loading 
// state is always resolved and the UI never hangs on skeleton indefinitely.
// ══════════════════════════════════════

export const subscribeToPosts = (callback) => {
  const fetch = () => {
    console.log('[DataService] 🔄 subscribeToPosts → calling getPosts()...');
    getPosts()
      .then((data) => {
        console.log(`[DataService] ✅ subscribeToPosts → ${data?.length ?? 0} posts received`);
        callback(data || [], null); // (data, error)
      })
      .catch((err) => {
        const status = err?.response?.status ?? 'NETWORK_ERROR';
        const msg = err?.response?.data?.error || err?.message || 'Unknown error';
        console.error(`[DataService] ❌ subscribeToPosts FAILED → status=${status}, msg=${msg}`);
        callback([], `${status}: ${msg}`); // (empty data, error string)
      });
  };
  fetch();
  const interval = setInterval(fetch, 15000);
  return () => clearInterval(interval);
};

export const subscribeToComments = (postId, callback) => {
  const fetch = () =>
    getCommentsForPost(postId)
      .then(callback)
      .catch((err) => {
        console.warn('[DataService] subscribeToComments error:', err?.message);
        callback([]);
      });
  fetch();
  const interval = setInterval(fetch, 5000);
  return () => clearInterval(interval);
};

// ── Removed: subscribeToDoubts, subscribeToNotes, subscribeToItems, subscribeToEvents ──
// Feeds are now derived in-memory from the main posts subscription in DataContext.js.

// ── Removed: subscribeToChats ──────────────────────────────────────────────────
// ChatListScreen now manages its own polling via setInterval.
// DataContext no longer subscribes to chats.

export const initSeedData = async () => { };

export const fetchNotesService = async (limit = 20, cursor = null) => {
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const response = await apiClient.get('/api/notes', { params });
  return response.data;
};

export const uploadNoteService = async (noteData) => {
  const response = await apiClient.post('/api/notes/upload', noteData);
  return response.data;
};

export const incrementNoteDownloadsService = async (noteId) => {
  const response = await apiClient.put(`/api/notes/${noteId}/download`);
  return response.data;
};

export const deleteNoteService = async (noteId) => {
  console.log('[FLOW 6] deleteNoteService() | noteId:', noteId);
  const response = await apiClient.delete(`/api/notes/${noteId}`);
  return response.data;
};

