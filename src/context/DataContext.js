/**
 * DataContext – Centralized Global State
 * ─────────────────────────────────────────────
 * Manages all app data: posts, doubts, comments, saved, notes, items,
 * events, and notifications.
 *
 * Polls backend API every 15s with proper error handling so the loading
 * state is always resolved — no infinite skeleton loaders.
 *
 * Changes from previous version:
 *  - Added notifications state + markNotificationRead/markAllNotificationsRead
 *  - Fixed refreshData() callback to match (data, error) signature
 *  - Added subscription deduplication guard in refreshData()
 *  - Added optional chaining throughout
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  subscribeToPosts,
  subscribeToDoubts,
  subscribeToNotes,
  subscribeToItems,
  subscribeToEvents,
  addPost as addPostService,
  toggleLikePost,
  toggleSavePost,
  votePollService,
  addCommentService,
  subscribeToComments,
  deletePostService,
  updatePostService,
  initSeedData,
} from '../services/dataService';
// Chat service removed — Messages feature disabled.
import { useAuth } from './AuthContext';
// ⚠️ socketService intentionally NOT imported — WebSockets removed.
// All real-time updates use REST polling intervals instead.

const DataContext = createContext(null);

// ── Render loop detector ──────────────────────────────────────────────────────
// Counts how many times DataProvider re-renders. In normal operation this
// should be small. If you see > 20 in a few seconds, there is a loop.
let _renderCount = 0;

export const DataProvider = ({ children }) => {
  _renderCount++;
  if (_renderCount <= 5 || _renderCount % 20 === 0) {
    console.log(`[DataContext] render #${_renderCount}`);
  }
  if (_renderCount > 100) {
    console.error('[DataContext] 🚨 RENDER LOOP DETECTED — renderCount exceeded 100!');
  }

  const { user } = useAuth();
  const userId = user?.id || 'local_user';

  // ── State ──
  const [posts, setPosts] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const [doubtsLoading, setDoubtsLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  const unsubPostsRef = useRef(null);
  const unsubDoubtsRef = useRef(null);
  const unsubNotesRef = useRef(null);
  const unsubItemsRef = useRef(null);
  const unsubEventsRef = useRef(null);

  const [chats] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeUsersCount] = useState(0); // stub — requires socket presence

  // ── Refresh: tears down existing subs and re-creates them ──
  // Guards against duplicate subscriptions by tearing down first.
  const refreshData = useCallback(async () => {
    setPostsLoading(true);
    setDoubtsLoading(true);
    setNotesLoading(true);
    setItemsLoading(true);
    setEventsLoading(true);

    // Tear down existing subscriptions to prevent duplicates
    if (unsubPostsRef.current) { unsubPostsRef.current(); unsubPostsRef.current = null; }
    if (unsubDoubtsRef.current) { unsubDoubtsRef.current(); unsubDoubtsRef.current = null; }
    if (unsubNotesRef.current) { unsubNotesRef.current(); unsubNotesRef.current = null; }
    if (unsubItemsRef.current) { unsubItemsRef.current(); unsubItemsRef.current = null; }
    if (unsubEventsRef.current) { unsubEventsRef.current(); unsubEventsRef.current = null; }

    await initSeedData();

    // subscribeToPosts now sends (data, error) — handle both args
    unsubPostsRef.current = subscribeToPosts((data, error) => {
      setPosts(data || []);
      setPostsError(error || null);
      setPostsLoading(false);
    });

    unsubDoubtsRef.current = subscribeToDoubts((data) => {
      setDoubts(data || []);
      setDoubtsLoading(false);
    });

    unsubNotesRef.current = subscribeToNotes((data) => {
      setNotes(data || []);
      setNotesLoading(false);
    });

    unsubItemsRef.current = subscribeToItems((data) => {
      setItems(data || []);
      setItemsLoading(false);
    });

    unsubEventsRef.current = subscribeToEvents((data) => {
      setEvents(data || []);
      setEventsLoading(false);
    });
  }, []);

  // ── Stable reference cache — prevents new array ref on every poll ──────────
  // JSON-compares incoming data with stored posts. If identical, skips setPosts
  // entirely so no re-render cascade occurs. This is the PRIMARY freeze fix.
  const postsJsonRef = useRef('');

  // ── Initialize subscriptions on mount ──
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      console.log('[DataContext] Initializing data subscriptions...');

      try {
        unsubPostsRef.current = subscribeToPosts((data, error) => {
          if (!mounted) return;

          const incoming = data || [];
          const incomingJson = JSON.stringify(incoming.map(p => p?._id || p?.id));

          console.log(`[DataContext] Posts callback → count=${incoming.length}, error=${error ?? 'none'}, changed=${incomingJson !== postsJsonRef.current}`);

          if (incomingJson !== postsJsonRef.current) {
            // Data actually changed — update state and cause a re-render
            postsJsonRef.current = incomingJson;
            setPosts(incoming);
          }
          // Always clear loading/error regardless of whether data changed
          setPostsError(error || null);
          setPostsLoading(false);
        });
      } catch (e) {
        console.warn('[DataContext] Posts subscription error:', e);
        if (mounted) { setPostsError(e?.message || 'Subscription error'); setPostsLoading(false); }
      }

      try {
        unsubDoubtsRef.current = subscribeToDoubts((data) => {
          if (mounted) { setDoubts(data || []); setDoubtsLoading(false); }
        });
      } catch (e) {
        console.warn('[DataContext] Doubts init error:', e);
        if (mounted) setDoubtsLoading(false);
      }

      try {
        unsubNotesRef.current = subscribeToNotes((data) => {
          if (mounted) { setNotes(data || []); setNotesLoading(false); }
        });
      } catch (e) {
        console.warn('[DataContext] Notes init error:', e);
        if (mounted) setNotesLoading(false);
      }

      try {
        unsubItemsRef.current = subscribeToItems((data) => {
          if (mounted) { setItems(data || []); setItemsLoading(false); }
        });
      } catch (e) {
        console.warn('[DataContext] Items init error:', e);
        if (mounted) setItemsLoading(false);
      }

      try {
        unsubEventsRef.current = subscribeToEvents((data) => {
          if (mounted) { setEvents(data || []); setEventsLoading(false); }
        });
      } catch (e) {
        console.warn('[DataContext] Events init error:', e);
        if (mounted) setEventsLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (unsubPostsRef.current) unsubPostsRef.current();
      if (unsubDoubtsRef.current) unsubDoubtsRef.current();
      if (unsubNotesRef.current) unsubNotesRef.current();
      if (unsubItemsRef.current) unsubItemsRef.current();
      if (unsubEventsRef.current) unsubEventsRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ══════════ Post Actions ══════════

  const addPost = useCallback(async (content, extras = {}) => {
    const post = {
      title: extras.title || '',
      content,
      category: extras.category || 'General',
      imageUrl: extras.imageUrl || null,
      poll: extras.poll || null,
      username: user?.name || 'You',
      avatar: user?.name?.charAt(0)?.toUpperCase() || 'U',
      userId,
    };
    const id = await addPostService(post);
    return id;
  }, [user, userId]);

  const toggleLike = useCallback(async (postId) => {
    try {
      await toggleLikePost(postId);
    } catch (e) {
      console.warn('[DataContext] toggleLike error:', e?.message);
    }
  }, []);

  const toggleSave = useCallback(async (postId) => {
    try {
      await toggleSavePost(postId);
    } catch (e) {
      console.warn('[DataContext] toggleSave error:', e?.message);
    }
  }, []);

  const deletePost = useCallback(async (postId) => {
    await deletePostService(postId);
  }, []);

  const updatePost = useCallback(async (postId, updates) => {
    await updatePostService(postId, updates);
  }, []);

  const savedPosts = useMemo(() => posts.filter((p) => p?.savedBy?.includes(userId)), [posts, userId]);

  const votePoll = useCallback(async (postId, optionIndex) => {
    try {
      await votePollService(postId, optionIndex);
    } catch (e) {
      console.warn('[DataContext] votePoll error:', e?.message);
    }
  }, []);

  // ══════════ Comment Actions ══════════

  const addComment = useCallback(async (postId, content) => {
    const comment = {
      postId,
      content,
      username: user?.name || 'You',
      avatar: user?.name?.charAt(0)?.toUpperCase() || 'U',
      userId,
    };
    const id = await addCommentService(comment);
    return id;
  }, [user, userId]);

  const getCommentsForPost = useCallback(
    (postId, callback) => subscribeToComments(postId, callback),
    []
  );

  // ══════════ Notification Actions ══════════

  const markNotificationRead = useCallback((notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Generate notifications from recent posts (synthesized from feed data)
  // In a full production system, this would come from a backend notifications endpoint
  useEffect(() => {
    if (posts.length === 0) return;
    const recentNotifs = posts.slice(0, 5).map((p, i) => ({
      id: `notif_${p?.id || p?._id || i}`,
      text: `${p?.username || 'Someone'} posted: "${(p?.title || p?.content || '').slice(0, 50)}${(p?.title || p?.content || '').length > 50 ? '...' : ''}"`,
      icon: p?.poll ? 'bar-chart-outline' : 'document-text-outline',
      color: p?.poll ? '#F59E0B' : '#2563EB',
      time: p?.createdAt ? formatTimeAgo(p.createdAt) : 'Recently',
      read: false,
      postId: p?.id || p?._id,
    }));
    setNotifications(recentNotifs);
  }, [posts.length]); // Only recalculate when post count changes

  // ══════════ Stub Actions (safe no-ops for removed features) ══════════

  const addDoubt = useCallback(async () => null, []);
  const upvoteDoubt = useCallback(async () => {}, []);
  const addNote = useCallback(async () => null, []);
  const downloadNote = useCallback(async () => {}, []);
  const addItem = useCallback(async (title, price, condition) => {
    const item = { title, content: `Selling ${title}`, price, condition, category: 'Buy/Sell' };
    return await addPostService(item);
  }, []);
  const addEvent = useCallback(async (eventData) => {
    const event = { ...eventData, category: 'Events' };
    return await addPostService(event);
  }, []);
  const reserveItem = useCallback(async () => {}, []);
  const getOrCreateChat = useCallback(async () => null, []);
  const sendMessage = useCallback(async () => null, []);

  // ══════════ Context Value ══════════

  const value = useMemo(() => ({
    posts, postsLoading, postsError, addPost, toggleLike, toggleSave, savedPosts, votePoll,
    addComment, getCommentsForPost,
    doubts, doubtsLoading, addDoubt, upvoteDoubt,
    notes, notesLoading, addNote, downloadNote,
    chats, items, itemsLoading, addItem, reserveItem,
    events, eventsLoading, addEvent,
    notifications, markNotificationRead, markAllNotificationsRead,
    getOrCreateChat, sendMessage,
    userId, refreshData, activeUsersCount,
    unreadCount, setUnreadCount,
    deletePost, updatePost,
  }), [
    posts, postsLoading, postsError,
    addPost, toggleLike, toggleSave, savedPosts, votePoll,
    addComment, getCommentsForPost,
    doubts, doubtsLoading,
    notes, notesLoading,
    chats, items, itemsLoading,
    events, eventsLoading,
    notifications, markNotificationRead, markAllNotificationsRead,
    userId, refreshData, activeUsersCount,
    unreadCount,
    deletePost, updatePost,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

// ── Helper: format a date string into "Xm ago" / "Xh ago" / "Xd ago" ──
function formatTimeAgo(dateStr) {
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

export default DataContext;
