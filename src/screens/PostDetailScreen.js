import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

import AnimatedPostCard from '../components/AnimatedPostCard';

import { Alert } from 'react-native';

const PostDetailScreen = ({ route, navigation }) => {
  const { post } = route.params;
  const { colors, shadows, isDark } = useTheme();
  const { 
    addComment, 
    getCommentsForPost, 
    toggleLike, 
    toggleSave, 
    votePoll, 
    userId 
  } = useData();

  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  // Subscribe to comments for this post
  useEffect(() => {
    if (!post?.id) return;
    setLoading(true);

    const unsubscribe = getCommentsForPost(post.id, (data) => {
      console.log(`[PostDetail] Fetched ${data.length} comments for postId: ${post.id}`);
      setComments(data);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [post?.id, getCommentsForPost]);

  const handleSend = useCallback(async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    try {
      await addComment(post.id, newComment.trim());
      setNewComment('');
    } catch (e) {
      console.warn('Error adding comment:', e);
    } finally {
      setSending(false);
    }
  }, [newComment, sending, addComment, post?.id]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch { return ''; }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        <Text style={styles.commentAvatarText}>{item.avatar || item.username?.charAt(0) || 'U'}</Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{item.username}</Text>
          <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentContent}>{item.content}</Text>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={48} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>No comments yet</Text>
      <Text style={styles.emptySubtitle}>Be the first to share your thoughts!</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.postWrap}>
      <AnimatedPostCard
        post={post}
        onLike={(id) => toggleLike(id)}
        onSave={(id) => toggleSave(id)}
        // We do not pass onComment here because we are already in the comment view
        // onMessage removed — Messages feature disabled
        onVotePoll={votePoll}
        userId={userId}
        index={0}
      />
      <View style={styles.commentsTitleBar}>
        <Text style={styles.commentsTitle}>Comments</Text>
        <Text style={styles.commentsCountBadge}>{comments.length}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Comments List & Post View */}
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={<EmptyState />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Write a comment…"
            placeholderTextColor={colors.textTertiary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newComment.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!newComment.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Ionicons name="send" size={18} color={colors.textOnPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radiusMd,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xxxl,
  },
  postWrap: {
    paddingBottom: SIZES.md,
  },
  commentsTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
  },
  commentsTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  commentsCountBadge: {
    marginLeft: SIZES.sm,
    backgroundColor: colors.surfaceLight,
    color: colors.textSecondary,
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  listContent: {
    paddingVertical: SIZES.md,
    paddingBottom: SIZES.xl,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.lg,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: SIZES.radiusFull,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  commentAvatarText: {
    fontSize: SIZES.fontXs,
    fontWeight: '700',
    color: colors.primary,
  },
  commentBody: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: SIZES.fontSm,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  commentTime: {
    fontSize: SIZES.fontXs,
    color: colors.textTertiary,
  },
  commentContent: {
    fontSize: SIZES.fontMd,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xxl,
  },
  emptyTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: SIZES.md,
  },
  emptySubtitle: {
    fontSize: SIZES.fontSm,
    color: colors.textTertiary,
    marginTop: SIZES.xs,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
    gap: SIZES.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    fontSize: SIZES.fontMd,
    color: colors.textPrimary,
    maxHeight: 120,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: SIZES.radiusLg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});

export default PostDetailScreen;
