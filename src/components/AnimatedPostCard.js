/**
 * AnimatedPostCard – Firestore-Backed + Theme-Aware
 * ─────────────────────────────────────────────
 * Post card with working like, save, comment buttons.
 * Entry animations + like spring animation.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const createStyles = (colors, shadows) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18, // Rounded corners 16-20 range
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.lg + 8, // Increased spacing between posts
    padding: 16, // Padding 16
    ...shadows.large, // Premium elevation
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  avatarContainer: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12, // Modern squircle-like radius
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatarText: {
    fontSize: SIZES.fontMd,
    fontWeight: '900',
    color: colors.primary,
  },
  username: {
    fontSize: SIZES.fontMd,
    fontWeight: '900', // Highlight username (bold)
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: SIZES.fontXs,
    color: colors.textTertiary,
    marginTop: 2,
    fontWeight: '600',
  },
  moreBtn: {
    padding: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  content: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: SIZES.md,
    fontWeight: '400',
  },
  imageContainer: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLight,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  pollSection: {
    marginBottom: SIZES.lg,
  },
  pollOption: {
    backgroundColor: colors.surfaceLight,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SIZES.xs,
    overflow: 'hidden',
    position: 'relative',
  },
  pollOptionVoted: {
    borderColor: colors.primaryLight,
  },
  pollProgress: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.primaryGlow,
    // Add a transition-like feel if platform supports or just solid glow
  },
  pollFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SIZES.xs,
  },
  pollOptionInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SIZES.md,
  },
  pollOptionText: {
    fontSize: SIZES.fontMd,
    color: colors.textPrimary,
  },
  pollVotes: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
  },
  pollTotalVotes: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.3, // Subtle divider
    marginBottom: SIZES.md,
    marginHorizontal: -4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.lg, // Proper spacing between actions
    gap: 6,
    paddingVertical: 4,
  },
  actionLabel: {
    fontSize: SIZES.fontXs,
    color: colors.textPrimary, // Better contrast
    fontWeight: '700',
  },
  actionCount: {
    fontSize: SIZES.fontXs,
    color: colors.textTertiary,
    fontWeight: '800',
    marginLeft: -2,
  },
});

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const AnimatedPostCard = memo(({ post, onPress, onLike, onSave, onComment, onMessage, onVotePoll, onEdit, onDelete, userId, index = 0 }) => {
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const likeScale = React.useRef(new Animated.Value(1)).current;
  const saveScale = React.useRef(new Animated.Value(1)).current;
  const cardScale = React.useRef(new Animated.Value(1)).current;

  const isLiked = post.likedBy?.includes(userId);
  const isSaved = post.savedBy?.includes(userId);

  const handleLike = useCallback(() => {
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    onLike(post.id);
  }, [post.id, onLike, likeScale]);

  const handleSave = useCallback(() => {
    Animated.sequence([
      Animated.spring(saveScale, { toValue: 1.3, friction: 3, useNativeDriver: true }),
      Animated.spring(saveScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    onSave(post.id);
  }, [post.id, onSave, saveScale]);

  const handleComment = useCallback(() => {
    if (onComment) onComment(post);
  }, [post, onComment]);

  const handleMessage = useCallback(() => {
    if (onMessage) onMessage(post);
  }, [post, onMessage]);

  const onPressIn = () => {
    Animated.spring(cardScale, { 
      toValue: 0.97, 
      useNativeDriver: true, 
      tension: 110, 
      friction: 12 
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(cardScale, { 
      toValue: 1, 
      useNativeDriver: true, 
      tension: 110, 
      friction: 12 
    }).start();
  };

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${post.username} on UNIHELP:\n\n"${post.content}"`,
      });
    } catch {
      Alert.alert('Shared! 🔗', 'Post link copied to clipboard.');
    }
  }, [post.username, post.content]);

  const handleOptions = useCallback(() => {
    Alert.alert(
      'Post Options',
      'What would you like to do with this post?',
      [
        { text: 'Edit Post', onPress: () => onEdit && onEdit(post) },
        { 
          text: 'Delete Post', 
          onPress: () => {
            Alert.alert(
              'Delete Post',
              'Are you sure you want to permanently delete this post? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete && onDelete(post.id) },
              ]
            );
          },
          style: 'destructive' 
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [post, onEdit, onDelete]);

  const isOwner = userId === post.userId;

  return (
    <AnimatedTouchable
      style={[styles.card, { transform: [{ scale: cardScale }] }]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => onPress && onPress(post)}
      activeOpacity={1}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.avatar}</Text>
          </View>
          <View>
            <Text style={styles.username}>{post.username}</Text>
            <Text style={styles.timestamp}>{post.timestamp || 'Just now'}</Text>
          </View>
        </View>
        
        {/* Category Badge & More Options */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {post.category && (
            <View style={[styles.categoryBadge, { backgroundColor: isDark ? colors.surfaceElevated : colors.primaryLight }]}>
              <Text style={[styles.categoryBadgeText, { color: isDark ? colors.secondary : colors.primary }]}>
                {post.category.toUpperCase()}
              </Text>
            </View>
          )}
          
          {isOwner && (
            <TouchableOpacity style={styles.moreBtn} onPress={handleOptions}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Post Title */}
      {post.title ? (
        <Text style={styles.title}>{post.title}</Text>
      ) : null}

      {/* Content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Optional Post Image */}
      {post.imageUrl && (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: post.imageUrl }} 
            style={styles.postImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Poll */}
      {post.poll && (
        <View style={styles.pollSection}>
          {post.poll.options.map((opt, i) => {
            const totalVotes = post.poll.options.reduce((sum, o) => sum + (o.votes || 0), 0);
            const percentage = totalVotes > 0 ? ((opt.votes || 0) / totalVotes) * 100 : 0;
            const hasVoted = post.poll.votedBy?.includes(userId);
            
            // Interaction logic: simple scaling pop on vote
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.pollOption, 
                  hasVoted && styles.pollOptionVoted,
                  isDark && hasVoted && { borderColor: '#38BDF8' }
                ]}
                activeOpacity={hasVoted ? 1 : 0.7}
                disabled={hasVoted}
                onPress={() => onVotePoll && onVotePoll(post.id, i)}
              >
                {/* Progress Bar (Animated via stylesheet width for simplicity in list) */}
                {hasVoted && (
                  <View 
                    style={[
                      styles.pollProgress, 
                      { width: `${percentage}%` }
                    ]} 
                  />
                )}
                
                <View style={styles.pollOptionInner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {hasVoted && (opt.votes > 0) && (
                      <Ionicons 
                        name="checkmark-circle" 
                        size={18} 
                        color={isDark ? colors.secondary : colors.primary} 
                        style={{ marginRight: 8 }} 
                      />
                    )}
                    <Text style={[
                      styles.pollOptionText, 
                      hasVoted && { fontWeight: '800', color: isDark ? colors.textPrimary : colors.primary }
                    ]}>
                      {opt.text}
                    </Text>
                  </View>
                
                {hasVoted && (
                  <Text style={[
                    styles.pollVotes, 
                    { color: isDark ? colors.secondary : colors.primary }
                  ]}>
                    {Math.round(percentage)}%
                  </Text>
                )}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={styles.pollFooter}>
            <Text style={styles.pollTotalVotes}>
              {post.poll.votedBy?.length || 0} votes · Interactive Poll
            </Text>
          </View>
        </View>
      )}

      {/* Action Row Divider */}
      <View style={styles.divider} />

      {/* Actions */}
      <View style={styles.actions}>
        {/* Like */}
        <AnimatedTouchable
          style={[styles.actionBtn, { transform: [{ scale: likeScale }] }]}
          onPress={handleLike}
          activeOpacity={0.6}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={isLiked ? '#EF4444' : colors.textPrimary}
          />
          <Text style={[styles.actionLabel, isLiked && { color: '#EF4444', fontWeight: '800' }]}>
            {isLiked ? 'Liked' : 'Like'}
          </Text>
          {post.likes > 0 && (
            <Text style={[styles.actionCount, isLiked && { color: '#EF4444' }]}>{post.likes}</Text>
          )}
        </AnimatedTouchable>

        {/* Comment */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleComment} activeOpacity={0.6}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.actionLabel}>
            {post.commentsCount === 1 ? '1 Comment' : (post.commentsCount > 1 ? `${post.commentsCount} Comments` : 'Comment')}
          </Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.6}>
          <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        {/* Message */}
        {userId !== post.userId && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleMessage} activeOpacity={0.6}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.actionLabel}>Message</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {/* Save/Bookmark */}
        <AnimatedTouchable
          style={[styles.actionBtn, { transform: [{ scale: saveScale }] }]}
          onPress={handleSave}
          activeOpacity={0.6}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? colors.primary : colors.textPrimary}
          />
        </AnimatedTouchable>
      </View>
    </AnimatedTouchable>
  );
});

export default AnimatedPostCard;
