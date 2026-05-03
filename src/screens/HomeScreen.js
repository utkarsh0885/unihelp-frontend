/**
 * HomeScreen – Gradient Header + Firestore-Backed
 * ─────────────────────────────────────────────
 * Uses DataContext for persistent posts.
 * Modern gradient header with glassmorphic top bar.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { StatusBar } from 'expo-status-bar';
// import { DrawerActions } from '@react-navigation/native';
import AnimatedPostCard from '../components/AnimatedPostCard';
import ExpandableFAB from '../components/ExpandableFAB';
import { PostSkeleton } from '../components/SkeletonLoader';
import { initChat } from '../services/chatService';

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: {
    ...shadows.medium,
    zIndex: 10,
  },
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm + 4,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center' },
  miniLogo: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center', justifyContent: 'center', marginRight: SIZES.sm,
  },
  appName: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: SIZES.xs },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#1E3A8A'
  },

  headerContainer: {
    backgroundColor: colors.background,
  },
  gradientHeader: {
    paddingBottom: SIZES.md + 8,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingTop: SIZES.xs,
  },
  heroBlock: { paddingHorizontal: SIZES.md },
  greetingPill: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: SIZES.radiusFull, paddingHorizontal: 10, paddingVertical: 3, marginBottom: SIZES.sm,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  greetingPillText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', lineHeight: 32, letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4, fontWeight: '500', lineHeight: 18 },

  sectionWrap: { marginTop: SIZES.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIZES.md, marginBottom: SIZES.xs },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1.2, paddingHorizontal: SIZES.md, marginBottom: SIZES.sm },
  seeAllText: { fontSize: 13, fontWeight: '800', color: colors.primary, marginRight: SIZES.md },

  // Trending Reel Styles
  trendingTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, paddingHorizontal: SIZES.md, marginBottom: SIZES.md },
  trendingContainer: { paddingHorizontal: SIZES.md, gap: SIZES.md, paddingBottom: SIZES.md },
  trendingCard: {
    width: 280,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.large,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendingGradient: { padding: 16, height: 160, justifyContent: 'space-between' },
  trendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trendingAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  trendingAvatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  trendingUser: { color: colors.textPrimary, fontWeight: '800', fontSize: 14 },
  trendingBadge: { color: colors.secondary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  trendingTitleText: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', marginTop: 8, letterSpacing: -0.2 },
  trendingContent: { color: colors.textSecondary, fontSize: 14, fontWeight: '500', lineHeight: 20, marginTop: 4 },
  trendingStats: { flexDirection: 'row', gap: 12, marginTop: 8 },
  trendingStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendingStatValue: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },

  // Filter Bar Styles
  filterBarContainer: { marginTop: SIZES.lg, marginBottom: SIZES.sm },
  filterScroll: { paddingHorizontal: SIZES.md, gap: 8 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  filterTextActive: { color: '#FFFFFF' },

  quickActionsScroll: { paddingHorizontal: SIZES.md, gap: 10 },

  // Empty State Styles
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    width: 180,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.medium,
  },
  emptyButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },

  actionChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.small,
  },
  actionIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  actionChipText: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },

  featuredCard: {
    marginHorizontal: SIZES.md,
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.large,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  featuredGradient: { padding: 20, minHeight: 160, justifyContent: 'center', position: 'relative' },
  featuredGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
  },
  featuredContentContainer: { zIndex: 2 },
  featuredHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.md },
  featuredAvatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: SIZES.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  featuredAvatarText: { color: '#FFF', fontWeight: '900', fontSize: 18 },
  featuredName: { color: '#FFF', fontWeight: '900', fontSize: 17 },
  hotBadge: {
    backgroundColor: '#0D9488', // Teal 600
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  hotBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  featuredContent: { color: 'rgba(255,255,255,0.9)', fontSize: 17, fontWeight: '700', lineHeight: 24 },
  featuredFooter: { flexDirection: 'row', gap: 16, marginTop: SIZES.md },
  featuredStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredStatText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },
  list: { paddingBottom: 150 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loaderText: { fontSize: SIZES.fontMd, color: colors.textTertiary, marginTop: SIZES.md, fontWeight: '600' },

  // Error banner styles
  errorBanner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  errorTitle: {
    fontSize: 18, fontWeight: '900', color: colors.textPrimary,
    marginBottom: 8, textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13, color: colors.textTertiary,
    textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },
  errorRetryBtn: {
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  errorRetryText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});

// ── Constants defined OUTSIDE the component ───────────────────────────────────────────
// ❗  These were previously inside HomeScreen, recreated on every render.
//    Moving them here makes them true constants with stable references.
const QUICK_ACTIONS = [
  { id: 'events', title: 'Events', icon: 'calendar-outline', screen: 'Calendar', color: '#10B981' },
  { id: 'polls', title: 'Polls', icon: 'bar-chart-outline', screen: 'CreatePoll', color: '#F59E0B' },
  { id: 'notes', title: 'Notes', icon: 'document-text-outline', screen: 'ShareNotes', color: '#06B6D4' },
  { id: 'lostfound', title: 'Lost & Found', icon: 'search-outline', screen: 'LostAndFound', color: '#8B5CF6' },
];

const CATEGORIES = ['All', 'Buy/Sell', 'Events', 'Polls', 'Lost & Found'];

const ActionChip = ({ action, navigation, colors, styles }) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, tension: 120, friction: 10 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate(action.screen)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: action.color }]}>
          <Ionicons name={action.icon} size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.actionChipText}>{action.title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedIconButton = ({ icon, onPress, badge = false, styles }) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.85, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <Ionicons name={icon} size={20} color="#FFFFFF" />
        {badge && <View style={styles.notificationBadge} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

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
    deletePost
  } = useData();

  // Filter out placeholder 'Google User' posts
  const posts = useMemo(() =>
    rawPosts.filter(p => !p.username?.toLowerCase().includes('google user')),
    [rawPosts]
  );

  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows, isDark]);

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
    navigation.navigate('CreatePost', { post });
  }, [navigation]);

  const handleDeletePost = useCallback(async (postId) => {
    try {
      await deletePost(postId);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete post.');
    }
  }, [deletePost]);

  const handleMessage = useCallback(async (post) => {
    try {
      const chat = await initChat(post.author || post.userId, post.authorName || post.username, post);
      navigation.navigate('Chat', { chat });
    } catch (err) {
      Alert.alert('Error', 'Could not start chat');
    }
  }, [navigation]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <AnimatedPostCard
        post={item}
        onPress={handleComment}
        onLike={handleLike}
        onSave={handleSave}
        onComment={handleComment}
        onMessage={handleMessage}
        onVotePoll={votePoll}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        userId={userId}
        index={index}
      />
    ),
    [handleLike, handleSave, handleComment, handleEditPost, handleDeletePost, handleMessage, votePoll, userId],
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

  const ListHeader = useMemo(() => (
    <View style={{ backgroundColor: colors.background }}>
      {/* Premium Hero Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={isDark ? ['#1A1A1A', '#0D0D0D'] : ['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.heroBlock}>
            <View style={[styles.greetingPill, { backgroundColor: isDark ? 'rgba(79, 157, 255, 0.15)' : 'rgba(255, 255, 255, 0.12)' }]}>
              <Text style={styles.greetingPillText}>Campus Community</Text>
            </View>
            <Text style={styles.heroTitle}>Catch what’s new</Text>
            <Text style={styles.heroSub}>Updates, events, and everything around you.</Text>
          </View>
        </LinearGradient>
      </View>



      {/* Modernized Quick Actions */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionLabel}>Discover Hub</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          {QUICK_ACTIONS.map(action => (
            <ActionChip
              key={action.id}
              action={action}
              navigation={navigation}
              colors={colors}
              styles={styles}
            />
          ))}
        </ScrollView>
      </View>

      {trendingPosts.length > 0 && (
        <Animated.View style={[styles.sectionWrap, { opacity: fadeAnim }]}>
          <Text style={styles.trendingTitle}>Trending Today</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingContainer}
            snapToInterval={280 + SIZES.md}
            decelerationRate="fast"
          >
            {trendingPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={[styles.trendingCard, { backgroundColor: colors.surface }]}
                onPress={() => handleComment(post)}
                activeOpacity={0.9}
              >
                <View style={styles.trendingGradient}>
                  <View style={styles.featuredGlassOverlay} />
                  <View style={styles.trendingHeader}>
                    <View style={styles.trendingAvatar}>
                      <Text style={styles.trendingAvatarText}>{post.avatar}</Text>
                    </View>
                    <View>
                      <Text style={styles.trendingUser}>{post.username}</Text>
                      <View style={styles.hotBadge}>
                        <Text style={styles.hotBadgeText}>FEATURED</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.trendingTitleText} numberOfLines={1}>{post.title || 'Community Update'}</Text>
                  <Text style={styles.trendingContent} numberOfLines={2}>
                    {post.content}
                  </Text>
                  <View style={styles.trendingStats}>
                    <View style={styles.trendingStatItem}>
                      <Ionicons name="heart" size={12} color="#F87171" />
                      <Text style={styles.trendingStatValue}>{post.likes}</Text>
                    </View>
                    <View style={styles.trendingStatItem}>
                      <Ionicons name="chatbubble" size={12} color="#38BDF8" />
                      <Text style={styles.trendingStatValue}>{post.commentsCount}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
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
            <TouchableOpacity
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
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Feed Section Title */}
      <View style={[styles.sectionHeader, { marginTop: SIZES.md }]}>
        <Text style={styles.sectionLabel}>{selectedCategory === 'All' ? 'Latest Activity' : `${selectedCategory} FEED`}</Text>
      </View>
    </View>
  // ── ListHeader: useMemo deps ───────────────────────────────────────────────────
  // ❗ Do NOT include 'posts' here. trendingPosts is already derived from posts
  //    via its own useMemo. Adding 'posts' would cause ListHeader to rebuild on
  //    every single API poll (every 15s), hammering the JS thread.
  ), [trendingPosts, selectedCategory, styles, navigation, colors, isDark, fadeAnim, handleComment]);

  const EmptyState = useMemo(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="rocket-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No posts yet 🚀</Text>
      <Text style={styles.emptySubtitle}>Be the first to post!</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <LinearGradient
          colors={['#1E3A8A', '#2563EB']}
          style={styles.emptyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.emptyButtonText}>Create Post</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  ), [colors, styles, navigation]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: isDark ? colors.background : '#1E3A8A' }]} edges={['top']}>
      <StatusBar
        style="light"
        backgroundColor="transparent"
        translucent
      />

      {/* Container to enforce dark background for everything below the header */}
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Glassmorphic App Bar */}
        <View style={styles.appBarContainer}>
          <LinearGradient
            colors={isDark ? ['#1A1A1A', '#0D0D0D'] : ['#1E3A8A', '#2563EB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.appBar}
          >
            <View style={styles.topBarLeft}>
              <View style={styles.miniLogo}>
                <Ionicons name="school" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.appName}>UniHelp</Text>
            </View>
            <View style={styles.topBarRight}>
              <AnimatedIconButton
                icon="person-outline"
                onPress={() => navigation.navigate('Profile')}
                styles={styles}
              />
            </View>
          </LinearGradient>
        </View>

        {postsLoading ? (
          <View style={{ paddingTop: 20 }}>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </View>
        ) : postsError ? (
          // ── Error fallback UI (replaces infinite skeleton) ──
          <View style={styles.errorBanner}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="cloud-offline-outline" size={36} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Failed to load posts</Text>
            <Text style={styles.errorSubtitle}>
              {postsError}{`\n\nCheck your internet connection or try again.`}
            </Text>
            <TouchableOpacity
              style={styles.errorRetryBtn}
              onPress={onRefresh}
            >
              <Text style={styles.errorRetryText}>Retry</Text>
            </TouchableOpacity>
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
          onPost={() => navigation.navigate('CreatePost')}
          onEvent={() => navigation.navigate('Calendar')}
          onPoll={() => navigation.navigate('CreatePoll')}
        />


      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
