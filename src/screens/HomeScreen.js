/**
 * HomeScreen – Premium University Super App Feed
 * ────────────────────────────────────────────────
 * Uses DataContext for persistent posts & business logic.
 * Visual Rebuild: Mobile-First, Apple/Dribbble quality design.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  Platform,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import AnimatedPostCard from '../components/AnimatedPostCard';
import ExpandableFAB from '../components/ExpandableFAB';

// ── Constants defined OUTSIDE the component ───────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'notes', title: 'Notes', icon: 'document-text', screen: 'ShareNotes' },
  { id: 'marketplace', title: 'Marketplace', icon: 'cart', screen: 'BuySell' },
  { id: 'events', title: 'Events', icon: 'calendar', screen: 'DiscoverEvents' },
  { id: 'calendar', title: 'Calendar', icon: 'calendar-number', screen: 'Calendar' },
  { id: 'polls', title: 'Polls', icon: 'stats-chart', screen: 'CreatePoll' },
  { id: 'lostfound', title: 'Lost & Found', icon: 'search', screen: 'LostAndFound' },
  { id: 'createpost', title: 'Create Post', icon: 'add-circle', screen: 'CreatePost' },
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
          <View style={[s.skeletonLine, { width: '100%', height: 160, marginTop: 12 }]} />
        </Animated.View>
      ))}
    </View>
  );
});

const HomeScreen = ({ navigation }) => {
  // ── Render counter — detects runaway re-renders ─────────────────────────────────
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  if (renderCountRef.current <= 5 || renderCountRef.current % 20 === 0) {
    console.log(`[HomeScreen] render #${renderCountRef.current}`);
  }
  if (renderCountRef.current > 100) {
    console.error('[HomeScreen] 🚨 RENDER LOOP DETECTED — renderCount exceeded 100!');
  }

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const { colors, shadows, isDark } = useTheme();
  const { user } = useAuth();
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
    events = [],
  } = useData();

  // Filter out placeholder 'Google User' posts
  const posts = useMemo(() =>
    rawPosts.filter(p => !p.username?.toLowerCase().includes('google user')),
    [rawPosts]
  );

  const styles = useMemo(() => createStyles(colors, isDark, isDesktop), [colors, isDark, isDesktop]);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshData(),
      new Promise(resolve => setTimeout(resolve, 800))
    ]);
    setRefreshing(false);
  }, [refreshData]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (postsLoading) {
      console.log('[HomeScreen] ⏳ postsLoading=true → skeleton visible');
    } else {
      console.log(`[HomeScreen] ✅ postsLoading=false → posts.length=${posts.length}, postsError=${postsError ?? 'none'}`);
    }
  }, [postsLoading, postsError, posts.length]);

  useEffect(() => {
    console.log(`[HomeScreen] 🛝 items.length=${items.length}`);
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
  const trendingPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => ((b.likes ?? 0) + (b.commentsCount ?? 0)) - ((a.likes ?? 0) + (a.commentsCount ?? 0)))
      .slice(0, 5);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'All') return posts;
    if (selectedCategory === 'Polls') return posts.filter(p => !!p.poll);
    return posts.filter(p => p.category === selectedCategory);
  }, [posts, selectedCategory]);

  // ── Time-aware greeting ──
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  }, []);

  const handleFABNavigation = useCallback((screen) => {
    try {
      console.log(`[FAB] Navigating to screen: ${screen}`);
      navigation.navigate(screen, {});
    } catch (err) {
      console.error(`[FAB] Navigation to screen ${screen} failed:`, err?.message);
      Alert.alert('Navigation Error', `Could not open ${screen}. Please try again.`);
    }
  }, [navigation]);

  const displayName = user?.name || user?.displayName || 'Utkarsh';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const ListHeader = useMemo(() => (
    <View style={{ backgroundColor: colors.background }}>
      {/* ── QUICK ACTIONS (Circular premium icons, white background, blue icon) ── */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Explore Campus</Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionItem}
              onPress={() => navigation.navigate(action.screen, {})}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionCircle}>
                <Ionicons name={action.icon} size={24} color="#2563EB" />
              </View>
              <Text style={styles.quickActionLabel} numberOfLines={1}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── TRENDING SECTION ── */}
      {trendingPosts.length > 0 && (
        <Animated.View style={[styles.trendingSection, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>Trending Discussions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingScroll}
            snapToInterval={290 + 16}
            decelerationRate="fast"
          >
            {trendingPosts.map((post) => (
              <Pressable
                key={post.id}
                style={({ pressed }) => [
                  styles.trendingCard,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => handleComment(post)}
              >
                <View style={styles.trendingInner}>
                  <View style={styles.trendingHeader}>
                    <View style={styles.trendingAvatar}>
                      <Text style={styles.trendingAvatarText}>{post.avatar || (post.username ? post.username[0].toUpperCase() : 'U')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trendingUser} numberOfLines={1}>{post.username || 'Anonymous'}</Text>
                      <Text style={styles.trendingSubtext}>Hot Post</Text>
                    </View>
                  </View>
                  <Text style={styles.trendingContentTitle} numberOfLines={1}>
                    {post.title || 'Campus Update'}
                  </Text>
                  <Text style={styles.trendingContentBody} numberOfLines={2}>
                    {post.content}
                  </Text>
                  <View style={styles.trendingStats}>
                    <View style={styles.trendingStatItem}>
                      <Ionicons name="heart" size={14} color="#EF4444" />
                      <Text style={styles.trendingStatValue}>{post.likes || 0}</Text>
                    </View>
                    <View style={styles.trendingStatItem}>
                      <Ionicons name="chatbubble" size={14} color={colors.textSecondary} />
                      <Text style={styles.trendingStatValue}>{post.commentsCount || 0}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* ── CATEGORY FILTER BAR ── */}
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
      <View style={styles.feedHeaderRow}>
        <Text style={styles.sectionTitle}>
          {selectedCategory === 'All' ? 'Latest Activity' : `${selectedCategory} Feed`}
        </Text>
      </View>
    </View>
  ), [trendingPosts, selectedCategory, styles, navigation, colors, fadeAnim, handleComment, greeting, displayName]);

  const EmptyState = useMemo(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="chatbubbles-outline" size={40} color="#2563EB" />
      </View>
      <Text style={styles.emptyTitle}>No posts yet</Text>
      <Text style={styles.emptySubtitle}>
        Be the first campus pioneer to share notes, events, or start a discussion.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('CreatePost', {})}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Create Post</Text>
      </TouchableOpacity>
    </View>
  ), [styles, navigation]);

  const renderRightSidebar = () => (
    <View style={styles.rightSidebar}>
      {/* Upcoming Events Card */}
      <View style={styles.sidebarCard}>
        <View style={styles.sidebarHeader}>
          <Ionicons name="calendar" size={18} color="#F59E0B" />
          <Text style={styles.sidebarTitle}>Upcoming Events</Text>
        </View>

        {events && events.length > 0 ? (
          <View style={{ gap: 12 }}>
            {events.slice(0, 4).map((evt) => (
              <TouchableOpacity
                key={evt.id}
                style={styles.sidebarEventItem}
                onPress={() => handleComment(evt)}
                activeOpacity={0.7}
              >
                <Text style={styles.sidebarEventTitle} numberOfLines={1}>
                  {evt.title || evt.content || 'Campus Event'}
                </Text>
                <Text style={styles.sidebarEventMeta} numberOfLines={1}>
                  {evt.eventDate || evt.timestamp || 'Upcoming'} • {evt.username || 'Event Organizer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.sidebarEmptyState}>
            <Ionicons name="calendar-outline" size={28} color={colors.textMuted || '#9CA3AF'} style={{ marginBottom: 6 }} />
            <Text style={styles.sidebarEmptyText}>
              No upcoming events. Create one from Explore → Events.
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.sidebarActionBtn}
          onPress={() => navigation.navigate('Calendar', {})}
        >
          <Text style={styles.sidebarActionText}>View Calendar →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor="transparent"
        translucent
      />

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* ── HEADER (Minimal top row only) ── */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{avatarLetter}</Text>
            </View>
            <View>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Text style={styles.userNameText} numberOfLines={1}>{displayName}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Notifications')}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
              {unreadCount > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerProfileBtn}
              onPress={() => handleFABNavigation('Profile')}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <Ionicons name="person" size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FEED & SIDEBAR WRAPPER (Responsive desktop-centered layout) ── */}
        <View style={styles.layoutContainer}>
          <View style={styles.mainColumn}>
            {postsLoading ? (
              <SkeletonPulse styles={styles} />
            ) : postsError ? (
              <View style={styles.errorBanner}>
                <View style={styles.errorIconCircle}>
                  <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
                </View>
                <Text style={styles.errorTitle}>
                  {postsError.startsWith('404') ? 'Feature Offline' : 'Failed to Load Feed'}
                </Text>
                <Text style={styles.errorSubtitle}>
                  {postsError.includes('NETWORK_ERROR') || postsError.includes('timeout')
                    ? `The server may be waking up — this can take up to 30 seconds on free hosting.\n\nTap Retry to try again.`
                    : `We encountered a problem: ${postsError}\n\nTap Retry to try again.`}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={onRefresh}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>Retry</Text>
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
                    tintColor="#2563EB"
                    colors={['#2563EB']}
                  />
                }
              />
            )}
          </View>

          {isDesktop && renderRightSidebar()}
        </View>

        <ExpandableFAB
          onPost={() => handleFABNavigation('CreatePost')}
          onEvent={() => handleFABNavigation('Calendar')}
          onPoll={() => handleFABNavigation('CreatePoll')}
        />
      </View>
    </SafeAreaView>
  );
};

// ── Styles (Premium Mobile-First Design System) ──
const createStyles = (colors, isDark, isDesktop) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  layoutContainer: {
    flex: 1,
    flexDirection: isDesktop ? 'row' : 'column',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  mainColumn: {
    flex: 1,
    maxWidth: isDesktop ? 820 : '100%',
  },
  rightSidebar: {
    width: 340,
    marginLeft: 24,
    paddingTop: 16,
    paddingRight: 16,
  },

  // ── Header Bar (Minimal top row only) ──
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(37,99,235,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  greetingText: {
    fontSize: 11,
    color: colors.textSecondary || '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(37,99,235,0.08)',
  },
  headerProfileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(37,99,235,0.2)' : '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  // ── Quick Actions (Circular premium icons, white background, blue icon) ──
  quickActionsSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary || '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  quickActionItem: {
    width: '23%',
    alignItems: 'center',
  },
  quickActionCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.3 : 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(37, 99, 235, 0.08)',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },

  // ── Trending Section ──
  trendingSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  trendingScroll: {
    gap: 16,
    paddingBottom: 4,
  },
  trendingCard: {
    width: 290,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(37,99,235,0.08)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.25 : 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  trendingInner: {
    flex: 1,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  trendingAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  trendingUser: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  trendingSubtext: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  trendingContentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  trendingContentBody: {
    fontSize: 13,
    color: colors.textSecondary || '#6B7280',
    lineHeight: 18,
  },
  trendingStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  trendingStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingStatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary || '#6B7280',
  },

  // ── Category Filter Bar ──
  filterBarContainer: {
    marginBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(37, 99, 235, 0.1)',
  },
  filterPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary || '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  feedHeaderRow: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },

  // ── Desktop Right Sidebar Cards ──
  sidebarCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(37,99,235,0.08)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.25 : 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sidebarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sidebarText: {
    fontSize: 13,
    color: colors.textSecondary || '#6B7280',
    lineHeight: 20,
  },
  sidebarEventItem: {
    paddingVertical: 4,
  },
  sidebarEventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sidebarEventMeta: {
    fontSize: 11,
    color: colors.textSecondary || '#6B7280',
  },
  sidebarEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  sidebarEmptyText: {
    fontSize: 13,
    color: colors.textSecondary || '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  sidebarActionBtn: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  sidebarActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },

  // ── Empty & Error States ──
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary || '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  emptyButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.textSecondary || '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Skeletons ──
  skeletonWrap: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  skeletonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
    marginRight: 12,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
    borderRadius: 8,
    marginBottom: 6,
  },

  list: {
    paddingBottom: 110,
  },
});

export default HomeScreen;
