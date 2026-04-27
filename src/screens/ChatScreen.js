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
import { subscribeToMessages } from '../services/dataService';

const ChatScreen = ({ navigation, route }) => {
  const { colors, shadows, isDark } = useTheme();
  const { sendMessage, userId } = useData();
  const { chat } = route.params; // Expecting chat object
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const flatListRef = useRef(null);
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  useEffect(() => {
    const unsub = subscribeToMessages(chat.id, (msgs) => {
      setMessages(msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      setLoading(false);
    });
    return () => unsub();
  }, [chat.id]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(chat.id, text);
    
    // Optional: Simulating a response for demo purposes if it's the first message
    if (messages.length === 0) {
      setTimeout(async () => {
        // In a real app, this would come from the other user via subscription
      }, 1000);
    }
  }, [inputText, chat.id, sendMessage, messages.length]);

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === userId;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
        {!isMe && (
          <View style={styles.senderAvatar}>
            <Text style={styles.avatarText}>{item.senderName?.charAt(0) || 'U'}</Text>
          </View>
        )}
        <View style={[
          styles.bubbleContent,
          isMe ? 
            { backgroundColor: colors.primary, borderBottomRightRadius: 4 } : 
            { backgroundColor: isDark ? colors.surfaceElevated : '#FFFFFF', borderBottomLeftRadius: 4 }
        ]}>
          <Text style={[styles.messageText, isMe ? { color: '#FFF' } : { color: colors.textPrimary }]}>
            {item.text}
          </Text>
          <Text style={[styles.timestamp, isMe ? { color: 'rgba(255,255,255,0.6)' } : { color: colors.textTertiary }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(79, 157, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)' }]}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{chat.name?.charAt(0) || 'U'}</Text>
              <View style={styles.onlineBadge} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{chat.name || 'Chat'}</Text>
              <Text style={styles.headerSubtitle}>Online now</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.inputGradient}
        >
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachBtn}>
              <Ionicons name="add" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <LinearGradient
                colors={isDark ? ['#1A1A1A', '#2A2A2A'] : ['#1E3A8A', '#2563EB']}
                style={styles.sendBtnGradient}
              >
                <Ionicons name="send" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerContainer: { ...shadows.medium, zIndex: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
  },
  backBtn: { 
    width: 40, height: 40, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    alignItems: 'center', justifyContent: 'center' 
  },
  itemPreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 8,
    gap: 12,
  },
  itemIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
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

  inputGradient: { paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 0 : 20 },
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
