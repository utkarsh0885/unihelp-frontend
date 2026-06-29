/**
 * MessagesScreen.js
 * ─────────────────────────────────────────────
 * Official University Messaging Hub.
 * Premium Phase 9.0 Design System Redesign.
 */

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
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

// Design System
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS } from '../theme';
import { getElevation } from '../theme/elevation';

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
  const isUnread = unreadCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chatItem,
        isUnread && styles.chatItemUnread,
        pressed && { opacity: 0.75, transform: [{ scale: 0.995 }] }
      ]}
      onPress={onPress}
    >
      <View style={styles.avatarContainer}>
        {recipient?.avatar ? (
          <Image source={{ uri: recipient.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {recipient?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        {/* Subtle Online / Status Indicator Dot */}
        <View style={styles.onlineDot} />
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, isUnread && styles.chatNameUnread]} numberOfLines={1}>
            {recipient?.name || 'UniHelp Student'}
          </Text>
          <Text style={[styles.chatTime, isUnread && styles.chatTimeUnread]}>
            {item.lastMessage?.timestamp ? formatChatTime(item.lastMessage.timestamp) : ''}
          </Text>
        </View>

        <View style={styles.chatFooter}>
          <Text
            style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.lastMessage?.text || 'Start a conversation...'}
          </Text>
          {isUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const MessagesScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const usersCacheRef = useRef({});
  const elevation = useMemo(() => getElevation(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors, elevation, isDark), [colors, elevation, isDark]);

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
  }, [colors, user.id, styles, handleOpenChat]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: SIZES.layout.minTouchTarget }} />
      </View>

      <ResponsiveContainer maxWidth={700} withCardStyle={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor={colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="chatbubbles-outline" size={36} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery.trim() ? "No matching messages" : "No conversations yet."}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery.trim()
                    ? "Try checking your spelling or searching for another student."
                    : "Start chatting with campus peers from Marketplace items or Community Posts."}
                </Text>
              </View>
            }
          />
        )}
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

const createStyles = (colors, elevation, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    color: colors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.medium,
    height: SIZES.layout.minTouchTarget + 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.xs,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: colors.textPrimary,
    paddingVertical: SPACING.sm,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  clearBtn: {
    padding: SPACING.xxs,
  },
  loaderWrap: {
    paddingTop: SPACING.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
  },
  chatItem: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.large,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.xs,
  },
  chatItemUnread: {
    backgroundColor: colors.surface,
    borderColor: colors.primary + '50',
    ...elevation.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceSubtle,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  avatarText: {
    ...TYPOGRAPHY.h3,
    color: colors.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  chatInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    ...TYPOGRAPHY.subtitle,
    color: colors.textPrimary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  chatNameUnread: {
    fontWeight: FONT_WEIGHTS.bold,
  },
  chatTime: {
    ...TYPOGRAPHY.caption,
    color: colors.textMuted,
  },
  chatTimeUnread: {
    color: colors.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  lastMessage: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  lastMessageUnread: {
    color: colors.textPrimary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textOnPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.massive,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xxs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});

export default MessagesScreen;
