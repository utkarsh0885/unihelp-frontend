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
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socketService';
import { getChatMessages } from '../services/chatService';

const ChatScreen = ({ navigation, route }) => {
  const { colors, shadows, isDark } = useTheme();
  const { sendMessage } = useData();
  const { chat } = route.params;
  const { userId } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const recipient = chat.participantIds?.find(p => p._id !== userId);

  const flatListRef = useRef(null);
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  useEffect(() => {
    // Connect to socket and join room
    socketService.connect();
    socketService.joinChat(chat.id);

    // Initial message fetch
    const fetchHistory = async () => {
      try {
        const history = await getChatMessages(chat._id || chat.id);
        setMessages(history);

        // Mark as seen once history is loaded
        if (history.length > 0) {
          socketService.socket.emit('message_seen', {
            chatId: chat._id || chat.id,
            senderId: recipient?._id
          });
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();

    // Listen for new messages
    const handleNewMessage = (msg) => {
      if (msg.chatId === (chat._id || chat.id)) {
        setMessages(prev => [...prev, msg]);
        // Auto mark seen if we are in the chat
        socketService.socket.emit('message_seen', {
          chatId: chat._id || chat.id,
          senderId: recipient?._id
        });
      }
    };

    // Listen for typing status
    const handleTyping = ({ chatId, userId: typingId }) => {
      if (chatId === (chat._id || chat.id) && typingId === recipient?._id) {
        setOtherUserTyping(true);
      }
    };

    const handleStopTyping = ({ chatId, userId: typingId }) => {
      if (chatId === (chat._id || chat.id) && typingId === recipient?._id) {
        setOtherUserTyping(false);
      }
    };

    const handleMessagesSeen = ({ chatId }) => {
      if (chatId === (chat._id || chat.id)) {
        setMessages(prev => prev.map(m => m.senderId === userId ? { ...m, status: 'seen' } : m));
      }
    };

    socketService.on('message', handleNewMessage);
    socketService.on('user_typing', handleTyping);
    socketService.on('user_stop_typing', handleStopTyping);
    socketService.on('messages_marked_seen', handleMessagesSeen);

    return () => {
      socketService.leaveChat(chat._id || chat.id);
      socketService.off('message', handleNewMessage);
      socketService.off('user_typing', handleTyping);
      socketService.off('user_stop_typing', handleStopTyping);
      socketService.off('messages_marked_seen', handleMessagesSeen);
    };
  }, [chat._id, chat.id, recipient?._id, userId]);

  const handleTextChange = (text) => {
    setInputText(text);

    // Send typing event
    if (!isTyping) {
      setIsTyping(true);
      socketService.socket.emit('typing', { chatId: chat._id || chat.id, recipientId: recipient?._id });
    }

    // Debounce stop typing
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => {
      setIsTyping(false);
      socketService.socket.emit('stop_typing', { chatId: chat._id || chat.id, recipientId: recipient?._id });
    }, 2000));
  };

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');

    // Find recipient (the other participant)
    const recipientId = recipient?._id;

    socketService.sendMessage(chat._id || chat.id, text, recipientId);
  }, [inputText, chat._id, chat.id, recipient?._id, userId]);

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === userId;
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[
          styles.messageBubble,
          isMe ? [styles.myBubble, { backgroundColor: colors.primary }] : [styles.otherBubble, { backgroundColor: colors.surface }]
        ]}>
          <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : colors.textPrimary }]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary }]}>
              {new Date(item.createdAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <Ionicons
                name={item.status === 'seen' ? "checkmark-done" : "checkmark"}
                size={14}
                color={item.status === 'seen' ? "#4ade80" : "rgba(255,255,255,0.7)"}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <SafeAreaView style={{ backgroundColor: isDark ? colors.background : '#1E3A8A' }} edges={['top']} />

      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={isDark ? ['#1A1A1A', '#0D0D0D'] : ['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={[styles.avatarText, { color: '#FFF' }]}>{recipient?.name?.charAt(0) || 'U'}</Text>
              {recipient?.isOnline && <View style={styles.onlineBadge} />}
            </View>
            <View>
              <Text style={styles.headerTitle}>{recipient?.name || 'UniHelp User'}</Text>
              <Text style={styles.headerSubtitle}>{recipient?.isOnline ? 'Online now' : 'Offline'}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item._id || item.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
          {otherUserTyping && (
            <View style={styles.typingIndicator}>
              <Text style={[styles.typingText, { color: colors.textTertiary }]}>{recipient?.name || 'User'} is typing...</Text>
            </View>
          )}
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={handleTextChange}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <LinearGradient
              colors={['#1E3A8A', '#2563EB']}
              style={styles.sendBtnGradient}
            >
              <Ionicons name="send" size={18} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

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
    alignItems: 'center', justifyContent: 'center'
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  itemPrice: { fontSize: 13, fontWeight: '900', color: colors.accentGreen },
  menuBtn: { width: 32, alignItems: 'center' },

  messageList: { padding: SIZES.md, paddingBottom: SIZES.xl },
  messageRow: { marginBottom: SIZES.md, maxWidth: '80%' },
  myMessageRow: { alignSelf: 'flex-end' },
  theirMessageRow: { alignSelf: 'flex-start', flexDirection: 'row', gap: 8 },

  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { fontSize: 12, fontWeight: 'bold', color: colors.primary },

  bubble: {
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    ...shadows.small
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: colors.surfaceElevated,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#FFF' },
  theirMessageText: { color: colors.textPrimary },

  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myTimeText: { color: 'rgba(255,255,255,0.7)' },
  theirTimeText: { color: colors.textTertiary },

  inputGradient: {
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.md,
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
    ...shadows.glow
  },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    marginTop: 100, gap: 12
  },
  emptyText: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptySubtext: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', paddingHorizontal: 40 },
});

export default ChatScreen;
