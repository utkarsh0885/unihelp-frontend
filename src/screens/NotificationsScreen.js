/**
 * NotificationsScreen – Theme-Aware
 * ─────────────────────────────────────────────
 * Shows recent activity notifications.
 */

import React, { useState, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

const NotificationItem = ({ item, onRead, colors, shadows }) => {
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
          styles.card, 
          !item.read && styles.cardUnread,
          { backgroundColor: item.read ? colors.surface : colors.surfaceLight }
        ]}
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => onRead(item.id)}
      >
        <View style={[styles.iconWrap, { backgroundColor: item.color + '15' }]}>
          <Ionicons name={item.icon} size={18} color={item.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifText, !item.read && styles.notifTextBold, { color: item.read ? colors.textSecondary : colors.textPrimary }]}>
            {item.text}
          </Text>
          <Text style={styles.notifTime}>{item.time}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

const NotificationsScreen = ({ navigation }) => {
  const { colors, shadows } = useTheme();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const screenStyles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const backScale = React.useRef(new Animated.Value(1)).current;
  const markScale = React.useRef(new Animated.Value(1)).current;

  const btnPress = (scale, to) => Animated.spring(scale, { toValue: to, useNativeDriver: true, tension: 120, friction: 10 }).start();

  const handleRead = (id) => {
    markNotificationRead(id);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };


  return (
    <View style={screenStyles.screen}>
      <SafeAreaView style={{ backgroundColor: '#1E3A8A' }} edges={['top']} />
      <StatusBar style="light" />
      <View style={screenStyles.appBarContainer}>
        <LinearGradient
          colors={['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={screenStyles.header}
        >
          <Animated.View style={{ transform: [{ scale: backScale }] }}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              onPressIn={() => btnPress(backScale, 0.85)}
              onPressOut={() => btnPress(backScale, 1)}
              style={screenStyles.backBtn} 
              activeOpacity={1}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
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
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
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

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardUnread: { 
    borderColor: 'rgba(30, 58, 138, 0.15)',
    shadowOpacity: 0.15,
  },
  iconWrap: { 
    width: 44, height: 44, borderRadius: 12, 
    alignItems: 'center', justifyContent: 'center', 
    marginRight: 14 
  },
  notifContent: { flex: 1 },
  notifText: { fontSize: 15, lineHeight: 21 },
  notifTextBold: { fontWeight: '700' },
  notifTime: { fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 4, fontWeight: '600' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB', marginLeft: 12 },
});

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: {
    ...shadows.medium,
    zIndex: 10,
  },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: SIZES.md, paddingBottom: SIZES.md, paddingTop: SIZES.sm,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  markBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
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
