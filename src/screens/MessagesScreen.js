import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const formatChatTime = (timestampStr) => {
  if (!timestampStr) return '';
  try {
    const date = new Date(timestampStr);
    const now = new Date();
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Check if within 7 days
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }
    
    // Older
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) {
    return '';
  }
};

const ConversationCard = React.memo(({
  item,
  userId,
  colors,
  styles,
  onPress
}) => {
  const recipient = item.participantIds.find((p) => p.id !== userId);
  const unreadCount = item.unreadCounts?.[userId] || 0;

  return (
    <TouchableOpacity
      style={[styles.chatItem, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {recipient?.avatar ? (
          <Image source={{ uri: recipient.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {recipient?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>
            {recipient?.name || 'UniHelp User'}
          </Text>
          <Text style={[styles.chatTime, { color: colors.textTertiary }]}>
            {item.lastMessage?.timestamp ? formatChatTime(item.lastMessage.timestamp) : ''}
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
});

const MessagesScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { user } = useAuth();
  
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const usersCacheRef = useRef({});

  // ── Listen to user's chat list in Firestore ────────────────────────────────
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log(`[MessagesScreen] Subscribing to chats for user: ${user.id}`);

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

          // Resolve participants list from cache or fetch from Firestore
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
            unreadCounts: chatData.unreadCounts || {},
          });
        }

        // Sort by lastMessage timestamp or createdAt descending
        chatsList.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });

        setChats(chatsList);
        setLoading(false);
      };

      processSnapshot();
    }, (error) => {
      console.error('[MessagesScreen] Error in chat snapshot:', error);
      setLoading(false);
    });

    return () => {
      console.log(`[MessagesScreen] Unsubscribing from chats list for user: ${user.id}`);
      unsubscribe();
    };
  }, [user?.id]);

  // ── Local filtering of chats ────────────────────────────────────────────────
  const filteredChats = useMemo(() => {
    const queryStr = searchQuery.trim().toLowerCase();
    if (!queryStr) return chats;
    return chats.filter((chat) => {
      const recipient = chat.participantIds.find((p) => p.id !== user.id);
      const matchesName = recipient?.name?.toLowerCase().includes(queryStr);
      const matchesMessage = chat.lastMessage?.text?.toLowerCase().includes(queryStr);
      return matchesName || matchesMessage;
    });
  }, [chats, searchQuery, user?.id]);

  const handleOpenChat = useCallback((chat) => {
    navigation.navigate('Chat', { chat });
  }, [navigation]);

  const renderChatItem = useCallback(({ item }) => {
    return (
      <ConversationCard
        item={item}
        userId={user.id}
        colors={colors}
        styles={styles}
        onPress={() => handleOpenChat(item)}
      />
    );
  }, [colors, user.id, handleOpenChat]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>

      <ResponsiveContainer maxWidth={700}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery.trim() ? "No matches found." : "No conversations yet."}
                </Text>
                {!searchQuery.trim() && (
                  <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                    Start chatting from Marketplace or Posts.
                  </Text>
                )}
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
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 15,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
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
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 16,
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
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 30,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default MessagesScreen;
