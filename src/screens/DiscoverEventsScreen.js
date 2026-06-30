/**
 * DiscoverEventsScreen.js
 * ─────────────────────────────────────────────
 * Official University Events Portal.
 * Premium Phase 9.0 Design System Redesign.
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import AnimatedPostCard from '../components/AnimatedPostCard';
import ResponsiveContainer from '../components/ResponsiveContainer';

// Design System Tokens
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS } from '../theme';
import { getElevation } from '../theme/elevation';

const DiscoverEventsScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { 
    posts, 
    toggleLike, toggleSave, votePoll, userId 
  } = useData();

  const elevation = useMemo(() => getElevation(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors, elevation, isDark), [colors, elevation, isDark]);

  const handleLike = useCallback((postId) => toggleLike(postId), [toggleLike]);
  const handleSave = useCallback((postId) => toggleSave(postId), [toggleSave]);

  // Unified Feed: Events + Categorized Posts
  const mergedData = useMemo(() => {
    const list = [];
    posts.forEach((p) => {
      if (p.category === 'Events' || p.category === 'Calender') {
        const isScheduledEvent = !!(p.date || p.time || p.location);
        list.push({
          ...p,
          isGenericPost: !isScheduledEvent,
        });
      }
    });

    return list.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : 0;
      const dateB = b.createdAt ? new Date(b.createdAt) : 0;
      return dateB - dateA;
    });
  }, [posts]);

  const renderItem = useCallback(({ item, index }) => {
    if (item.isGenericPost) {
      return (
        <AnimatedPostCard
          post={item}
          onPress={(p) => navigation.navigate('PostDetail', { post: p })}
          onLike={handleLike}
          onSave={handleSave}
          onComment={(p) => navigation.navigate('PostDetail', { post: p })}
          onVotePoll={votePoll}
          userId={userId}
          index={index}
        />
      );
    }

    return (
      <Pressable 
        style={({ pressed }) => [
          styles.eventCard,
          pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }
        ]}
        onPress={() => navigation.navigate('PostDetail', { post: item })}
      >
        <View style={[styles.eventIconWrap, { backgroundColor: (item.color || colors.primary) + '15' }]}>
          <Ionicons name={item.icon || 'calendar'} size={24} color={item.color || colors.primary} />
        </View>
        
        <View style={styles.eventInfo}>
          <View style={styles.eventHeaderRow}>
            <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>Campus Event</Text>
            </View>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.date || 'TBA'} · {item.time || 'Time TBA'}</Text>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{item.location || 'Campus Main Hall'}</Text>
          </View>

          <View style={styles.eventFooter}>
            <Text style={styles.organizerText}>Organized by {item.authorName || 'University Club'}</Text>
            <View style={styles.rsvpPill}>
              <Text style={styles.rsvpText}>View Event</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.primary} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }, [navigation, handleLike, handleSave, votePoll, userId, styles, colors]);

  return (
    <View style={styles.screen}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />
      
      {/* Header Bar */}
      <View style={styles.appBar}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.appBarTitle}>Discover Campus Events</Text>
        <View style={{ width: SIZES.layout.minTouchTarget }} />
      </View>

      <ResponsiveContainer maxWidth={700} withCardStyle={false}>
        <FlatList 
          data={mergedData} 
          renderItem={renderItem} 
          keyExtractor={(item) => item.id} 
          contentContainerStyle={styles.list} 
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-clear-outline" size={36} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Upcoming Events</Text>
              <Text style={styles.emptySubtitle}>
                There are no public campus events scheduled at this time. Check back soon or create a post to announce an activity!
              </Text>
            </View>
          }
        />
      </ResponsiveContainer>
    </View>
  );
};

const createStyles = (colors, elevation, isDark) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  backBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  appBarTitle: {
    ...TYPOGRAPHY.title,
    color: colors.textPrimary,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.large,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
  },
  eventIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  eventTitle: {
    ...TYPOGRAPHY.subtitle,
    color: colors.textPrimary,
    flex: 1,
  },
  categoryBadge: {
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  organizerText: {
    ...TYPOGRAPHY.caption,
    color: colors.textMuted,
  },
  rsvpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rsvpText: {
    ...TYPOGRAPHY.caption,
    color: colors.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.massive,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
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

export default DiscoverEventsScreen;
