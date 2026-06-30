/**
 * ChatScreen — REST & Firestore Messaging Hub
 * ─────────────────────────────────────────────
 * Official University messaging interface.
 * Premium Phase 9.0 Design System Redesign.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { collection, query, onSnapshot, addDoc, doc, getDoc, updateDoc, serverTimestamp, increment, getDocs, writeBatch, where, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

// Design System
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS } from '../theme';
import { getElevation } from '../theme/elevation';

const MessageBubble = React.memo(({
  item,
  userId,
  colors,
  styles
}) => {
  const isMe = item.senderId === userId || item.senderId?._id === userId;
  const time = new Date(item.createdAt || item.timestamp).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
      <View style={[
        styles.messageBubble,
        isMe
          ? [styles.myBubble, { backgroundColor: colors.primary }]
          : [styles.otherBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
      ]}>
        <Text style={[styles.messageText, { color: isMe ? colors.textOnPrimary : colors.textPrimary }]}>
          {item.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.75)' : colors.textMuted }]}>
            {item.status === 'sending' ? 'Sending...' : time}
          </Text>
          {isMe && item.status !== 'sending' && (
            <View style={styles.receiptContainer}>
              {item.seenAt ? (
                <Ionicons name="checkmark-done" size={14} color={colors.info || '#38BDF8'} />
              ) : item.deliveredAt ? (
                <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.7)" />
              ) : (
                <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.7)" />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const ChatScreen = ({ navigation, route = {} }) => {
  console.log('[ChatScreen] Render — route:', route, 'navigation:', !!navigation);
  const { colors, isDark } = useTheme();
  const routeParams = route?.params || {};
  const chat = routeParams?.chat;
  const { user } = useAuth();
  const userId = user?.id;
  const { setActiveChat, clearActiveChat } = useData();

  const [historyMessages, setHistoryMessages] = useState([]);
  const [realtimeMessages, setRealtimeMessages] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const oldestMessageRef = useRef(null);
  const isFetchingRef = useRef(false);

  const messages = useMemo(() => {
    const merged = [...historyMessages, ...realtimeMessages];
    const seen = new Set();
    const unique = merged.filter((msg) => {
      const id = msg._id || msg.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    unique.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
    return unique;
  }, [historyMessages, realtimeMessages]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatDocData, setChatDocData] = useState(null);
  const [recipientData, setRecipientData] = useState(null);

  const flatListRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const elevation = useMemo(() => getElevation(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors, elevation, isDark), [colors, elevation, isDark]);

  const recipient = chat?.participantIds?.find(
    (p) => (p._id || p.id || p) !== userId
  );

  const recipientId = recipient?._id || recipient?.id || recipient;

  // ── Listen to parent chat document for typing indicators and other updates ──
  useEffect(() => {
    const chatId = chat?._id || chat?.id;
    if (!chatId) return;

    const chatRef = doc(db, 'chats', chatId);
    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        setChatDocData(snapshot.data());
      }
    });

    return () => unsubscribe();
  }, [chat?._id, chat?.id]);

  // ── Listen to recipient user profile for online status ──
  useEffect(() => {
    if (!recipientId) return;

    const userRef = doc(db, 'users', recipientId);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setRecipientData(snapshot.data());
      }
    });

    return () => unsubscribe();
  }, [recipientId]);

  // ── Debounced/Throttled state writer for typing ──
  const updateTypingState = useCallback(async (isTypingVal) => {
    const chatId = chat?._id || chat?.id;
    if (!chatId || !userId) return;

    if (isTypingRef.current === isTypingVal) return;
    isTypingRef.current = isTypingVal;

    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        [`typing.${userId}`]: isTypingVal
      });
    } catch (e) {
      console.warn('[ChatScreen] Error updating typing status:', e);
    }
  }, [chat?._id, chat?.id, userId]);

  const handleInputChange = useCallback((text) => {
    setInputText(text);

    if (text.trim().length > 0) {
      updateTypingState(true);

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = setTimeout(() => {
        updateTypingState(false);
      }, 3000);
    } else {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      updateTypingState(false);
    }
  }, [updateTypingState]);

  // ── Clean up typing state on unmount ──
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      const chatId = chat?._id || chat?.id;
      if (chatId && userId) {
        const chatRef = doc(db, 'chats', chatId);
        updateDoc(chatRef, {
          [`typing.${userId}`]: false
        }).catch((e) => console.warn('[ChatScreen] Cleanup typing on unmount failed:', e));
      }
    };
  }, [chat?._id, chat?.id, userId]);

  const handleGoBack = () => {
    if (navigation && typeof navigation.goBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Main');
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
      window.history.back();
    }
  };

  const loadOlderMessages = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return;
    const chatId = chat?._id || chat?.id;
    if (!chatId) return;

    isFetchingRef.current = true;
    setLoadingMore(true);

    try {
      let q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(25)
      );

      if (oldestMessageRef.current) {
        q = query(q, startAfter(oldestMessageRef.current));
      }

      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMore(false);
      } else {
        const parsed = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          let formattedDate = new Date().toISOString();
          if (data.createdAt) {
            try {
              const dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
              formattedDate = dateObj.toISOString();
            } catch (e) {}
          }

          let sentAtStr = data.sentAt || null;
          if (data.sentAt && data.sentAt.toDate) {
            try {
              sentAtStr = data.sentAt.toDate().toISOString();
            } catch (e) {}
          }
          let deliveredAtStr = data.deliveredAt || null;
          if (data.deliveredAt && data.deliveredAt.toDate) {
            try {
              deliveredAtStr = data.deliveredAt.toDate().toISOString();
            } catch (e) {}
          }
          let seenAtStr = data.seenAt || null;
          if (data.seenAt && data.seenAt.toDate) {
            try {
              seenAtStr = data.seenAt.toDate().toISOString();
            } catch (e) {}
          }

          parsed.push({
            id: docSnap.id,
            _id: docSnap.id,
            ...data,
            createdAt: formattedDate,
            timestamp: formattedDate,
            sentAt: sentAtStr,
            deliveredAt: deliveredAtStr,
            seenAt: seenAtStr,
          });
        });

        oldestMessageRef.current = snap.docs[snap.docs.length - 1];

        setHistoryMessages((prev) => {
          const merged = [...parsed, ...prev];
          const seen = new Set();
          return merged.filter((msg) => {
            const id = msg._id || msg.id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        });

        if (snap.size < 25) {
          setHasMore(false);
        }
      }
    } catch (e) {
      console.warn('[ChatScreen] Error loading older messages:', e);
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [chat?._id, chat?.id, hasMore]);

  const handleScroll = useCallback((event) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y <= 10 && !loadingMore && hasMore) {
      loadOlderMessages();
    }
  }, [loadingMore, hasMore, loadOlderMessages]);

  const renderHeaderLoader = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: SPACING.sm, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore, colors]);

  // ── Track Active Chat ID ─────────────────────────────────────────────────────
  useEffect(() => {
    const chatId = chat?._id || chat?.id;
    if (chatId) {
      setActiveChat(chatId);
    }
    return () => {
      clearActiveChat();
    };
  }, [chat?._id, chat?.id, setActiveChat, clearActiveChat]);

  // ── Listen to messages in real time via Firestore ───────────────────────────
  useEffect(() => {
    if (!chat?._id && !chat?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const chatId = chat?._id || chat?.id;
    console.log(`[ChatScreen] Subscribing to messages for chatId: ${chatId}`);

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const parsed = [];
      const batch = writeBatch(db);
      let needsCommit = false;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docRef = docSnap.ref;

        let formattedDate = new Date().toISOString();
        if (data.createdAt) {
          try {
            const dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            formattedDate = dateObj.toISOString();
          } catch (e) {}
        }

        let sentAtStr = data.sentAt || null;
        if (data.sentAt && data.sentAt.toDate) {
          try {
            sentAtStr = data.sentAt.toDate().toISOString();
          } catch (e) {}
        }
        let deliveredAtStr = data.deliveredAt || null;
        if (data.deliveredAt && data.deliveredAt.toDate) {
          try {
            deliveredAtStr = data.deliveredAt.toDate().toISOString();
          } catch (e) {}
        }
        let seenAtStr = data.seenAt || null;
        if (data.seenAt && data.seenAt.toDate) {
          try {
            seenAtStr = data.seenAt.toDate().toISOString();
          } catch (e) {}
        }

        parsed.push({
          id: docSnap.id,
          _id: docSnap.id,
          ...data,
          createdAt: formattedDate,
          timestamp: formattedDate,
          sentAt: sentAtStr,
          deliveredAt: deliveredAtStr,
          seenAt: seenAtStr,
        });

        // Update deliveredAt & seenAt if receiver is current user and values are missing
        if (data.receiverId === userId) {
          const updates = {};
          let needsUpdate = false;

          if (!data.deliveredAt) {
            updates.deliveredAt = serverTimestamp();
            needsUpdate = true;
          }
          if (!data.seenAt) {
            updates.seenAt = serverTimestamp();
            needsUpdate = true;
          }

          if (needsUpdate) {
            batch.update(docRef, updates);
            needsCommit = true;
          }
        }
      });

      if (needsCommit) {
        batch.commit().catch((e) => console.warn('[ChatScreen] Error updating message receipts:', e));
      }

      setRealtimeMessages(parsed);
      setLoading(false);

      // Set oldestMessageRef based on the first load if it's not set yet
      if (!oldestMessageRef.current && snapshot.docs.length > 0) {
        oldestMessageRef.current = snapshot.docs[snapshot.docs.length - 1];
      }

      // Reset unread count and notifications for current user
      const resetUnreadAndNotifs = async () => {
        try {
          const chatRef = doc(db, 'chats', chatId);
          const chatSnap = await getDoc(chatRef);
          if (chatSnap.exists()) {
            const currentUnread = chatSnap.data()?.unreadCounts?.[userId] || 0;
            if (currentUnread > 0) {
              await updateDoc(chatRef, {
                [`unreadCounts.${userId}`]: 0
              });
            }
          }

          // Query unread chat_message notifications for this chatId
          const notifQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('chatId', '==', chatId),
            where('type', '==', 'chat_message'),
            where('read', '==', false)
          );
          
          const notifSnap = await getDocs(notifQuery);
          if (!notifSnap.empty) {
            const b = writeBatch(db);
            notifSnap.forEach((docSnap) => {
              b.update(docSnap.ref, { read: true });
            });
            await b.commit();
            console.log(`[ChatScreen] Marked ${notifSnap.size} chat_message notifications as read.`);
          }
        } catch (err) {
          console.warn('[ChatScreen] Error resetting unread/notifications:', err);
        }
      };
      resetUnreadAndNotifs();
    }, (error) => {
      console.error('[ChatScreen] Error listening to messages:', error);
      setLoading(false);
    });

    return () => {
      console.log(`[ChatScreen] Unsubscribing from messages for chatId: ${chatId}`);
      unsubscribe();
    };
  }, [chat?._id, chat?.id, userId]);

  // ── Auto Scroll on New Messages ──────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      const latestId = latestMessage._id || latestMessage.id;
      if (latestId && latestId !== lastMessageIdRef.current) {
        lastMessageIdRef.current = latestId;
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    }
  }, [messages]);

  // ── Send message via Firestore ──────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!chat?._id && !chat?.id) return;
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    updateTypingState(false);

    const chatId = chat?._id || chat?.id;
    const recipientId = recipient?._id || recipient?.id || recipient;

    // Optimistic UI — show message immediately
    const tempMsg = {
      _id: `temp_${Date.now()}`,
      chatId: chatId,
      senderId: userId,
      receiverId: recipientId,
      text,
      status: 'sending',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      seenAt: null,
    };
    setRealtimeMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const messageData = {
        chatId: chatId,
        senderId: userId,
        receiverId: recipientId,
        text,
        createdAt: serverTimestamp(),
        sentAt: serverTimestamp(),
        deliveredAt: null,
        seenAt: null,
      };

      // Write to messages subcollection
      const docRef = await addDoc(messagesRef, messageData);
      const savedMsg = {
        id: docRef.id,
        _id: docRef.id,
        ...messageData,
        createdAt: new Date().toISOString(),
      };

      // Update parent chat document and increment recipient unread count
      const chatRef = doc(db, 'chats', chatId);
      
      const updateData = {
        lastMessage: {
          text,
          senderId: userId,
          timestamp: serverTimestamp(),
        },
        lastMessageAt: serverTimestamp(),
      };

      if (recipientId) {
        updateData[`unreadCounts.${recipientId}`] = increment(1);
      }

      await updateDoc(chatRef, updateData);

      // Create notification if the receiver is not viewing this chat
      if (recipientId) {
        try {
          const recipientDocSnap = await getDoc(doc(db, 'users', recipientId));
          const recipientActiveChatId = recipientDocSnap.exists() ? recipientDocSnap.data().activeChatId : null;
          
          if (recipientActiveChatId !== chatId) {
            const notifQuery = query(
              collection(db, 'notifications'),
              where('userId', '==', recipientId),
              where('chatId', '==', chatId),
              where('type', '==', 'chat_message'),
              where('read', '==', false)
            );
            const notifSnap = await getDocs(notifQuery);
            
            if (notifSnap.empty) {
              const senderName = user?.name || 'UniHelp User';
              const shortText = text.length > 60 ? text.substring(0, 60) + '...' : text;
              
              await addDoc(collection(db, 'notifications'), {
                userId: recipientId,
                type: 'chat_message',
                title: 'New Message',
                message: `${senderName}: ${shortText}`,
                chatId: chatId,
                senderId: userId,
                createdAt: serverTimestamp(),
                read: false
              });
              console.log(`[ChatScreen] Created chat_message notification for user: ${recipientId}`);
            } else {
              console.log('[ChatScreen] Unread chat notification already exists, skipped duplicate.');
            }
          } else {
            console.log('[ChatScreen] Recipient is currently viewing this chat, skipped notification.');
          }
        } catch (notifErr) {
          console.warn('[ChatScreen] Error creating chat notification:', notifErr);
        }
      }

      // Replace temp message with server-confirmed message
      setRealtimeMessages((prev) =>
        prev.map((m) => (m._id === tempMsg._id ? { ...savedMsg } : m))
      );
    } catch (err) {
      console.error('[ChatScreen] Failed to send message:', err?.message);
      setRealtimeMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
    } finally {
      setSending(false);
    }
  }, [inputText, sending, chat?._id, chat?.id, userId, recipient, updateTypingState, user?.name]);

  const renderMessage = useCallback(({ item }) => {
    return (
      <MessageBubble
        item={item}
        userId={userId}
        colors={colors}
        styles={styles}
      />
    );
  }, [userId, colors, styles]);

  const keyExtractor = useCallback((item) => item._id || item.id, []);

  if (!chat) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.textMuted} />
        <Text style={styles.errorTitle}>Conversation Unavailable</Text>
        <Text style={styles.errorSubtitle}>
          This chat session could not be found or has ended.
        </Text>
        <Pressable 
          onPress={handleGoBack}
          style={({ pressed }) => [styles.errorBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.errorBtnText}>Return to Messages</Text>
        </Pressable>
      </View>
    );
  }

  const isRecipientOnline = recipientData?.isOnline || false;

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />

      {/* Header */}
      <View style={styles.appBarContainer}>
        <View style={styles.header}>
          <Pressable onPress={handleGoBack} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerInfo}>
            <View style={styles.avatar}>
              {recipient?.avatar ? (
                <Image source={{ uri: recipient.avatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarText}>
                  {recipient?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle} numberOfLines={1}>{recipient?.name || 'UniHelp Student'}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: isRecipientOnline ? colors.accent : colors.textDisabled }]} />
                <Text style={styles.headerSubtitle}>
                  {isRecipientOnline ? 'Active on Campus' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Typing Indicator Bar */}
      {chatDocData?.typing?.[recipientId] === true && (
        <View style={styles.typingContainer}>
          <View style={styles.typingDotsRow}>
            <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.7 }] }} />
            <Text style={styles.typingText}>
              {recipient?.name || 'Student'} is typing...
            </Text>
          </View>
        </View>
      )}

      {/* Message List */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={[styles.listContent, messages.length === 0 && { flex: 1 }]}
          onContentSizeChange={() => {
            if (historyMessages.length === 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={renderHeaderLoader}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>Official Campus Chat</Text>
              <Text style={styles.emptySubtext}>
                Messages are encrypted end-to-end between students. Be respectful and maintain academic integrity!
              </Text>
            </View>
          }
        />
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            placeholderTextColor={colors.textDisabled}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (!inputText.trim() || sending) && styles.sendBtnDisabled,
              pressed && inputText.trim() && !sending && { opacity: 0.8 }
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Ionicons name="send" size={18} color={(!inputText.trim() || sending) ? colors.textDisabled : colors.textOnPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors, elevation, isDark) => StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBarContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 56,
    gap: SPACING.sm,
  },
  backBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.subtitle,
    color: colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  messageList: {
    padding: SPACING.md,
  },
  messageRow: {
    marginBottom: SPACING.sm,
    maxWidth: '78%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
  },
  otherMessageRow: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: RADIUS.large,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    ...elevation.xs,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    ...TYPOGRAPHY.body,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    alignSelf: 'flex-end',
    gap: 4,
  },
  messageTime: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
  },
  receiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: SIZES.layout.minTouchTarget,
    ...TYPOGRAPHY.body,
    color: colors.textPrimary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  sendBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    ...TYPOGRAPHY.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xxs,
  },
  emptySubtext: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  typingContainer: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    backgroundColor: colors.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typingText: {
    ...TYPOGRAPHY.caption,
    color: colors.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorTitle: {
    ...TYPOGRAPHY.h3,
    color: colors.textPrimary,
    marginTop: SPACING.md,
  },
  errorSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    maxWidth: 260,
  },
  errorBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.lg,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.sm,
  },
  errorBtnText: {
    ...TYPOGRAPHY.button,
    color: colors.textOnPrimary,
  },
});

export default ChatScreen;
