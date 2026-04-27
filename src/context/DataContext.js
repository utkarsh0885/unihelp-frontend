/**
 * DataContext – Centralized Global State
 * ─────────────────────────────────────────────
 * Manages all app data: posts, doubts, comments, saved, notes, items.
 * Subscribes to Firestore real-time updates when available,
 * falls back to AsyncStorage for offline persistence.
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
  subscribeToChats,
  addPost as addPostService,
  toggleLikePost,
  toggleSavePost,
  votePollService,
  addCommentService,
  subscribeToComments,
  deletePostService,
  updatePostService,
  initSeedData,
  subscribeToActiveUsersCount,
} from '../services/dataService';
import { getTotalUnreadCount } from '../services/chatService';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || 'local_user';

  // ── State ──
  const [posts, setPosts] = useState([]);
  const [doubts, setDoubts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [doubtsLoading, setDoubtsLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const unsubPostsRef = useRef(null);
  const unsubDoubtsRef = useRef(null);
  const unsubNotesRef = useRef(null);
  const unsubItemsRef = useRef(null);
  const unsubEventsRef = useRef(null);
  const unsubNotifsRef = useRef(null);
  const unsubChatsRef = useRef(null);
  const unsubPresenceRef = useRef(null);

  const [chats, setChats] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  const refreshData = useCallback(async () => {
    setPostsLoading(true);
    setDoubtsLoading(true);
    setNotesLoading(true);
    setItemsLoading(true);

    if (unsubPostsRef.current) unsubPostsRef.current();
    if (unsubDoubtsRef.current) unsubDoubtsRef.current();
    if (unsubNotesRef.current) unsubNotesRef.current();
    if (unsubItemsRef.current) unsubItemsRef.current();
    if (unsubEventsRef.current) unsubEventsRef.current();

    await initSeedData();

    unsubPostsRef.current = subscribeToPosts((data) => {
      setPosts(data); setPostsLoading(false);
    });

    unsubDoubtsRef.current = subscribeToDoubts((data) => {
      setDoubts(data); setDoubtsLoading(false);
    });

    unsubNotesRef.current = subscribeToNotes((data) => {
      setNotes(data); setNotesLoading(false);
    });

    unsubItemsRef.current = subscribeToItems((data) => {
      setItems(data); setItemsLoading(false);
    });

    unsubEventsRef.current = subscribeToEvents((data) => {
      setEvents(data); setEventsLoading(false);
    });
  }, [userId]);

  // ── Initialize seed data + subscribe ──
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        unsubPostsRef.current = subscribeToPosts((data) => {
          if (mounted) { setPosts(data); setPostsLoading(false); }
        });
      } catch (e) { console.warn('Posts init error:', e); }

      try {
        unsubDoubtsRef.current = subscribeToDoubts((data) => {
          if (mounted) { setDoubts(data); setDoubtsLoading(false); }
        });
      } catch (e) { console.warn('Doubts init error:', e); }

      try {
        unsubNotesRef.current = subscribeToNotes((data) => {
          if (mounted) { setNotes(data); setNotesLoading(false); }
        });
      } catch (e) { console.warn('Notes init error:', e); }

      try {
        unsubItemsRef.current = subscribeToItems((data) => {
          if (mounted) { setItems(data); setItemsLoading(false); }
        });
      } catch (e) { console.warn('Items init error:', e); }

      try {
        unsubEventsRef.current = subscribeToEvents((data) => {
          if (mounted) { setEvents(data); setEventsLoading(false); }
        });
      } catch (e) { console.warn('Events init error:', e); }

      try {
        unsubChatsRef.current = subscribeToChats((data) => {
          if (mounted) { setChats(data); }
        });
      } catch (e) { console.warn('Chats init error:', e); }

      try {
        unsubPresenceRef.current = subscribeToActiveUsersCount((count) => {
          if (mounted) { setActiveUsersCount(count); }
        });
      } catch (e) { console.warn('Presence init error:', e); }

      // Fetch initial unread count
      if (user) {
        getTotalUnreadCount().then(count => {
          if (mounted) setUnreadCount(count);
        });
      }
    };

    init();

    // Socket listener for new messages to increment unread count
    const handleNewNotification = () => {
      getTotalUnreadCount().then(count => {
        if (mounted) setUnreadCount(count);
      });
    };

    socketService.connect();
    socketService.on('notification', handleNewNotification);
    socketService.on('message', handleNewNotification);

    return () => {
      mounted = false;
      if (unsubPostsRef.current) unsubPostsRef.current();
      if (unsubDoubtsRef.current) unsubDoubtsRef.current();
      if (unsubNotesRef.current) unsubNotesRef.current();
      if (unsubItemsRef.current) unsubItemsRef.current();
      if (unsubEventsRef.current) unsubEventsRef.current();
      if (unsubChatsRef.current) unsubChatsRef.current();
      if (unsubPresenceRef.current) unsubPresenceRef.current();
      socketService.off('notification', handleNewNotification);
      socketService.off('message', handleNewNotification);
    };
  }, [user]);

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
    await toggleLikePost(postId);
  }, []);

  const toggleSave = useCallback(async (postId) => {
    await toggleSavePost(postId);
  }, []);

  const deletePost = useCallback(async (postId) => {
    await deletePostService(postId);
  }, []);

  const updatePost = useCallback(async (postId, updates) => {
    await updatePostService(postId, updates);
  }, []);

  const savedPosts = useMemo(() => posts.filter((p) => p.savedBy?.includes(userId)), [posts, userId]);

  const votePoll = useCallback(async (postId, optionIndex) => {
    await votePollService(postId, optionIndex);
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

  const getCommentsForPost = useCallback((postId, callback) => subscribeToComments(postId, callback), []);

  // ══════════ Doubt Actions ══════════

  const addDoubt = useCallback(async (question, subject) => {
    const doubt = {
      question,
      subject,
      author: user?.name || 'You',
      userId,
    };
    const id = await addDoubtService(doubt);
    return id;
  }, [user, userId]);

  const upvoteDoubt = useCallback(async (doubtId) => {
    const doubt = doubts.find(d => d.id === doubtId);
    if (!doubt) return;
    const currentlyUpvoted = doubt.upvotedBy?.includes(userId);
    await upvoteDoubtService(doubtId, userId, currentlyUpvoted);
  }, [doubts, userId]);

  // ══════════ Notes Actions ══════════

  const addNote = useCallback(async (title, subject, attachments) => {
    const note = {
      title,
      subject,
      attachments,
      author: user?.name || 'You',
      userId,
    };
    const id = await addNoteService(note);
    return id;
  }, [user, userId]);

  const downloadNote = useCallback(async (noteId) => {
    await downloadNoteService(noteId);
  }, []);

  // ══════════ Items (Buy/Sell) Actions ══════════

  const addItem = useCallback(async (title, price, condition) => {
    const item = { title, content: `Selling ${title}`, price, condition, category: 'Buy/Sell' };
    const id = await addPostService(item);
    return id;
  }, []);

  const addEvent = useCallback(async (eventData) => {
    const event = { ...eventData, category: 'Events' };
    const id = await addPostService(event);
    return id;
  }, []);

  // ══════════ Chat & Notifications Actions ══════════

  const reserveItem = useCallback(async (itemId) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    await reserveItemService(itemId, userId);
    // Real-time listener will handle the status update across all users
  }, [items, userId]);

  const getOrCreateChat = useCallback(async (sellerId, item) => {
    return await getOrCreateChatService(userId, sellerId, item);
  }, [userId]);

  const sendMessage = useCallback(async (chatId, text) => {
    const message = { senderId: userId, text };
    const id = await addMessageService(chatId, message);
    return id;
  }, [userId]);

  const markAllNotificationsRead = useCallback(async () => {
    // No-op (Notifications removed)
  }, []);

  // ══════════ Context Value ══════════

  const value = useMemo(() => {
    return {
      posts, postsLoading, addPost, toggleLike, toggleSave, savedPosts, votePoll,
      addComment, getCommentsForPost,
      doubts, doubtsLoading, addDoubt, upvoteDoubt,
      notes, notesLoading, addNote, downloadNote,
      chats, items, itemsLoading, addItem, reserveItem,
      events, eventsLoading, addEvent,
      getOrCreateChat, sendMessage,
      userId, refreshData, activeUsersCount,
      unreadCount, setUnreadCount,
      deletePost, updatePost,
    };
  }, [
    posts, postsLoading, addPost, toggleLike, toggleSave, savedPosts, votePoll,
    addComment, getCommentsForPost,
    doubts, doubtsLoading, addDoubt, upvoteDoubt,
    notes, notesLoading, addNote, downloadNote,
    chats, items, itemsLoading, addItem, reserveItem,
    events, eventsLoading, addEvent,
    userId, refreshData, activeUsersCount,
    deletePost, updatePost,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

export default DataContext;
