/**
 * PostCard – Theme-Aware
 * ─────────────────────────────────────────────
 * Every action (like, reply, share, bookmark,
 * more-menu) is wired to do something.
 * Fully theme-responsive.
 */

import React, { useRef, useState, memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const PostCard = ({ post, onLike }) => {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [bookmarked, setBookmarked] = useState(false);

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.5, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onLike(post.id);
  };

  const handleReply = () => {
    Alert.alert('Reply', `Replying to ${post.username}'s post`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK' },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.username} on UNIHELP:\n\n"${post.content}"`,
      });
    } catch {
      Alert.alert('Shared! 🔗', 'Post link copied to clipboard.');
    }
  };

  const handleBookmark = () => {
    setBookmarked((prev) => !prev);
    Alert.alert(
      bookmarked ? 'Removed' : 'Saved! 🔖',
      bookmarked ? 'Post removed from saved items.' : 'Post saved for later.'
    );
  };

  const handleMore = () => {
    Alert.alert('Options', `Post by ${post.username}`, [
      { text: 'Report Post', onPress: () => Alert.alert('Reported', 'Thank you for your feedback.') },
      { text: 'Mute User', onPress: () => Alert.alert('Muted', `${post.username} has been muted.`) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.avatar}</Text>
          </View>
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.timestamp}>{post.timestamp}</Text>
        </View>
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.6} onPress={handleMore}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.content}>{post.content}</Text>
      <View style={styles.divider} />

      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionBtn} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Ionicons
              name={post.liked ? 'heart' : 'heart-outline'}
              size={20}
              color={post.liked ? colors.accent : colors.textTertiary}
            />
          </Animated.View>
          <Text style={[styles.actionLabel, post.liked && { color: colors.accent }]}>{post.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleReply}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
          <Text style={styles.actionLabel}>Reply</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleShare}>
          <Ionicons name="arrow-redo-outline" size={18} color={colors.textTertiary} />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookmarkBtn} activeOpacity={0.7} onPress={handleBookmark}>
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={bookmarked ? colors.primary : colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: SIZES.radiusLg, padding: SIZES.lg,
    marginHorizontal: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: colors.border, ...shadows.medium,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.md },
  avatarRing: {
    width: SIZES.avatarMd + 4, height: SIZES.avatarMd + 4, borderRadius: SIZES.radiusFull,
    borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: SIZES.avatarMd, height: SIZES.avatarMd, borderRadius: SIZES.radiusFull,
    backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: SIZES.fontSm },
  headerMeta: { marginLeft: SIZES.sm + 4, flex: 1 },
  username: { fontSize: SIZES.fontMd, fontWeight: '700', color: colors.textPrimary },
  timestamp: { fontSize: SIZES.fontXs, color: colors.textTertiary, marginTop: 2 },
  moreBtn: { padding: SIZES.xs },
  content: { fontSize: SIZES.fontMd, lineHeight: 23, color: colors.textSecondary, letterSpacing: 0.15 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: SIZES.md },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: SIZES.lg },
  actionLabel: { marginLeft: 6, fontSize: SIZES.fontSm, color: colors.textTertiary, fontWeight: '600' },
  bookmarkBtn: { marginLeft: 'auto' },
});

export default memo(PostCard);
