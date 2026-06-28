/**
 * ChatScreen — REST-only version
 * ─────────────────────────────────────────────
 * WebSockets removed. Messages are fetched via REST API and
 * sent via a new POST /api/chat/:chatId/messages endpoint.
 * New messages are polled every 3 seconds while the screen is mounted.
 *
 * Features removed (require WebSocket to work):
 *   - Typing indicators
 *   - "Seen" read receipts in real-time
 * These can be restored when socket.io is re-enabled.
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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { collection, query, onSnapshot, addDoc, doc, getDoc, updateDoc, serverTimestamp, increment, getDocs, writeBatch, where } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

// ── Polling interval while chat is open (ms) ─────────────────────────────────
const POLL_INTERVAL_MS = 3000;

const createStyles = (colors, shadows, isDark) => StyleSheet.create({
  mainContainer: { flex: 1 },
  appBarContainer: { ...shadows.medium, zIndex: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontWeight: '900', fontSize: 14 },

  messageList: { padding: SIZES.md, paddingBottom: SIZES.xl },

  messageRow: { marginBottom: SIZES.md, maxWidth: '80%' },
  myMessageRow: { alignSelf: 'flex-end' },
  otherMessageRow: { alignSelf: 'flex-start' },

  messageBubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, ...shadows.small },
  myBubble: { borderBottomRightRadius: 4 },
  otherBubble: { borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.borderLight },

  messageText: { fontSize: 15, lineHeight: 20 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: 'flex-end', gap: 4 },
  messageTime: { fontSize: 10 },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.md,
    marginVertical: SIZES.md,
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.medium,
  },
  attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 44,
    fontSize: 16,
    color: colors.textPrimary,
    paddingHorizontal: 8,
  },
  sendBtn: { marginLeft: 8 },
  sendBtnGradient: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.glow,
  },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SIZES.md, paddingBottom: SIZES.xl },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptySubtext: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', paddingHorizontal: 40 },

  sendingIndicator: {
    alignSelf: 'flex-end',
    paddingHorizontal: SIZES.md,
    paddingBottom: 4,
  },
  sendingText: { fontSize: 11, color: colors.textTertiary, fontStyle: 'italic' },
  typingContainer: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    alignItems: 'flex-start',
  },
  typingText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

const ChatScreen = ({ navigation, route = {} }) => {
  console.log('[ChatScreen] Render — route:', route, 'navigation:', !!navigation);
  const { colors, shadows, isDark } = useTheme();
  const routeParams = route?.params || {};
  const chat = routeParams?.chat;
  const { user } = useAuth();
  const userId = user?.id;
  const { setActiveChat, clearActiveChat } = useData();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatDocData, setChatDocData] = useState(null);
  const [recipientData, setRecipientData] = useState(null);

  const flatListRef = useRef(null);
  const pollRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

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
      collection(db, 'chats', chatId, 'messages')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = [];
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

        history.push({
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

      // Sort in-memory by createdAt ascending
      history.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB;
      });

      setMessages(history);
      setLoading(false);

      // Scroll to bottom only when new messages arrive
      const latestId = history[history.length - 1]?._id;
      if (latestId && latestId !== lastMessageIdRef.current) {
        lastMessageIdRef.current = latestId;
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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
            const batch = writeBatch(db);
            notifSnap.forEach((docSnap) => {
              batch.update(docSnap.ref, { read: true });
            });
            await batch.commit();
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

  // ── Auto Scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

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
    setMessages((prev) => [...prev, tempMsg]);
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
            // Check for existing unread chat_message notification for this chat
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
      setMessages((prev) =>
        prev.map((m) => (m._id === tempMsg._id ? { ...savedMsg } : m))
      );
    } catch (err) {
      console.error('[ChatScreen] Failed to send message:', err?.message);
      // Remove the optimistic message on failure
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
    } finally {
      setSending(false);
    }
  }, [inputText, sending, chat._id, chat.id, userId, recipient]);

  // ── Render a single message bubble ─────────────────────────────────────────
  const renderMessage = useCallback(({ item }) => {
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
            : [styles.otherBubble, { backgroundColor: colors.surface }],
        ]}>
          <Text style={[styles.messageText, { color: isMe ? '#FFF' : colors.textPrimary }]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary }]}>
              {item.status === 'sending' ? 'Sending...' : time}
            </Text>
            {isMe && item.status !== 'sending' && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.seenAt ? (
                  <Ionicons name="checkmark-done" size={12} color="#4ade80" />
                ) : item.deliveredAt ? (
                  <Ionicons name="checkmark-done" size={12} color="rgba(255,255,255,0.6)" />
                ) : (
                  <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.6)" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, [userId, colors, styles]);

  const keyExtractor = useCallback((item) => item._id || item.id, []);

  if (!chat) {
    return (
      <View style={[styles.mainContainer, { backgroundColor: isDark ? colors.background : '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={60} color={colors.textTertiary} />
        <Text style={[styles.headerTitle, { color: colors.textPrimary, marginTop: 12, fontSize: 18 }]}>Chat Not Found</Text>
        <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 8, marginBottom: 24, fontSize: 14 }}>
          This conversation is unavailable or has been closed.
        </Text>
        <TouchableOpacity 
          onPress={handleGoBack}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <SafeAreaView style={{ backgroundColor: isDark ? colors.background : '#1E3A8A' }} edges={['top']} />

      {/* App Bar */}
      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={isDark ? ['#1A1A1A', '#0D0D0D'] : ['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {recipient?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>{recipient?.name || 'UniHelp User'}</Text>
              <Text style={styles.headerSubtitle}>
                {recipientData?.isOnline ? 'Online' : 'Last seen recently'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Typing Indicator Bar */}
      {chatDocData?.typing?.[recipientId] === true && (
        <View style={[styles.typingContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EFF6FF' }]}>
          <Text style={[styles.typingText, { color: colors.primary }]}>
            {recipient?.name || 'UniHelp User'} is typing...
          </Text>
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
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Send the first message!</Text>
            </View>
          }
        />
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.input, {
              color: colors.textPrimary,
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
            }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <LinearGradient colors={['#1E3A8A', '#2563EB']} style={styles.sendBtnGradient}>
              <Ionicons name="send" size={18} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatScreen;
