/**
 * DataContext – Centralized Global State
 * ─────────────────────────────────────────────
 * Manages all app data: posts, doubts, comments, saved, notes, items.
 * Polls backend API every 15s with proper error handling so the loading
 * state is always resolved — no infinite skeleton loaders.
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
  addPost as addPostService,
  toggleLikePost,
  toggleSavePost,
  getSavedPostsService,
  votePollService,
  addCommentService,
  subscribeToComments,
  deletePostService,
  updatePostService,
  initSeedData,
  fetchNotesService,
  uploadNoteService,
  incrementNoteDownloadsService,
} from '../services/dataService';
// Chat service removed — Messages feature disabled.
import { useAuth } from './AuthContext';
import { Platform } from 'react-native';
import { uploadPDF } from '../services/storageService';


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
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);   // tracks API error message
  const [savedPosts, setSavedPosts] = useState([]);

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState(null);

  // ── Fetch saved posts from backend ──
  useEffect(() => {
    if (!userId || userId === 'local_user') {
      setSavedPosts([]);
      return;
    }

    let mounted = true;
    const fetchSaved = async () => {
      try {
        const data = await getSavedPostsService();
        if (mounted) {
          setSavedPosts(data || []);
        }
      } catch (err) {
        console.warn('[DataContext] Failed to fetch saved posts:', err?.message);
      }
    };

    fetchSaved();
    const interval = setInterval(fetchSaved, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  const fetchNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const data = await fetchNotesService();
      setNotes(data || []);
      setNotesError(null);
    } catch (e) {
      console.warn('[DataContext] fetchNotesService error:', e);
      setNotesError(e.message || 'Failed to load notes');
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Derived Category Feeds (In-memory derived from a single polling subscription)
  const doubts = useMemo(() => posts.filter((p) => p.category === 'General'), [posts]);
  const items = useMemo(() => posts.filter((p) => p.category === 'Buy/Sell'), [posts]);
  const events = useMemo(() => posts.filter((p) => p.category === 'Events'), [posts]);

  const doubtsLoading = postsLoading;
  const itemsLoading = postsLoading;
  const eventsLoading = postsLoading;


  const unsubPostsRef = useRef(null);

  const [activeUsersCount] = useState(0); // stub — requires socket presence

  const refreshData = useCallback(async () => {
    setPostsLoading(true);
    setNotesLoading(true);

    if (unsubPostsRef.current) unsubPostsRef.current();

    await initSeedData();

    unsubPostsRef.current = subscribeToPosts((data, error) => {
      setPosts(data);
      setPostsError(error || null);
      setPostsLoading(false);
    });

    try {
      const data = await fetchNotesService();
      setNotes(data || []);
      setNotesError(null);
    } catch (e) {
      console.warn('[DataContext] refresh notes error:', e);
      setNotesError(e.message || 'Failed to refresh notes');
    } finally {
      setNotesLoading(false);
    }
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
          const incomingJson = JSON.stringify(incoming.map(p => p._id || p.id));

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
    };

    init();

    return () => {
      mounted = false;
      if (unsubPostsRef.current) unsubPostsRef.current();
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
    const newPost = await addPostService(post);
    if (newPost && newPost.id) {
      setPosts(prev => [newPost, ...prev]);
    }
    return newPost?.id || newPost?._id;
  }, [user, userId]);

  const toggleLike = useCallback(async (postId) => {
    let rollbackPosts = null;

    setPosts(prevPosts => {
      rollbackPosts = prevPosts;
      return prevPosts.map(post => {
        const id = post.id || post._id;
        if (id === postId) {
          const likedBy = post.likedBy || [];
          const isLiked = likedBy.includes(userId);
          const nextLikedBy = isLiked
            ? likedBy.filter(uid => uid !== userId)
            : [...likedBy, userId];
          const nextLikes = isLiked
            ? Math.max(0, (post.likes || 0) - 1)
            : (post.likes || 0) + 1;
          return {
            ...post,
            likedBy: nextLikedBy,
            likes: nextLikes,
          };
        }
        return post;
      });
    });

    try {
      const response = await toggleLikePost(postId);
      if (response && Array.isArray(response.likedBy)) {
        setPosts(prevPosts =>
          prevPosts.map(post => {
            const id = post.id || post._id;
            if (id === postId) {
              return {
                ...post,
                likedBy: response.likedBy,
                likes: response.likes ?? post.likes,
              };
            }
            return post;
          })
        );
      }
    } catch (err) {
      console.error('[DataContext] toggleLike failed, rolling back:', err);
      if (rollbackPosts) setPosts(rollbackPosts);
    }
  }, [userId]);

  const toggleSave = useCallback(async (postId) => {
    let rollbackPosts = null;
    let rollbackSaved = null;

    // Find the target post in main feed
    const targetPost = posts.find(p => (p.id || p._id) === postId);

    setPosts(prevPosts => {
      rollbackPosts = prevPosts;
      return prevPosts.map(post => {
        const id = post.id || post._id;
        if (id === postId) {
          const savedBy = post.savedBy || [];
          const isSaved = savedBy.includes(userId);
          const nextSavedBy = isSaved
            ? savedBy.filter(uid => uid !== userId)
            : [...savedBy, userId];
          return {
            ...post,
            savedBy: nextSavedBy,
          };
        }
        return post;
      });
    });

    setSavedPosts(prevSaved => {
      rollbackSaved = prevSaved;
      const isCurrentlySaved = prevSaved.some(p => (p.id || p._id) === postId);
      
      if (isCurrentlySaved) {
        return prevSaved.filter(p => (p.id || p._id) !== postId);
      } else {
        if (targetPost) {
          const updatedPost = {
            ...targetPost,
            savedBy: [...(targetPost.savedBy || []), userId],
          };
          return [updatedPost, ...prevSaved];
        }
        return prevSaved;
      }
    });

    try {
      const response = await toggleSavePost(postId);
      if (response && Array.isArray(response.savedBy)) {
        setPosts(prevPosts =>
          prevPosts.map(post => {
            const id = post.id || post._id;
            if (id === postId) {
              return {
                ...post,
                savedBy: response.savedBy,
              };
            }
            return post;
          })
        );

        setSavedPosts(prevSaved => {
          const isSaved = response.savedBy.includes(userId);
          if (isSaved) {
            const exists = prevSaved.some(p => (p.id || p._id) === postId);
            if (exists) {
              return prevSaved.map(p => {
                if ((p.id || p._id) === postId) {
                  return { ...p, savedBy: response.savedBy };
                }
                return p;
              });
            } else if (targetPost) {
              return [{ ...targetPost, savedBy: response.savedBy }, ...prevSaved];
            }
          } else {
            return prevSaved.filter(p => (p.id || p._id) !== postId);
          }
          return prevSaved;
        });
      }
    } catch (err) {
      console.error('[DataContext] toggleSave failed, rolling back:', err);
      if (rollbackPosts) setPosts(rollbackPosts);
      if (rollbackSaved) setSavedPosts(rollbackSaved);
    }
  }, [userId, posts]);

  const deletePost = useCallback(async (postId) => {
    await deletePostService(postId);
    setPosts(prev => prev.filter(p => p.id !== postId && p._id !== postId));
  }, []);

  const updatePost = useCallback(async (postId, updates) => {
    const updatedPost = await updatePostService(postId, updates);
    if (updatedPost) {
      setPosts(prev => prev.map(p => (p.id === postId || p._id === postId) ? { ...p, ...updatedPost } : p));
    }
  }, []);

  const votePoll = useCallback(async (postId, optionIndex) => {
    let rollbackPosts = null;

    setPosts(prevPosts => {
      rollbackPosts = prevPosts;
      return prevPosts.map(post => {
        const id = post.id || post._id;
        if (id === postId && post.poll) {
          const votedBy = post.poll.votedBy || [];
          const options = post.poll.options.map((opt, idx) => {
            if (idx === optionIndex) {
              return { ...opt, votes: (opt.votes || 0) + 1 };
            }
            return opt;
          });
          return {
            ...post,
            poll: {
              ...post.poll,
              options,
              votedBy: [...votedBy, userId],
            },
          };
        }
        return post;
      });
    });

    try {
      const response = await votePollService(postId, optionIndex);
      if (response && response.poll) {
        setPosts(prevPosts =>
          prevPosts.map(post => {
            const id = post.id || post._id;
            if (id === postId) {
              return {
                ...post,
                poll: response.poll,
              };
            }
            return post;
          })
        );
      }
    } catch (err) {
      console.error('[DataContext] votePoll failed, rolling back:', err);
      if (rollbackPosts) setPosts(rollbackPosts);
    }
  }, [userId]);

  // ══════════ Comment Actions ══════════

  const addComment = useCallback(async (postId, content) => {
    const comment = {
      postId,
      content,
      username: user?.name || 'You',
      avatar: user?.name?.charAt(0)?.toUpperCase() || 'U',
      userId,
    };
    const newComment = await addCommentService(comment);
    if (newComment) {
      setPosts(prev => prev.map(p => {
        const id = p.id || p._id;
        if (id === postId) {
          return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
        }
        return p;
      }));
    }
    return newComment;
  }, [user, userId]);

  const getCommentsForPost = useCallback(
    (postId, callback) => subscribeToComments(postId, callback),
    []
  );

  // ══════════ Stub Actions (safe no-ops for removed features) ══════════

  const addDoubt = useCallback(async () => null, []);
  const upvoteDoubt = useCallback(async () => {}, []);
  const addNote = useCallback(async (title, subject, fileUri, fileName, fileSize, onProgress) => {
    // 1. Upload to Supabase Storage
    const publicUrl = await uploadPDF(userId, fileUri, fileName, fileSize, onProgress);

    // 2. Save metadata to Firestore via backend API
    const uploadedNote = await uploadNoteService({
      title,
      subject,
      fileUrl: publicUrl,
      fileName,
      fileSize,
    });

    // Update local state
    setNotes(prev => [uploadedNote, ...prev]);

    return uploadedNote.id;
  }, [userId, user]);

  const downloadNote = useCallback(async (noteId) => {
    try {
      await incrementNoteDownloadsService(noteId);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, downloads: (n.downloads || 0) + 1 } : n));
    } catch (e) {
      console.warn('[DataContext] downloadNote error:', e);
    }
  }, []);
  const addItem = useCallback(async (title, price, condition, imageUrl = null) => {
    const item = { 
      title, 
      content: `Selling ${title}`, 
      price, 
      condition, 
      category: 'Buy/Sell',
      imageUrl,
      username: user?.name || 'You',
      avatar: user?.name?.charAt(0)?.toUpperCase() || 'U',
      userId,
    };
    const newItem = await addPostService(item);
    if (newItem && newItem.id) {
      setPosts(prev => [newItem, ...prev]);
    }
    return newItem?.id || newItem?._id;
  }, [user, userId]);

  const addEvent = useCallback(async (eventData) => {
    const event = { 
      ...eventData, 
      category: 'Events',
      username: user?.name || 'You',
      avatar: user?.name?.charAt(0)?.toUpperCase() || 'U',
      userId,
    };
    const newEvent = await addPostService(event);
    if (newEvent && newEvent.id) {
      setPosts(prev => [newEvent, ...prev]);
    }
    return newEvent?.id || newEvent?._id;
  }, [user, userId]);
  const reserveItem = useCallback(async (postId) => {
    console.log("AUTH USER", user);
    
    const payload = {
      status: 'Reserved',
      reservedBy: user?.uid || user?.id || userId,
      reservedByName: user?.name || user?.displayName || 'Unknown',
      reservedByEmail: user?.email || 'Unknown'
    };
    
    console.log("RESERVE PAYLOAD", payload);
    
    const response = await updatePostService(postId, payload);
    if (response) {
      setPosts(prev => prev.map(p => (p.id === postId || p._id === postId) ? { 
        ...p, 
        ...payload
      } : p));
    }
    return response;
  }, [userId, user]);
  const markAllNotificationsRead = useCallback(async () => {}, []);

  // ══════════ Context Value ══════════

  const value = useMemo(() => ({
    posts, postsLoading, postsError, addPost, toggleLike, toggleSave, savedPosts, votePoll,
    addComment, getCommentsForPost,
    doubts, doubtsLoading, addDoubt, upvoteDoubt,
    notes, notesLoading, addNote, downloadNote,
    items, itemsLoading, addItem, reserveItem,
    events, eventsLoading, addEvent,
    userId, refreshData, activeUsersCount,
    deletePost, updatePost,
    markAllNotificationsRead,
  }), [
    // ⚠️ FREEZE FIX: setUnreadCount is stable (from useState) — not a loop risk.
    // All functions wrapped in useCallback are stable references.
    // Only state values here can trigger re-renders; keep this list minimal.
    posts, postsLoading, postsError,
    addPost, toggleLike, toggleSave, savedPosts, votePoll,
    addComment, getCommentsForPost,
    doubts, doubtsLoading,
    notes, notesLoading,
    items, itemsLoading,
    events, eventsLoading,
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
