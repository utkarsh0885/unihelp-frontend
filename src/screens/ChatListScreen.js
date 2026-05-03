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
import { getMyChats } from '../services/chatService';
import ResponsiveContainer from '../components/ResponsiveContainer';
// ⚠️ socketService removed — chat list now refreshes via REST polling only.

const ChatListScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = useCallback(async () => {
    try {
      const data = await getMyChats();
      setChats(data);
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();

    // Poll for updated chat list every 15s (replaces socket notifications)
    // Lower frequency than message polling since list updates are less time-critical.
    const pollInterval = setInterval(() => {
      fetchChats();
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [fetchChats]);

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
            <Image source={{ uri: recipient.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
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
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
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
