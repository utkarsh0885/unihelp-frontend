/**
 * NotificationsScreen – Theme-Aware
 * ─────────────────────────────────────────────
 * Shows recent activity notifications.
 */

import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

const NotificationItem = ({ item, onRead, colors, shadows }) => {
  const itemStyles = React.useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const scale = React.useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 120, friction: 10 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          itemStyles.card, 
          !item.read && itemStyles.cardUnread,
          { backgroundColor: item.read ? colors.surface : colors.surfaceSubtle }
        ]}
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => onRead(item)}
      >
        <View style={[itemStyles.iconWrap, { backgroundColor: item.color + '15' }]}>
          <Ionicons name={item.icon} size={18} color={item.color} />
        </View>
        <View style={itemStyles.notifContent}>
          <Text style={[itemStyles.notifText, !item.read && itemStyles.notifTextBold, { color: item.read ? colors.textSecondary : colors.textPrimary }]}>
            {item.text}
          </Text>
          <Text style={itemStyles.notifTime}>{item.time}</Text>
        </View>
        {!item.read && <View style={itemStyles.unreadDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

const NotificationsScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const screenStyles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const backScale = React.useRef(new Animated.Value(1)).current;
  const markScale = React.useRef(new Animated.Value(1)).current;

  const btnPress = (scale, to) => Animated.spring(scale, { toValue: to, useNativeDriver: true, tension: 120, friction: 10 }).start();

  const handleRead = async (item) => {
    markNotificationRead(item.id);

    if ((item.type === 'chat' || item.type === 'chat_message') && item.chatId) {
      try {
        const chatDocSnap = await getDoc(doc(db, 'chats', item.chatId));
        if (chatDocSnap.exists()) {
          const chatData = chatDocSnap.data();
          const pids = chatData.participantIds || [];
          
          const participants = [];
          for (const pid of pids) {
            try {
              const userDocSnap = await getDoc(doc(db, 'users', pid));
              const userData = userDocSnap.exists() ? userDocSnap.data() : {};
              participants.push({
                _id: pid,
                id: pid,
                name: userData.name || 'Student',
                avatar: userData.avatarUrl || null,
              });
            } catch (e) {
              participants.push({ _id: pid, id: pid, name: 'Student', avatar: null });
            }
          }

          const fullChat = {
            id: chatDocSnap.id,
            _id: chatDocSnap.id,
            ...chatData,
            participantIds: participants,
          };
          navigation.navigate('Chat', { chat: fullChat });
        } else {
          navigation.navigate('Chat', { chat: { id: item.chatId, _id: item.chatId } });
        }
      } catch (err) {
        console.error('[NotificationsScreen] Error fetching chat room:', err);
        navigation.navigate('Chat', { chat: { id: item.chatId, _id: item.chatId } });
      }
    } else if ((item.type === 'reserve' || item.type === 'cancel_reserve' || item.type === 'sold') && item.postId) {
      navigation.navigate('PostDetail', { post: { id: item.postId, _id: item.postId, category: 'Buy/Sell' } });
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };


  return (
    <View style={screenStyles.screen}>
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={screenStyles.appBarContainer}>
        <View style={screenStyles.header}>
          <Animated.View style={{ transform: [{ scale: backScale }] }}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              onPressIn={() => btnPress(backScale, 0.85)}
              onPressOut={() => btnPress(backScale, 1)}
              style={screenStyles.backBtn} 
              activeOpacity={1}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </Animated.View>
          <Text style={screenStyles.headerTitle}>Notifications</Text>
          <Animated.View style={{ transform: [{ scale: markScale }] }}>
            <TouchableOpacity 
              style={screenStyles.markBtn} 
              onPress={handleMarkAllRead} 
              onPressIn={() => btnPress(markScale, 0.85)}
              onPressOut={() => btnPress(markScale, 1)}
              activeOpacity={1}
            >
              <Ionicons name="checkmark-done" size={20} color={colors.primary} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
      
      <FlatList 
        data={notifications} 
        renderItem={({ item }) => (
          <NotificationItem 
            item={item} 
            onRead={handleRead} 
            colors={colors} 
            shadows={shadows} 
          />
        )}
        keyExtractor={(item) => item.id} 
        contentContainerStyle={screenStyles.list} 
        showsVerticalScrollIndicator={false}
        bounces={true}
        ListEmptyComponent={
          <View style={screenStyles.emptyContainer}>
            <View style={screenStyles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.primary} />
            </View>
            <Text style={screenStyles.emptyTitle}>You're all caught up! 🔔</Text>
            <Text style={screenStyles.emptySubtitle}>We'll notify you when something important happens on campus.</Text>
          </View>
        }
      />
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
    ...shadows,
  },
  cardUnread: { 
    borderColor: colors.primary,
  },
  iconWrap: { 
    width: 44, height: 44, borderRadius: 12, 
    alignItems: 'center', justifyContent: 'center', 
    marginRight: 14 
  },
  notifContent: { flex: 1 },
  notifText: { fontSize: 15, lineHeight: 21 },
  notifTextBold: { fontWeight: '700' },
  notifTime: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginLeft: 12 },
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: SIZES.md, height: 56,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderSubtle },
  markBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderSubtle },
  list: { padding: SIZES.md, paddingBottom: SIZES.xxxl },

  // Empty State
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.xxxl,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;
