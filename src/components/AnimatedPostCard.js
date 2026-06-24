/**
 * AnimatedPostCard – Firestore-Backed + Theme-Aware
 * ─────────────────────────────────────────────
 * Post card with working like, save, comment buttons.
 * Entry animations + like spring animation.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Animated,
  Image,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useNavigation } from '@react-navigation/native';
import { initChat } from '../services/chatService';

const formatPrice = (price) => {
  if (price === undefined || price === null || price === '') return '₹0';
  const cleaned = String(price).replace(/[$₹\s]/g, '');
  return `₹${cleaned}`;
};

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
  marketDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SIZES.md,
  },
  marketPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accentGreen || '#34D399',
  },
  marketConditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  marketConditionText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  marketStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  marketStatusText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  webModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    borderRadius: 18,
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
  marketActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: SIZES.md,
    marginBottom: SIZES.md,
    width: '100%',
    maxWidth: 320,
  },
  marketActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  marketReserveBtn: {
    backgroundColor: (colors.accentAmber || '#FBBF24') + '10',
    borderColor: (colors.accentAmber || '#FBBF24') + '35',
  },
  marketChatBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  marketEditBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary + '30',
  },
  marketDeleteBtn: {
    backgroundColor: (colors.error || colors.accent || '#FF4B4B') + '15',
    borderColor: (colors.error || colors.accent || '#FF4B4B') + '30',
  },
  marketSoldBtn: {
    backgroundColor: (colors.accentGreen || '#34D399') + '15',
    borderColor: (colors.accentGreen || '#34D399') + '30',
  },
  marketDisabledBtn: {
    opacity: 0.6,
    backgroundColor: colors.surfaceLight,
    borderColor: colors.borderLight,
  },
  marketLoadingBtn: {
    opacity: 0.8,
  },
  marketChatText: {
    color: '#FFF',
  },
  marketActionText: {
    fontSize: 13,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
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
  menuOverlay: {
    position: 'absolute',
    top: -2000,
    bottom: -2000,
    left: -2000,
    right: -2000,
    backgroundColor: 'transparent',
    zIndex: 9998,
  },
  floatingMenu: {
    position: 'absolute',
    top: 45,
    right: 16,
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  floatingMenuBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteMenuBtnBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    borderRadius: 0,
    marginTop: 4,
    paddingTop: 10,
  },
  cancelMenuBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
});

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const AnimatedPostCard = memo(({ post, onPress, onLike, onSave, onComment, onVotePoll, onEdit, onDelete, userId, index = 0 }) => {
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const navigation = useNavigation();
  const { reserveItem, deletePost, updatePost, userId: contextUserId } = useData();
  const activeUserId = userId || contextUserId;

  const [reserving, setReserving] = useState(false);

  const getConditionColor = (cond) => {
    switch (cond) {
      case 'New': return colors.accentGreen || '#34D399';
      case 'Like New': return colors.accentCyan || '#22D3EE';
      case 'Good': return colors.accentAmber || '#FBBF24';
      case 'Used': return colors.textSecondary || '#A1A1AA';
      default: return colors.textSecondary || '#A1A1AA';
    }
  };

  const getStatusColor = (stat) => {
    switch (stat) {
      case 'Available': return colors.accentGreen || '#34D399';
      case 'Reserved': return colors.accentAmber || '#FBBF24';
      case 'Sold': return colors.accent || '#4F9DFF';
      default: return colors.accentGreen || '#34D399';
    }
  };

  const likeScale = React.useRef(new Animated.Value(1)).current;
  const saveScale = React.useRef(new Animated.Value(1)).current;
  const cardScale = React.useRef(new Animated.Value(1)).current;

  const isLiked = post.likedBy?.includes(activeUserId);
  const isSaved = post.savedBy?.includes(activeUserId);

  // Click locks to prevent double-click spam
  const lastLikeClick = React.useRef(0);
  const lastSaveClick = React.useRef(0);

  // Hover states for premium web interaction
  const [likeHovered, setLikeHovered] = React.useState(false);
  const [commentHovered, setCommentHovered] = React.useState(false);
  const [shareHovered, setShareHovered] = React.useState(false);
  const [saveHovered, setSaveHovered] = React.useState(false);
  const [menuVisible, setMenuVisible] = React.useState(false);

  const handleLike = useCallback((e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const now = Date.now();
    if (now - lastLikeClick.current < 350) return;
    lastLikeClick.current = now;

    likeScale.setValue(1);
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.4, friction: 3, tension: 120, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
    ]).start();
    onLike(post.id);
  }, [post.id, onLike, likeScale]);

  const handleSave = useCallback((e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const now = Date.now();
    if (now - lastSaveClick.current < 350) return;
    lastSaveClick.current = now;

    saveScale.setValue(1);
    Animated.sequence([
      Animated.spring(saveScale, { toValue: 1.4, friction: 3, tension: 120, useNativeDriver: true }),
      Animated.spring(saveScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
    ]).start();
    onSave(post.id);
  }, [post.id, onSave, saveScale]);

  const handleComment = useCallback((e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (onComment) onComment(post);
  }, [post, onComment]);

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

  const handleShare = useCallback(async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    try {
      await Share.share({
        message: `${post.username} on UNIHELP:\n\n"${post.content}"`,
      });
    } catch {
      if (Platform.OS === 'web') {
        alert('Post link copied to clipboard.');
      } else {
        Alert.alert('Shared! 🔗', 'Post link copied to clipboard.');
      }
    }
  }, [post.username, post.content]);

  const handleOptions = useCallback((e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    console.log('[AnimatedPostCard] three dots clicked');
    console.log('[AnimatedPostCard] opening options modal');
    setMenuVisible(true);
  }, []);

  const handleReserveItem = useCallback(async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const id = post.id || post._id;
    if (post.status === 'Reserved' || post.status === 'Sold') return;
    
    setReserving(true);
    try {
      await reserveItem(id);
      if (Platform.OS === 'web') {
        alert(`Reserved! 🤝 You've reserved "${post.title}". The seller has been notified.`);
      } else {
        Alert.alert('Reserved! 🤝', `You've reserved "${post.title}". The seller has been notified.`);
      }
    } catch (err) {
      console.error('[AnimatedPostCard] Failed to reserve item:', err);
      if (Platform.OS === 'web') {
        alert('Failed to reserve item.');
      } else {
        Alert.alert('Error', 'Failed to reserve item.');
      }
    } finally {
      setReserving(false);
    }
  }, [post.id, post._id, post.status, post.title, reserveItem]);

  const handleContactSellerItem = useCallback(async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (post.status === 'Sold') return;
    const sellerId = post.userId || post.author;
    const sellerName = post.username || post.authorName || 'Seller';
    if (!sellerId) {
      if (Platform.OS === 'web') {
        alert('Seller information is not available.');
      } else {
        Alert.alert('Error', 'Seller information is not available.');
      }
      return;
    }

    if (sellerId === activeUserId) {
      if (Platform.OS === 'web') {
        alert('You cannot chat with yourself!');
      } else {
        Alert.alert('Error', 'You cannot chat with yourself!');
      }
      return;
    }

    try {
      const activeChat = await initChat(sellerId, sellerName, post);
      navigation.navigate('Chat', { chat: activeChat });
    } catch (err) {
      console.error('Failed to initialize chat:', err);
      if (Platform.OS === 'web') {
        alert('Failed to contact seller. Please try again later.');
      } else {
        Alert.alert('Error', 'Failed to contact seller. Please try again later.');
      }
    }
  }, [activeUserId, navigation, post.userId, post.author, post.username, post.authorName, post.status]);

  const handleEditItem = useCallback((e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (onEdit) {
      onEdit(post);
    } else {
      navigation.navigate('BuySell', { editItem: post });
    }
  }, [post, onEdit, navigation]);

  const handleDeleteItem = useCallback(async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const id = post.id || post._id;
    if (onDelete) {
      onDelete(id);
    } else {
      const confirmDelete = Platform.OS === 'web' 
        ? window.confirm('Are you sure you want to permanently delete this listing?')
        : await new Promise((resolve) => {
            Alert.alert(
              'Delete Listing',
              'Are you sure you want to permanently delete this listing? This action cannot be undone.',
              [
                { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                { text: 'Delete', onPress: () => resolve(true), style: 'destructive' },
              ]
            );
          });
      if (confirmDelete) {
        try {
          await deletePost(id);
          if (Platform.OS === 'web') alert('Listing deleted successfully.');
          else Alert.alert('Deleted', 'Listing deleted successfully.');
        } catch (err) {
          if (Platform.OS === 'web') alert('Failed to delete listing.');
          else Alert.alert('Error', 'Failed to delete listing.');
        }
      }
    }
  }, [post.id, post._id, onDelete, deletePost]);

  const handleMarkSoldItem = useCallback(async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const id = post.id || post._id;
    const confirmSold = Platform.OS === 'web'
      ? window.confirm('Are you sure you sold this item?')
      : await new Promise((resolve) => {
          Alert.alert(
            'Mark as Sold',
            'Are you sure you sold this item?',
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Confirm', onPress: () => resolve(true) },
            ]
          );
        });
    if (confirmSold) {
      try {
        await updatePost(id, { status: 'Sold', soldAt: new Date().toISOString() });
        if (Platform.OS === 'web') alert('Item marked as sold.');
        else Alert.alert('Success', 'Item marked as sold.');
      } catch (error) {
        console.error('Mark sold error:', error);
        if (Platform.OS === 'web') alert('Failed to mark item as sold.');
        else Alert.alert('Error', 'Failed to mark item as sold.');
      }
    }
  }, [post.id, post._id, updatePost]);

  const isOwner = activeUserId && (activeUserId === post.userId || activeUserId === post.author);
  const isSold = post.status === 'Sold';

  return (
    <View style={{ position: 'relative' }}>
      <AnimatedTouchable
        style={[styles.card, { transform: [{ scale: cardScale }] }, isSold && { opacity: 0.85 }]}
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
          
          {isOwner && (onEdit || onDelete) && (
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

      {/* Marketplace details if Buy/Sell category */}
      {(post.category === 'Buy/Sell' || post.price) && (
        <View style={styles.marketDetailsRow}>
          <Text style={styles.marketPrice}>{formatPrice(post.price)}</Text>
          {post.condition && (
            <View style={[styles.marketConditionBadge, { backgroundColor: getConditionColor(post.condition) + '15' }]}>
              <Text style={[styles.marketConditionText, { color: getConditionColor(post.condition) }]}>
                {post.condition}
              </Text>
            </View>
          )}
          {post.status && (
            <View style={[styles.marketStatusBadge, { backgroundColor: getStatusColor(post.status) + '15' }]}>
              <Text style={[styles.marketStatusText, { color: getStatusColor(post.status) }]}>
                {post.status}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Content */}
      {post.content && post.content !== `Selling ${post.title}` && (
        <Text style={styles.content}>{post.content}</Text>
      )}

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

      {/* Marketplace Action Row */}
      {post.category === 'Buy/Sell' && (
        <View style={styles.marketActionRow}>
          {isOwner ? (
            <>
              <TouchableOpacity 
                style={[styles.marketActionBtn, styles.marketEditBtn]} 
                onPress={handleEditItem} 
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={14} color={colors.primary} />
                <Text style={[styles.marketActionText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.marketActionBtn, styles.marketDeleteBtn]} 
                onPress={handleDeleteItem} 
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={14} color={colors.error || colors.accent || '#FF4B4B'} />
                <Text style={[styles.marketActionText, { color: colors.error || colors.accent || '#FF4B4B' }]}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.marketActionBtn, 
                  styles.marketSoldBtn,
                  isSold && styles.marketDisabledBtn
                ]} 
                onPress={handleMarkSoldItem} 
                activeOpacity={0.7}
                disabled={isSold}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={isSold ? colors.textTertiary : (colors.accentGreen || '#34D399')} />
                <Text style={[styles.marketActionText, { color: isSold ? colors.textTertiary : (colors.accentGreen || '#34D399') }]}>
                  {isSold ? 'Sold' : 'Mark Sold'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[
                  styles.marketActionBtn, 
                  styles.marketReserveBtn, 
                  (post.status === 'Reserved' || isSold) && styles.marketDisabledBtn,
                  reserving && styles.marketLoadingBtn
                ]} 
                onPress={handleReserveItem} 
                activeOpacity={0.7}
                disabled={post.status === 'Reserved' || isSold || reserving}
              >
                {reserving ? (
                  <ActivityIndicator size="small" color={colors.accentAmber || '#FBBF24'} />
                ) : (
                  <>
                    <Ionicons 
                      name={isSold ? "checkmark-done-circle-outline" : (post.status === 'Reserved' ? "lock-closed" : "bookmark-outline")} 
                      size={14} 
                      color={(post.status === 'Reserved' || isSold) ? colors.textTertiary : (colors.accentAmber || '#FBBF24')} 
                    />
                    <Text style={[styles.marketActionText, { color: (post.status === 'Reserved' || isSold) ? colors.textTertiary : (colors.accentAmber || '#FBBF24') }]}>
                      {isSold ? 'Sold' : (post.status === 'Reserved' ? 'Reserved' : 'Reserve')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.marketActionBtn, 
                  styles.marketChatBtn, 
                  isSold && styles.marketDisabledBtn
                ]} 
                onPress={handleContactSellerItem} 
                activeOpacity={0.7}
                disabled={isSold}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={isSold ? colors.textTertiary : "#FFF"} />
                <Text style={[styles.marketActionText, styles.marketChatText, isSold && { color: colors.textTertiary }]}>Contact Seller</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Action Row Divider */}
      <View style={styles.divider} />

      {/* Actions */}
      <View style={styles.actions}>
        {/* Like */}
        <AnimatedTouchable
          style={[
            styles.actionBtn, 
            { transform: [{ scale: likeScale }] },
            likeHovered && { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)' }
          ]}
          onPress={handleLike}
          activeOpacity={0.6}
          onMouseEnter={() => setLikeHovered(true)}
          onMouseLeave={() => setLikeHovered(false)}
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
        <TouchableOpacity 
          style={[
            styles.actionBtn,
            commentHovered && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }
          ]} 
          onPress={handleComment} 
          activeOpacity={0.6}
          onMouseEnter={() => setCommentHovered(true)}
          onMouseLeave={() => setCommentHovered(false)}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.actionLabel}>
            {post.commentsCount === 1 ? '1 Comment' : (post.commentsCount > 1 ? `${post.commentsCount} Comments` : 'Comment')}
          </Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity 
          style={[
            styles.actionBtn,
            shareHovered && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }
          ]} 
          onPress={handleShare} 
          activeOpacity={0.6}
          onMouseEnter={() => setShareHovered(true)}
          onMouseLeave={() => setShareHovered(false)}
        >
          <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        {/* Message button hidden for public release */}

        <View style={{ flex: 1 }} />

        {/* Save/Bookmark */}
        <AnimatedTouchable
          style={[
            styles.actionBtn, 
            { transform: [{ scale: saveScale }] },
            saveHovered && { backgroundColor: isDark ? 'rgba(79, 157, 255, 0.15)' : 'rgba(30, 58, 138, 0.08)' }
          ]}
          onPress={handleSave}
          activeOpacity={0.6}
          onMouseEnter={() => setSaveHovered(true)}
          onMouseLeave={() => setSaveHovered(false)}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? colors.primary : colors.textPrimary}
          />
        </AnimatedTouchable>
      </View>
    </AnimatedTouchable>

    {/* Clean Floating Options Menu */}
    {menuVisible && (
      <>
        {/* Transparent click-outside overlay cover */}
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={(e) => {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            setMenuVisible(false);
          }}
        />
        
        {/* Floating dropdown menu */}
        <View style={styles.floatingMenu} onStartShouldSetResponder={() => true}>
          {onEdit && (
            <TouchableOpacity 
              style={styles.floatingMenuBtn} 
              onPress={(e) => {
                if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                setMenuVisible(false);
                onEdit(post);
              }}
            >
              <Ionicons name="create-outline" size={18} color={colors.textPrimary} style={{ marginRight: 8 }} />
              <Text style={[styles.floatingMenuBtnText, { color: colors.textPrimary }]}>Edit Post</Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity 
              style={[styles.floatingMenuBtn, styles.deleteMenuBtnBorder]} 
              onPress={(e) => {
                if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                setMenuVisible(false);
                if (Platform.OS === 'web') {
                  const confirmDelete = window.confirm('Are you sure you want to permanently delete this post? This action cannot be undone.');
                  if (confirmDelete) {
                    onDelete(post.id || post._id);
                  }
                } else {
                  Alert.alert(
                    'Delete Post',
                    'Are you sure you want to permanently delete this post? This action cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete', 
                        style: 'destructive', 
                        onPress: () => {
                          onDelete(post.id || post._id);
                        } 
                      },
                    ]
                  );
                }
              }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.floatingMenuBtnText, { color: colors.accent }]}>Delete Post</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.floatingMenuBtn, styles.cancelMenuBtn]} 
            onPress={(e) => {
              if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
              setMenuVisible(false);
            }}
          >
            <Text style={[styles.floatingMenuBtnText, { color: colors.textSecondary, textAlign: 'center', width: '100%' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </>
    )}
  </View>
  );
});

export default AnimatedPostCard;
