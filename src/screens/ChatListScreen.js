import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const ChatListScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const usersCacheRef = React.useRef({});

  const fetchChats = useCallback(() => {
    setRefreshing(true);
    // Real-time listener keeps data in sync. Just reset refreshing state.
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  // ── Listen to chats list in real time via Firestore ────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log(`[ChatListScreen] Listening to chats list for user: ${user.id}`);
    
    const q = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const processSnapshot = async () => {
        const chatsList = [];
        const cache = usersCacheRef.current;

        for (const docSnap of snapshot.docs) {
          const chatData = docSnap.data();
          const chatId = docSnap.id;

          // Resolve participants list from cache or Firestore
          const participants = [];
          for (const pid of (chatData.participantIds || [])) {
            if (cache[pid]) {
              participants.push(cache[pid]);
            } else {
              try {
                const userDoc = await getDoc(doc(db, 'users', pid));
                const resolvedUser = {
                  _id: pid,
                  id: pid,
                  name: userDoc.exists() ? (userDoc.data().name || 'Student') : 'Student',
                  avatar: userDoc.exists() ? (userDoc.data().avatarUrl || null) : null,
                };
                cache[pid] = resolvedUser;
                participants.push(resolvedUser);
              } catch (e) {
                participants.push({ _id: pid, id: pid, name: 'Student', avatar: null });
              }
            }
          }

          let lastMessage = null;
          if (chatData.lastMessage) {
            let formattedDate = new Date().toISOString();
            if (chatData.lastMessage.timestamp) {
              try {
                const dateObj = chatData.lastMessage.timestamp.toDate 
                  ? chatData.lastMessage.timestamp.toDate() 
                  : new Date(chatData.lastMessage.timestamp);
                formattedDate = dateObj.toISOString();
              } catch (e) {}
            }
            lastMessage = {
              text: chatData.lastMessage.text || '',
              senderId: chatData.lastMessage.senderId || '',
              timestamp: formattedDate,
            };
          }

          let createdAtStr = new Date().toISOString();
          if (chatData.createdAt) {
            try {
              const dateObj = chatData.createdAt.toDate 
                ? chatData.createdAt.toDate() 
                : new Date(chatData.createdAt);
              createdAtStr = dateObj.toISOString();
            } catch (e) {}
          }

          chatsList.push({
            id: chatId,
            _id: chatId,
            participantIds: participants,
            lastMessage,
            createdAt: createdAtStr,
          });
        }

        // Sort chats by lastMessage timestamp or createdAt descending
        chatsList.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });

        setChats(chatsList);
        setLoading(false);
        setRefreshing(false);
      };

      processSnapshot();
    }, (error) => {
      console.error('[ChatListScreen] onSnapshot chats error:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => {
      console.log(`[ChatListScreen] Unsubscribing from chats list for user: ${user.id}`);
      unsubscribe();
    };
  }, [user?.id]);

  const renderChatItem = ({ item }) => {
    // Determine the recipient (other participant)
    const recipient = item.participantIds.find(p => p._id !== user.id);
    const unreadCount = item.unreadCounts?.[user.id] || 0;
    
    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('Chat', { chat: item })}
      >
        <View style={styles.avatarContainer}>
          {recipient?.avatar ? (
            <Image source={{ uri: recipient.avatar }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {recipient?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          {recipient?.isOnline && <View style={styles.onlineBadge} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>
              {recipient?.name || 'UniHelp User'}
            </Text>
            <Text style={[styles.chatTime, { color: colors.textTertiary }]}>
              {item.lastMessage?.timestamp ? new Date(item.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
          
          <View style={styles.chatFooter}>
            <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.lastMessage?.text || 'Start a conversation'}
            </Text>
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCount}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Messages</Text>
        <TouchableOpacity onPress={fetchChats}>
          <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ResponsiveContainer maxWidth={700}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={chats}
            renderItem={renderChatItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={fetchChats} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No messages yet</Text>
              </View>
            }
          />
        )}
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  chatTime: {
    fontSize: 12,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ChatListScreen;
