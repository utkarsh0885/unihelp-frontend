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
import { getChatMessages } from '../services/chatService';
import apiClient from '../services/apiClient';

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
});

const ChatScreen = ({ navigation, route }) => {
  const { colors, shadows, isDark } = useTheme();
  const { chat } = route.params;
  const { user } = useAuth();
  const userId = user?.id;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef(null);
  const pollRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  const recipient = chat.participantIds?.find(
    (p) => (p._id || p.id || p) !== userId
  );

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (silent = false) => {
    try {
      const history = await getChatMessages(chat._id || chat.id);
      setMessages(history);

      // Scroll to bottom only when new messages arrive
      const latestId = history[history.length - 1]?._id;
      if (latestId && latestId !== lastMessageIdRef.current) {
        lastMessageIdRef.current = latestId;
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      if (!silent) {
        console.error('[ChatScreen] Failed to fetch messages:', err?.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [chat._id, chat.id]);

  // ── Mount: initial fetch + start polling ────────────────────────────────────
  useEffect(() => {
    fetchMessages(false); // initial — show loader

    // Poll for new messages while screen is open
    pollRef.current = setInterval(() => fetchMessages(true), POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // ── Send message via REST ───────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic UI — show message immediately
    const tempMsg = {
      _id: `temp_${Date.now()}`,
      chatId: chat._id || chat.id,
      senderId: userId,
      text,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await apiClient.post(`/api/chat/${chat._id || chat.id}/messages`, { text });
      const savedMsg = response.data;

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
  }, [inputText, sending, chat._id, chat.id, userId]);

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
              <Ionicons
                name={item.status === 'seen' ? 'checkmark-done' : 'checkmark'}
                size={12}
                color={item.status === 'seen' ? '#4ade80' : 'rgba(255,255,255,0.6)'}
              />
            )}
          </View>
        </View>
      </View>
    );
  }, [userId, colors, styles]);

  const keyExtractor = useCallback((item) => item._id || item.id, []);

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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
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
              <Text style={styles.headerSubtitle}>Chat</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

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
            onChangeText={setInputText}
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
