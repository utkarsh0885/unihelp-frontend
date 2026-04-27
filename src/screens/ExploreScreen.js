/**
 * ExploreScreen – Gradient Header + Animated
 * ─────────────────────────────────────────────
 * Hub with 5 campus features. Gradient header
 * with title. Each card animates in with
 * Reanimated FadeInRight. Fully theme-responsive.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingBottom: 120,
  },
  appBarContainer: {
    ...shadows.large,
    elevation: 20,
    backgroundColor: colors.background,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  gradientHeader: {
    paddingTop: SIZES.sm,
    paddingBottom: SIZES.xl,
    paddingHorizontal: SIZES.md,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerInfo: {
    marginTop: SIZES.xs,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    alignSelf: 'flex-start',
    marginBottom: SIZES.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  pageTitle: {
    fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.8,
  },
  pageSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: SIZES.lg },
  
  // Search Styles
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, height: 50, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '500' },

  sectionTitle: {
    fontSize: 13, fontWeight: '900', color: colors.textTertiary, 
    marginHorizontal: SIZES.md, marginTop: 28, marginBottom: 16,
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  cardsSection: {
    marginTop: SIZES.lg, paddingHorizontal: SIZES.md,
  },
  resultsSection: {
    paddingHorizontal: SIZES.md, marginTop: SIZES.md,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    padding: SIZES.md, borderRadius: 20, marginBottom: SIZES.sm,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.small,
  },
  resultIconWrap: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    marginRight: SIZES.md,
  },
  resultInfo: { flex: 1 },
  resultTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  resultType: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultUser: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
  resultTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
  resultSnippet: { fontSize: 13, color: colors.textTertiary, lineHeight: 18 },

  // Empty State
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', lineHeight: 20 },

  featureCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.large,
    elevation: 8,
  },
  featureIcon: {
    width: 64, height: 64, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 17, fontWeight: '900', color: colors.textPrimary, marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13, color: colors.textSecondary, lineHeight: 18, fontWeight: '500'
  },
  arrowWrap: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  statsContainer: {
    marginTop: 8,
    paddingBottom: 20,
  },
  statsBlock: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: 24, padding: 20,
    marginHorizontal: SIZES.md, borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.large,
    elevation: 10,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statIconWrap: {
    width: 32, height: 32, borderRadius: 10, 
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textTertiary, marginTop: 2, fontWeight: '700' },
  statDividerV: { width: 1, height: 40, backgroundColor: colors.borderLight, marginHorizontal: 10 },
});

const FeatureCard = ({ feature, index, animValues, colors, styles, navigateTo }) => {
  const pressScale = React.useRef(new Animated.Value(1)).current;
  const translateX = animValues[index].interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0]
  });
  const opacity = animValues[index];

  const onPressIn = () => {
    Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, tension: 120, friction: 10 }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 }).start();
  };

  return (
    <Animated.View
      style={{ transform: [{ translateX }, { scale: pressScale }], opacity }}
    >
      <TouchableOpacity
        style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => navigateTo(feature.screen)}
      >
        <View
          style={[styles.featureIcon, { backgroundColor: feature.color }]}
        >
          <Ionicons name={feature.icon.replace('-outline', '')} size={28} color="#FFFFFF" />
        </View>
        
        <View style={styles.featureText}>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDesc}>{feature.description}</Text>
        </View>
        
        <View style={styles.arrowWrap}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ExploreScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { posts, notes, items, events, activeUsersCount } = useData();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  
  // Unified Stats Calculation
  const unifiedStats = useMemo(() => ({
    active: activeUsersCount,
    notes: notes.length + posts.filter(p => p.category === 'Notes' || p.category === 'Share Notes').length,
    items: items.length + posts.filter(p => p.category === 'Buy/Sell' || p.category === 'Marketplace').length,
    events: events.length + posts.filter(p => p.category === 'Events').length,
  }), [activeUsersCount, notes, items, events, posts]);

  const [headerOpacity] = useState(new Animated.Value(0));
  const [headerTranslateY] = useState(new Animated.Value(-20));
  const [searchQuery, setSearchQuery] = useState('');

  const FEATURES = useMemo(() => [
    {
      key: 'post',
      title: 'Post Updates',
      description: 'Share what\'s happening with your campus community',
      icon: 'create-outline',
      color: colors.primary,
      screen: 'CreatePost',
    },
    {
      key: 'notes',
      title: 'Share Notes',
      description: 'Upload and download study notes from peers',
      icon: 'document-text-outline',
      color: colors.accentCyan,
      screen: 'ShareNotes',
    },
    {
      key: 'buysell',
      title: 'Buy / Sell Items',
      description: 'Campus marketplace for books, gadgets & more',
      icon: 'cart-outline',
      color: colors.accentGreen,
      screen: 'BuySell',
    },
    {
      key: 'events',
      title: 'Discover Events',
      description: 'Find hackathons, fests, workshops & meetups',
      icon: 'calendar-outline',
      color: colors.accent,
      screen: 'DiscoverEvents',
    },
    {
      key: 'calendar',
      title: 'Campus Calendar',
      description: 'Plan your month with university events & deadlines',
      icon: 'calendar',
      color: colors.accentCyan,
      screen: 'Calendar',
    },
    {
      key: 'lostfound',
      title: 'Lost & Found',
      description: 'Report lost items or browse found belongings',
      icon: 'search-outline',
      color: '#8B5CF6',
      screen: 'LostAndFound',
    },
  ], [colors]);

  // Filtering Logic
  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return FEATURES;
    const query = searchQuery.toLowerCase();
    return FEATURES.filter(f => 
      f.title.toLowerCase().includes(query) || 
      f.description.toLowerCase().includes(query)
    );
  }, [searchQuery, FEATURES]);

  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    
    // Search across all data types
    const matchingPosts = posts.filter(p => {
      const isPoll = query.includes('poll') && !!p.poll;
      const isEvent = query.includes('event') && ['event', 'fest', 'hackathon'].some(k => (p.content || '').toLowerCase().includes(k));
      return (p.content || '').toLowerCase().includes(query) || isPoll || isEvent;
    }).map(p => ({ ...p, type: 'Post', icon: 'chatbubble-outline' }));

    const matchingNotes = notes.filter(n => 
      (n.title || '').toLowerCase().includes(query) || 
      (n.description || '').toLowerCase().includes(query) ||
      query.includes('note')
    ).map(n => ({ ...n, type: 'Note', icon: 'document-text-outline', content: n.description }));



    const matchingItems = items.filter(i => 
      (i.title || '').toLowerCase().includes(query) || 
      (i.description || '').toLowerCase().includes(query) ||
      query.includes('item') || query.includes('buy') || query.includes('sell')
    ).map(i => ({ ...i, type: 'Item', icon: 'cart-outline', content: i.description }));

    return [...matchingPosts, ...matchingNotes, ...matchingItems].sort((a, b) => b.createdAt - a.createdAt);
  }, [searchQuery, posts, notes, items]);

  const hasResults = (filteredFeatures?.length || 0) > 0 || (filteredContent?.length || 0) > 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(headerTranslateY, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  // Entry animation values for each card
  const animValues = useMemo(() => FEATURES.map(() => new Animated.Value(0)), [FEATURES.length]);

  useEffect(() => {
    Animated.stagger(100,
      animValues.map(val => Animated.spring(val, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true
      }))
    ).start();
  }, [animValues]);

  const navigateTo = useCallback((screen) => {
    const parent = navigation.getParent();
    const drawerParent = parent?.getParent?.();
    if (drawerParent?.navigate) {
      drawerParent.navigate(screen);
    } else if (parent?.navigate) {
      parent.navigate(screen);
    } else {
      navigation.navigate(screen);
    }
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: isDark ? colors.background : '#1E3A8A' }} edges={['top']} />
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View>
          {/* Premium Gradient Header Container */}
          <Animated.View style={[styles.appBarContainer, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
            <LinearGradient
              colors={isDark ? ['#1A1A1A', '#0D0D0D'] : ['#1E3A8A', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientHeader}
            >
              <View style={styles.headerInfo}>
                <View style={styles.headerRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>CAMPUS HUB</Text>
                  </View>
                </View>
                <Text style={styles.pageTitle}>Explore</Text>
                <Text style={styles.pageSub}>Everything you need in one place</Text>
                
                {/* Premium Search Hub */}
                <View style={[styles.searchWrap, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)' }]}>
                  <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for events, notes, polls..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                  />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Feature Cards Grid / Search Results */}
          <View style={styles.cardsSection}>
            {searchQuery.trim() ? (
              <Text style={styles.sectionTitle}>Services Matching "{searchQuery}"</Text>
            ) : (
              <Text style={styles.sectionTitle}>Featured Services</Text>
            )}
            
            {filteredFeatures.length > 0 ? (
              filteredFeatures.map((feature, index) => (
                <FeatureCard 
                  key={feature.key} 
                  feature={feature} 
                  index={index} 
                  animValues={animValues} 
                  colors={colors} 
                  styles={styles} 
                  navigateTo={navigateTo} 
                />
              ))
            ) : !hasResults ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="search-outline" size={40} color={colors.textTertiary || '#999'} />
                </View>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>We couldn't find anything matching "{searchQuery}". Try different keywords.</Text>
              </View>
            ) : null}
          </View>

          {/* Global Search Content Results */}
          {searchQuery.trim() !== '' && filteredContent.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>Matching Content ({filteredContent.length})</Text>
              {filteredContent.map((item, idx) => (
                <TouchableOpacity 
                  key={item.id || idx} 
                  style={styles.resultItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.type === 'Post') navigation.navigate('PostDetail', { post: item });
                    else if (item.type === 'Note') navigateTo('ShareNotes');
                    else if (item.type === 'Item') navigateTo('BuySell');
                  }}
                >
                  <View style={[styles.resultIconWrap, { backgroundColor: colors.surfaceLight || '#eee' }]}>
                    <Ionicons name={item.icon} size={18} color={colors.primary || '#000'} />
                  </View>
                  <View style={styles.resultInfo}>
                    <View style={styles.resultTop}>
                      <Text style={styles.resultType}>{item.type}</Text>
                      <Text style={styles.resultUser}>{item.username || 'Campus User'}</Text>
                    </View>
                    <Text style={styles.resultTitle} numberOfLines={1}>{item.title || 'Untitled Update'}</Text>
                    <Text style={styles.resultSnippet} numberOfLines={2}>{item.content}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Premium Stats Center - Only show when NOT searching or if features are shown */}
          {!searchQuery.trim() && (
            <View style={styles.statsContainer}>
              <Text style={styles.sectionTitle}>Campus Activity</Text>
              <View style={styles.statsBlock}>
                <View style={styles.statItem}>
                  <View style={[styles.statIconWrap, { backgroundColor: (colors.primaryGlow || '#ddd') }]}>
                    <Ionicons name="people" size={16} color={colors.primary || '#000'} />
                  </View>
                  <Text style={styles.statValue}>{unifiedStats.active}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statDividerV} />
                <View style={styles.statItem}>
                  <View style={[styles.statIconWrap, { backgroundColor: (colors.accentCyan || '#000') + '20' }]}>
                    <Ionicons name="document-text" size={16} color={colors.accentCyan || '#000'} />
                  </View>
                  <Text style={styles.statValue}>{unifiedStats.notes}</Text>
                  <Text style={styles.statLabel}>Notes</Text>
                </View>
                <View style={styles.statDividerV} />
                <View style={styles.statItem}>
                  <View style={[styles.statIconWrap, { backgroundColor: (colors.accent || '#000') + '20' }]}>
                    <Ionicons name="calendar" size={16} color={colors.accent || '#000'} />
                  </View>
                  <Text style={styles.statValue}>{unifiedStats.events}</Text>
                  <Text style={styles.statLabel}>Events</Text>
                </View>
                <View style={styles.statDividerV} />
                <View style={styles.statItem}>
                  <View style={[styles.statIconWrap, { backgroundColor: (colors.success || '#000') + '20' }]}>
                    <Ionicons name="cart" size={16} color={colors.success || '#000'} />
                  </View>
                  <Text style={styles.statValue}>{unifiedStats.items}</Text>
                  <Text style={styles.statLabel}>Market</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ExploreScreen;
