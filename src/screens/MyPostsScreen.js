/**
 * MyPostsScreen – User's Contributions
 * ─────────────────────────────────────────────
 * Shows all posts created by the current user.
 * Supports delete/edit (conceptually) and standard interactions.
 * Theme-aware.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import AnimatedPostCard from '../components/AnimatedPostCard';

const MyPostsScreen = ({ navigation }) => {
  const { colors, shadows } = useTheme();
  const { posts, toggleLike, toggleSave, votePoll, postsLoading, userId } = useData();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [sortOrder, setSortOrder] = useState('recent'); // 'recent' | 'oldest'

  // Filter posts created by the user
  const userPosts = useMemo(() => 
    posts.filter(p => p.userId === userId), 
    [posts, userId]
  );

  const handleComment = useCallback((post) => {
    navigation.navigate('PostDetail', { post });
  }, [navigation]);

  const backScale = React.useRef(new Animated.Value(1)).current;
  const onPressInBack = () => Animated.spring(backScale, { toValue: 0.85, useNativeDriver: true }).start();
  const onPressOutBack = () => Animated.spring(backScale, { toValue: 1, useNativeDriver: true }).start();

  const sortedPosts = useMemo(() => {
    const list = [...userPosts];
    return sortOrder === 'oldest'
      ? list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      : list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [userPosts, sortOrder]);

  const handleSort = useCallback(() => {
    Alert.alert('Sort By', 'Choose sort order:', [
      { text: 'Newest First', onPress: () => setSortOrder('recent') },
      { text: 'Oldest First', onPress: () => setSortOrder('oldest') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const renderPost = useCallback(({ item, index }) => (
    <AnimatedPostCard
      post={item}
      onPress={handleComment}
      onLike={toggleLike}
      onSave={toggleSave}
      onComment={handleComment}
      onVotePoll={votePoll}
      userId={userId}
      index={index}
    />
  ), [toggleLike, toggleSave, votePoll, userId, handleComment]);

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="create-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>You haven't posted anything yet</Text>
      <Text style={styles.emptySubtitle}>
        Share your thoughts, ask a question, or start a poll to see it here.
      </Text>
      <TouchableOpacity 
        style={styles.createBtn}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <Text style={styles.createBtnText}>Create My First Post</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: '#1E3A8A' }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <LinearGradient 
          colors={['#1E3A8A', '#2563EB']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }} 
          style={styles.headerBar}
        >
          <Animated.View style={{ transform: [{ scale: backScale }] }}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              onPressIn={onPressInBack}
              onPressOut={onPressOutBack}
              style={styles.backBtn} 
              activeOpacity={1}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.headerTitle}>My Posts</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleSort} style={styles.sortBtn} activeOpacity={0.7}>
              <Ionicons name="funnel-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{userPosts.length}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {postsLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          bounces={true}
        />
      )}
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: {
    ...shadows.medium,
    zIndex: 10,
  },
  headerBar: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: SIZES.md, paddingBottom: SIZES.md, paddingTop: SIZES.sm,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  countBadge: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    paddingVertical: 4 
  },
  countText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  
  list: { 
    paddingTop: SIZES.md,
    paddingBottom: SIZES.xxxl 
  },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Empty State Styles
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
    marginBottom: 24,
  },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    ...shadows.medium,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});

export default MyPostsScreen;
