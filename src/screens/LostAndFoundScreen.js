/**
 * LostAndFoundScreen – Filtered Community Feed
 * ─────────────────────────────────────────────
 * Shows only posts categorized as 'Lost & Found'.
 * Reuses AnimatedPostCard for consistent interactions.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import AnimatedPostCard from '../components/AnimatedPostCard';

const LostAndFoundScreen = ({ navigation }) => {
  const { colors, shadows } = useTheme();
  const { posts, postsLoading, toggleLike, toggleSave, votePoll, userId, refreshData } = useData();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const [refreshing, setRefreshing] = useState(false);

  // Filter posts specifically for Lost & Found category
  const filteredPosts = useMemo(() => {
    return posts.filter(p => p.category === 'Lost & Found');
  }, [posts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleLike = useCallback((postId) => toggleLike(postId), [toggleLike]);
  const handleSave = useCallback((postId) => toggleSave(postId), [toggleSave]);
  const handleComment = useCallback((post) => {
    navigation.navigate('PostDetail', { post });
  }, [navigation]);

  const renderItem = useCallback(({ item, index }) => (
    <AnimatedPostCard
      post={item}
      onPress={handleComment}
      onLike={handleLike}
      onSave={handleSave}
      onComment={handleComment}
      onVotePoll={votePoll}
      userId={userId}
      index={index}
    />
  ), [handleLike, handleSave, handleComment, votePoll, userId]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />
      
      {/* Header */}
      <View style={styles.appBarContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lost & Found</Text>
          <TouchableOpacity 
            style={styles.addBtn} 
            activeOpacity={0.7} 
            onPress={() => navigation.navigate('CreatePost', { defaultCategory: 'Lost & Found' })}
          >
            <Ionicons name="add" size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed */}
      {postsLoading && filteredPosts.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Checking for items…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nothing reported yet 🔎</Text>
              <Text style={styles.emptySubtitle}>Lost something or found a stray item? Post it here to help others!</Text>
              <TouchableOpacity 
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CreatePost', { defaultCategory: 'Lost & Found' })}
              >
                <Text style={styles.emptyBtnText}>Report Lost Item</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, height: 56,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderSubtle },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SIZES.md, paddingBottom: SIZES.xxxl },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderText: { fontSize: SIZES.fontMd, color: colors.textTertiary, marginTop: SIZES.md },
  
  // Empty State Styles
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: SIZES.xxxl },
  emptyIconCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, ...shadows.glow
  },
  emptyBtnText: { color: colors.textOnPrimary, fontWeight: '900', fontSize: 14, textTransform: 'uppercase' },
});

export default LostAndFoundScreen;
