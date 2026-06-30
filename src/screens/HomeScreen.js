/**
 * HomeScreen – Premium University Feed
 * ─────────────────────────────────────
 * Uses DataContext for persistent posts.
 * Design System tokens for all visual styling.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { StatusBar } from 'expo-status-bar';
import AnimatedPostCard from '../components/AnimatedPostCard';
import ExpandableFAB from '../components/ExpandableFAB';

// Design System imports
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS } from '../theme';
import { getElevation } from '../theme/elevation';

const createStyles = (colors, isDark) => {
  const elevation = getElevation(isDark);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // ── App Bar ──────────────────────────────────────────────────────
    appBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      ...elevation.xs,
    },
    appBarLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoMark: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.medium,
      backgroundColor: isDark ? colors.primaryLight : colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.sm,
    },
    appName: {
      ...TYPOGRAPHY.title,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    appBarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xxs,
    },
    appBarIconBtn: {
      width: SIZES.layout.minTouchTarget,
      height: SIZES.layout.minTouchTarget,
      borderRadius: SIZES.layout.minTouchTarget / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appBarIconBtnPressed: {
      backgroundColor: colors.surfaceLight || colors.secondaryLight,
    },
    badgeDot: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#EF4444',
      borderWidth: 1.5,
      borderColor: colors.surface,
    },

    // ── Hero Header ─────────────────────────────────────────────────
    heroSection: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.lg,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    greetingLabel: {
      ...TYPOGRAPHY.caption,
      color: colors.textMuted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      fontWeight: FONT_WEIGHTS.semibold,
      marginBottom: SPACING.xxs,
    },
    heroTitle: {
      ...TYPOGRAPHY.h1,
      color: colors.textPrimary,
      marginBottom: SPACING.xxs,
    },
    heroSubtitle: {
      ...TYPOGRAPHY.bodySmall,
      color: colors.textSecondary,
      lineHeight: 20,
    },

    // ── Discover Hub / Quick Actions ────────────────────────────────
    sectionWrap: {
      marginTop: SPACING.xl,
    },
    sectionLabel: {
      ...TYPOGRAPHY.label,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    quickActionsScroll: {
      paddingHorizontal: SPACING.lg,
      gap: SPACING.xs,
    },
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.medium,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs + 2,
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.xs,
    },
    actionChipPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
    actionIconWrap: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.small,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.xs,
    },
    actionChipText: {
      ...TYPOGRAPHY.label,
      color: colors.textPrimary,
      fontWeight: FONT_WEIGHTS.semibold,
    },

    // ── Trending Cards ──────────────────────────────────────────────
    trendingTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary,
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
    },
    trendingScroll: {
      paddingHorizontal: SPACING.lg,
      gap: SPACING.md,
      paddingBottom: SPACING.sm,
    },
    trendingCard: {
      width: 280,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.large,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      ...elevation.sm,
    },
    trendingCardPressed: {
      opacity: 0.95,
    },
    trendingInner: {
      padding: SPACING.md,
    },
    trendingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    trendingAvatar: {
      width: SIZES.avatars.sm,
      height: SIZES.avatars.sm,
      borderRadius: RADIUS.small,
      backgroundColor: isDark ? colors.primaryLight : colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.xs,
    },
    trendingAvatarText: {
      ...TYPOGRAPHY.caption,
      color: isDark ? colors.primary : '#FFFFFF',
      fontWeight: FONT_WEIGHTS.bold,
    },
    trendingUser: {
      ...TYPOGRAPHY.bodySmall,
      color: colors.textPrimary,
      fontWeight: FONT_WEIGHTS.semibold,
    },
    trendingBadge: {
      ...TYPOGRAPHY.caption,
      color: colors.accent,
      fontWeight: FONT_WEIGHTS.semibold,
      fontSize: 10,
      marginTop: 1,
    },
    trendingContentTitle: {
      ...TYPOGRAPHY.subtitle,
      color: colors.textPrimary,
      marginBottom: SPACING.xxs,
    },
    trendingContentBody: {
      ...TYPOGRAPHY.bodySmall,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    trendingStats: {
      flexDirection: 'row',
      gap: SPACING.md,
      marginTop: SPACING.sm,
      paddingTop: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    trendingStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xxs,
    },
    trendingStatValue: {
      ...TYPOGRAPHY.caption,
      color: colors.textMuted,
      fontWeight: FONT_WEIGHTS.medium,
    },

    // ── Category Filter Bar ─────────────────────────────────────────
    filterBarContainer: {
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    filterScroll: {
      paddingHorizontal: SPACING.lg,
      gap: SPACING.xs,
    },
    filterPill: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.surfaceLight || colors.secondaryLight,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    filterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      ...TYPOGRAPHY.label,
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: isDark ? colors.textOnPrimary : '#FFFFFF',
    },

    // ── Feed Section Header ─────────────────────────────────────────
    feedSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
    },

    // ── Empty State ─────────────────────────────────────────────────
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.xxl,
      paddingVertical: SPACING.massive,
    },
    emptyIconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.surfaceLight || colors.secondaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    emptyTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
      textAlign: 'center',
    },
    emptySubtitle: {
      ...TYPOGRAPHY.bodySmall,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: SPACING.xl,
      lineHeight: 20,
      maxWidth: 260,
    },
    emptyButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.medium,
      minHeight: SIZES.layout.minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      ...elevation.sm,
    },
    emptyButtonPressed: {
      opacity: 0.9,
    },
    emptyButtonText: {
      ...TYPOGRAPHY.button,
      color: isDark ? colors.textOnPrimary : '#FFFFFF',
    },

    // ── Error State ─────────────────────────────────────────────────
    errorBanner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.xxl,
      paddingVertical: SPACING.massive,
    },
    errorIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.error ? `${colors.error}15` : 'rgba(239,68,68,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.error ? `${colors.error}30` : 'rgba(239,68,68,0.2)',
    },
    errorTitle: {
      ...TYPOGRAPHY.h3,
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
      textAlign: 'center',
    },
    errorSubtitle: {
      ...TYPOGRAPHY.bodySmall,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: SPACING.xl,
      maxWidth: 300,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.medium,
      minHeight: SIZES.layout.minTouchTarget,
      gap: SPACING.xs,
      ...elevation.sm,
    },
    retryButtonPressed: {
      opacity: 0.9,
    },
    retryButtonText: {
      ...TYPOGRAPHY.button,
      color: isDark ? colors.textOnPrimary : '#FFFFFF',
    },

    // ── Loading Skeletons ───────────────────────────────────────────
    skeletonWrap: {
      paddingTop: SPACING.lg,
      paddingHorizontal: SPACING.lg,
    },
    skeletonCard: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.large,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    skeletonCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceLight || colors.secondaryLight,
      marginRight: SPACING.sm,
    },
    skeletonLine: {
      height: 14,
      backgroundColor: colors.surfaceLight || colors.secondaryLight,
      borderRadius: RADIUS.small,
      marginBottom: SPACING.xs,
    },

    // ── FlatList ────────────────────────────────────────────────────
    list: {
      paddingBottom: 150,
    },
  });
};

// ── Constants defined OUTSIDE the component ───────────────────────────────────────────
// ❗  These were previously inside HomeScreen, recreated on every render.
//    Moving them here makes them true constants with stable references.
const QUICK_ACTIONS = [
  { id: 'events', title: 'Events', icon: 'calendar-outline', screen: 'Calendar', color: '#059669' },
  { id: 'polls', title: 'Polls', icon: 'bar-chart-outline', screen: 'CreatePoll', color: '#D97706' },
  { id: 'notes', title: 'Notes', icon: 'document-text-outline', screen: 'ShareNotes', color: '#0284C7' },
  { id: 'lostfound', title: 'Lost & Found', icon: 'search-outline', screen: 'LostAndFound', color: '#7C3AED' },
];

const CATEGORIES = ['All', 'Buy/Sell', 'Events', 'Polls', 'Lost & Found'];

// ── Skeleton Shimmer Component ──────────────────────────────────────────────────────
const SkeletonPulse = React.memo(({ styles: s }) => {
  const opacityAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <View style={s.skeletonWrap}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={[s.skeletonCard, { opacity: opacityAnim }]}>
          <View style={s.skeletonRow}>
            <View style={s.skeletonCircle} />
            <View style={{ flex: 1 }}>
              <View style={[s.skeletonLine, { width: '45%' }]} />
              <View style={[s.skeletonLine, { width: '30%', height: 10 }]} />
            </View>
          </View>
          <View style={[s.skeletonLine, { width: '100%' }]} />
          <View style={[s.skeletonLine, { width: '85%' }]} />
          <View style={[s.skeletonLine, { width: '100%', height: 160, marginTop: SPACING.xs }]} />
        </Animated.View>
      ))}
    </View>
  );
});

const HomeScreen = ({ navigation }) => {
  // ── Render counter — detects runaway re-renders ─────────────────────────────────
  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;
  if (renderCountRef.current <= 5 || renderCountRef.current % 20 === 0) {
    console.log(`[HomeScreen] render #${renderCountRef.current}`);
  }
  if (renderCountRef.current > 100) {
    console.error('[HomeScreen] 🚨 RENDER LOOP DETECTED — renderCount exceeded 100!');
  }

  const { colors, shadows, isDark } = useTheme();
  const {
    posts: rawPosts,
    postsLoading,
    postsError,
    items,
    toggleLike,
    toggleSave,
    votePoll,
    userId,
    refreshData,
    deletePost,
    unreadCount,
  } = useData();

  // Filter out placeholder 'Google User' posts
  const posts = useMemo(() =>
    rawPosts.filter(p => !p.username?.toLowerCase().includes('google user')),
    [rawPosts]
  );

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fadeAnim = React.useRef(new Animated.Value(0)).current;



  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshData(),
      new Promise(resolve => setTimeout(resolve, 800))
    ]);
    setRefreshing(false);
  }, [refreshData]);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Debug: trace postsLoading transitions (fires only when values genuinely change)
  React.useEffect(() => {
    if (postsLoading) {
      console.log('[HomeScreen] ⏳ postsLoading=true → skeleton visible');
    } else {
      console.log(`[HomeScreen] ✅ postsLoading=false → posts.length=${posts.length}, postsError=${postsError ?? 'none'}`);
    }
    // ⚠️ Do NOT add posts array here — it fires on every poll even when data is unchanged.
    // postsLoading and postsError are primitive/null values, safe to watch.
  }, [postsLoading, postsError]);

  // Debug: market items
  React.useEffect(() => {
    console.log(`[HomeScreen] 🛝 items.length=${items.length}`);
    // ⚠️ items is an array — only log count change, do NOT put items in deps of any
    // effect that calls setState, or it creates a loop.
  }, [items.length]);

  const handleLike = useCallback((postId) => {
    toggleLike(postId);
  }, [toggleLike]);

  const handleSave = useCallback((postId) => {
    toggleSave(postId);
  }, [toggleSave]);

  const handleComment = useCallback((post) => {
    navigation.navigate('PostDetail', { post });
  }, [navigation]);

  const handleEditPost = useCallback((post) => {
    if (post.category === 'Buy/Sell') {
      navigation.navigate('BuySell', { editItem: post });
    } else {
      navigation.navigate('CreatePost', { post });
    }
  }, [navigation]);

  const handleDeletePost = useCallback(async (postId) => {
    try {
      await deletePost(postId);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete post.');
    }
  }, [deletePost]);



  const renderItem = useCallback(
    ({ item, index }) => (
      <AnimatedPostCard
        post={item}
        onPress={handleComment}
        onLike={handleLike}
        onSave={handleSave}
        onComment={handleComment}
        onVotePoll={votePoll}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        userId={userId}
        index={index}
      />
    ),
    [handleLike, handleSave, handleComment, handleEditPost, handleDeletePost, votePoll, userId],
  );

  const keyExtractor = useCallback((item) => item.id, []);

  // ── Smart Feed Logic ──

  // Trending: top 5 posts by engagement — only recalculates when posts changes
  const trendingPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => ((b.likes ?? 0) + (b.commentsCount ?? 0)) - ((a.likes ?? 0) + (a.commentsCount ?? 0)))
      .slice(0, 5);
  }, [posts]);

  // ❗ CATEGORIES is now a module-level constant — NOT inside the component

  // Smart Filtering — recalculates only when posts or selectedCategory changes
  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'All') return posts;
    if (selectedCategory === 'Polls') return posts.filter(p => !!p.poll);
    return posts.filter(p => p.category === selectedCategory);
  }, [posts, selectedCategory]);

  // ── Time-aware greeting ──
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const ListHeader = useMemo(() => (
    <View style={{ backgroundColor: colors.background }}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.greetingLabel}>{greeting}</Text>
        <Text style={styles.heroTitle}>What's happening</Text>
        <Text style={styles.heroSubtitle}>Updates, events, and everything around you.</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionLabel}>Discover</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          {QUICK_ACTIONS.map(action => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [
                styles.actionChip,
                pressed && styles.actionChipPressed,
              ]}
              onPress={() => navigation.navigate(action.screen, {})}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon} size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.actionChipText}>{action.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Trending Section */}
      {trendingPosts.length > 0 && (
        <Animated.View style={[styles.sectionWrap, { opacity: fadeAnim }]}>
          <Text style={styles.trendingTitle}>Trending</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingScroll}
            snapToInterval={280 + SPACING.md}
            decelerationRate="fast"
          >
            {trendingPosts.map((post) => (
              <Pressable
                key={post.id}
                style={({ pressed }) => [
                  styles.trendingCard,
                  pressed && styles.trendingCardPressed,
                ]}
                onPress={() => handleComment(post)}
              >
                <View style={styles.trendingInner}>
                  <View style={styles.trendingHeader}>
                    <View style={styles.trendingAvatar}>
                      <Text style={styles.trendingAvatarText}>{post.avatar}</Text>
                    </View>
                    <View>
                      <Text style={styles.trendingUser}>{post.username}</Text>
                      <Text style={styles.trendingBadge}>Featured</Text>
                    </View>
                  </View>
                  <Text style={styles.trendingContentTitle} numberOfLines={1}>
                    {post.title || 'Community Update'}
                  </Text>
                  <Text style={styles.trendingContentBody} numberOfLines={2}>
                    {post.content}
                  </Text>
                  <View style={styles.trendingStats}>
                    <View style={styles.trendingStatItem}>
                      <Ionicons name="heart" size={SIZES.icons.xs} color={isDark ? '#F87171' : '#EF4444'} />
                      <Text style={styles.trendingStatValue}>{post.likes}</Text>
                    </View>
                    <View style={styles.trendingStatItem}>
                      <Ionicons name="chatbubble" size={SIZES.icons.xs} color={colors.textMuted} />
                      <Text style={styles.trendingStatValue}>{post.commentsCount}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Category Filter Bar */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.filterPill,
                selectedCategory === cat && styles.filterPillActive
              ]}
            >
              <Text style={[
                styles.filterText,
                selectedCategory === cat && styles.filterTextActive
              ]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Feed Section Title */}
      <View style={styles.feedSectionHeader}>
        <Text style={styles.sectionLabel}>
          {selectedCategory === 'All' ? 'Latest Activity' : `${selectedCategory}`}
        </Text>
      </View>
    </View>
  // ── ListHeader: useMemo deps ───────────────────────────────────────────────────
  // ❗ Do NOT include 'posts' here. trendingPosts is already derived from posts
  //    via its own useMemo. Adding 'posts' would cause ListHeader to rebuild on
  //    every single API poll (every 15s), hammering the JS thread.
  ), [trendingPosts, selectedCategory, styles, navigation, colors, isDark, fadeAnim, handleComment, greeting]);

  const EmptyState = useMemo(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="chatbubbles-outline" size={36} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptySubtitle}>
        Be the first to share something with the community.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.emptyButton,
          pressed && styles.emptyButtonPressed,
        ]}
        onPress={() => navigation.navigate('CreatePost', {})}
      >
        <Text style={styles.emptyButtonText}>Create Post</Text>
      </Pressable>
    </View>
  ), [colors, styles, navigation]);

  const handleFABNavigation = useCallback((screen) => {
    try {
      console.log(`[FAB] Navigating to screen: ${screen}`);
      navigation.navigate(screen, {});
    } catch (err) {
      console.error(`[FAB] Navigation to screen ${screen} failed:`, err?.message);
      Alert.alert('Navigation Error', `Could not open ${screen}. Please try again.`);
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor="transparent"
        translucent
      />

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* App Bar */}
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <View style={styles.logoMark}>
              <Ionicons name="school" size={18} color={isDark ? colors.primary : '#FFFFFF'} />
            </View>
            <Text style={styles.appName}>UniHelp</Text>
          </View>
          <View style={styles.appBarRight}>
            <Pressable
              style={({ pressed }) => [
                styles.appBarIconBtn,
                pressed && styles.appBarIconBtnPressed,
              ]}
              onPress={() => navigation.navigate('Notifications')}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={SIZES.icons.md} color={colors.textPrimary} />
              {unreadCount > 0 && <View style={styles.badgeDot} />}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.appBarIconBtn,
                pressed && styles.appBarIconBtnPressed,
              ]}
              onPress={() => handleFABNavigation('Profile')}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <Ionicons name="person-outline" size={SIZES.icons.md} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {postsLoading ? (
          <SkeletonPulse styles={styles} />
        ) : postsError ? (
          // ── Error fallback UI (replaces infinite skeleton) ──
          <View style={styles.errorBanner}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="cloud-offline-outline" size={32} color={colors.error || '#EF4444'} />
            </View>
            <Text style={styles.errorTitle}>
              {postsError.startsWith('404') ? 'Feature Offline' : 'Failed to Load Feed'}
            </Text>
            <Text style={styles.errorSubtitle}>
              {postsError.includes('NETWORK_ERROR') || postsError.includes('timeout')
                ? `The server may be waking up — this can take up to 30 seconds on free hosting.\n\nTap Retry to try again.`
                : `We encountered a problem: ${postsError}\n\nTap Retry to try again.`}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={16} color={isDark ? colors.textOnPrimary : '#FFFFFF'} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredPosts}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={EmptyState}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={10}
            removeClippedSubviews={true}
            bounces={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
        )}

        <ExpandableFAB
          onPost={() => handleFABNavigation('CreatePost')}
          onEvent={() => handleFABNavigation('Calendar')}
          onPoll={() => handleFABNavigation('CreatePoll')}
        />


      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
