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

const SavedScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { savedPosts, toggleLike, toggleSave, votePoll, postsLoading, userId } = useData();
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);
  const [sortOrder, setSortOrder] = useState('recent');

  const handleComment = useCallback((post) => {
    navigation.navigate('PostDetail', { post });
  }, [navigation]);

  const backScale = React.useRef(new Animated.Value(1)).current;
  const onPressInBack = () => Animated.spring(backScale, { toValue: 0.85, useNativeDriver: true }).start();
  const onPressOutBack = () => Animated.spring(backScale, { toValue: 1, useNativeDriver: true }).start();

  const sortedPosts = useMemo(() => {
    const list = [...savedPosts];
    return sortOrder === 'oldest'
      ? list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      : list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [savedPosts, sortOrder]);

  const handleSort = useCallback(() => {
    Alert.alert('Sort By', 'Choose sort order:', [
      { text: 'Recently Saved', onPress: () => setSortOrder('recent') },
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

  if (postsLoading) {
    return (
      <View style={[styles.screen, styles.loaderWrap]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Saved Posts</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleSort} style={styles.sortBtn} activeOpacity={0.7}>
              <Ionicons name="funnel-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <FlatList
        data={sortedPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState colors={colors} styles={styles} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const EmptyState = ({ colors, styles }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconCircle}>
      <Ionicons name="bookmark-outline" size={40} color={colors.primary} />
    </View>
    <Text style={styles.emptyTitle}>No saved posts</Text>
    <Text style={styles.emptySubtitle}>
      Tap the bookmark icon on any post to save it here for later.
    </Text>
  </View>
);

const createStyles = (colors, shadows, isDark) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: { zIndex: 10 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { 
    paddingTop: SIZES.md, 
    paddingBottom: SIZES.xxxl 
  },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  },
});

export default SavedScreen;
