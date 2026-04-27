/**
 * BuySellScreen – Persistent + Theme-Aware
 * ─────────────────────────────────────────────
 * Campus marketplace to buy and sell items.
 * Uses DataContext for persistent data.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPostCard from '../components/AnimatedPostCard';

const BuySellScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { 
    items, itemsLoading, posts, 
    toggleLike, toggleSave, votePoll, userId, refreshData,
    addItem, reserveItem, getOrCreateChat 
  } = useData();
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  const handleLike = useCallback((postId) => toggleLike(postId), [toggleLike]);
  const handleSave = useCallback((postId) => toggleSave(postId), [toggleSave]);

  // Unified Feed: Items + Categorized Posts
  const mergedData = useMemo(() => {
    const buySellPosts = posts
      .filter(p => p.category === 'Buy/Sell' || p.category === 'Marketplace')
      .map(p => ({ ...p, isGenericPost: true }));
    
    const marketItems = items.map(i => ({ ...i, isGenericPost: false }));

    return [...marketItems, ...buySellPosts].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : 0;
      const dateB = b.createdAt ? new Date(b.createdAt) : 0;
      return dateB - dateA;
    });
  }, [items, posts]);

  const CONDITION_COLORS = useMemo(() => ({
    'New': colors.accentGreen, 'Like New': colors.accentCyan, 'Good': colors.accentAmber, 'Used': colors.textSecondary,
  }), [colors]);

  const STATUS_COLORS = useMemo(() => ({
    'Available': colors.accentGreen, 'Reserved': colors.accentAmber, 'Sold': colors.accent,
  }), [colors]);

  const [showSell, setShowSell] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCondition, setItemCondition] = useState('Good');
  const [posting, setPosting] = useState(false);
  const [reservingId, setReservingId] = useState(null);

  const handleSell = useCallback(async () => {
    if (!itemTitle.trim() || !itemPrice.trim()) {
      Alert.alert('Missing Info', 'Please enter title and price.');
      return;
    }
    setPosting(true);
    try {
      const newItemId = await addItem(itemTitle.trim(), itemPrice.trim(), itemCondition);
      console.log('[Marketplace] Successfully posted item to central DB. ID:', newItemId);
      
      setItemTitle('');
      setItemPrice('');
      setShowSell(false);
      Alert.alert('Listed! 🛒', 'Your item is now visible to all students on campus!');
    } catch (e) {
      Alert.alert('Error', 'Failed to list item.');
    } finally {
      setPosting(false);
    }
  }, [itemTitle, itemPrice, itemCondition, addItem]);

  const handleChat = useCallback(async (item) => {
    try {
      const chat = await getOrCreateChat(item.userId, item);
      navigation.navigate('Chat', { chat });
    } catch (error) {
      Alert.alert('Error', 'Could not open chat.');
    }
  }, [getOrCreateChat, navigation]);

  const handleReserve = useCallback(async (item) => {
    if (item.status === 'Reserved') return;
    
    setReservingId(item.id);
    try {
      await reserveItem(item.id);
      Alert.alert('Reserved! 🤝', `You've reserved "${item.title}". The seller has been notified.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to reserve item.');
    } finally {
      setReservingId(null);
    }
  }, [reserveItem]);

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

    const isReserved = item.status === 'Reserved';
    const isReserving = reservingId === item.id;

    // Use placeholder image if none provided
    const itemImage = item.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400&auto=format&fit=crop';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Image source={{ uri: itemImage }} style={styles.itemThumb} />
          <View style={styles.itemInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {isReserved && (
                <View style={styles.inlineBadge}>
                  <Text style={styles.inlineBadgeText}>Reserved</Text>
                </View>
              )}
            </View>
            <View style={styles.itemMeta}>
              <Text style={styles.itemSeller}>{item.seller || 'Student'}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.itemTime}>{item.time || 'Public'}</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.itemPrice}>{item.price}</Text>
            <View style={[styles.statusLabel, { backgroundColor: (STATUS_COLORS[item.status || 'Available']) + '15' }]}>
              <Text style={[styles.statusLabelText, { color: STATUS_COLORS[item.status || 'Available'] }]}>
                {item.status || 'Available'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.badges}>
            <View style={[styles.conditionBadge, { backgroundColor: (CONDITION_COLORS[item.condition] || colors.textSecondary) + '18' }]}>
              <Text style={[styles.conditionText, { color: CONDITION_COLORS[item.condition] || colors.textSecondary }]}>{item.condition}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[
                styles.actionBtn, 
                styles.reserveBtn, 
                isReserved && styles.disabledBtn,
                isReserving && styles.loadingBtn
              ]} 
              onPress={() => handleReserve(item)} 
              activeOpacity={0.7}
              disabled={isReserved || isReserving}
            >
              {isReserving ? (
                <ActivityIndicator size="small" color={colors.accentAmber} />
              ) : (
                <>
                  <Ionicons name={isReserved ? "lock-closed" : "bookmark-outline"} size={14} color={isReserved ? colors.textTertiary : colors.accentAmber} />
                  <Text style={[styles.actionText, { color: isReserved ? colors.textTertiary : colors.accentAmber }]}>
                    {isReserved ? 'Reserved' : 'Reserve'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.chatBtn]} 
              onPress={() => handleChat(item)} 
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#FFF" />
              <Text style={[styles.actionText, styles.chatText]}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [styles, colors, CONDITION_COLORS, STATUS_COLORS, handleChat, handleReserve, reservingId, handleLike, handleSave, userId, votePoll, navigation]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SafeAreaView style={{ backgroundColor: isDark ? colors.background : '#1E3A8A' }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={isDark ? ['#1A1A1A', '#0D0D0D'] : ['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(79, 157, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)' }]} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buy / Sell</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: isDark ? 'rgba(79, 157, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)' }]} activeOpacity={0.7} onPress={() => setShowSell(!showSell)}>
            <Ionicons name={showSell ? 'close' : 'add'} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {showSell && (
        <View style={styles.sellCard}>
          <Text style={styles.sellTitle}>Sell an Item</Text>
          <TextInput style={styles.sellInput} placeholder="Item name" placeholderTextColor={colors.textTertiary} value={itemTitle} onChangeText={setItemTitle} />
          <TextInput style={styles.sellInput} placeholder="Price (e.g. 500)" placeholderTextColor={colors.textTertiary} keyboardType="numeric" value={itemPrice} onChangeText={setItemPrice} />
          <View style={styles.conditionRow}>
            {['New', 'Like New', 'Good', 'Used'].map((c) => (
              <TouchableOpacity key={c} style={[styles.conditionChip, itemCondition === c && styles.conditionChipActive]} onPress={() => setItemCondition(c)} activeOpacity={0.7}>
                <Text style={[styles.conditionChipText, itemCondition === c && styles.conditionChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.sellBtn, posting && { opacity: 0.7 }]} onPress={handleSell} activeOpacity={0.8} disabled={posting}>
            {posting ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
              <>
                <Ionicons name="storefront-outline" size={18} color="#FFFFFF" />
                <Text style={styles.sellBtnText}>List Item</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {itemsLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={mergedData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="storefront-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No items yet 🛍️</Text>
              <Text style={styles.emptySubtitle}>Be the first to list something in the campus marketplace!</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: { ...shadows.medium, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, paddingBottom: SIZES.md, paddingTop: SIZES.sm,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  list: { padding: SIZES.md, paddingBottom: SIZES.xxxl },
  sellCard: { 
    margin: SIZES.md, backgroundColor: colors.surface, borderRadius: 24, 
    padding: SIZES.lg, borderWidth: 1, borderColor: colors.border, ...shadows.large 
  },
  sellTitle: { fontSize: 13, fontWeight: '900', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: SIZES.md },
  sellInput: {
    backgroundColor: colors.surfaceLight, borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight, 
    paddingHorizontal: SIZES.md, height: 50, fontSize: 16, color: colors.textPrimary, marginBottom: SIZES.sm,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  conditionRow: { flexDirection: 'row', gap: SIZES.sm, marginBottom: SIZES.md, flexWrap: 'wrap' },
  conditionChip: { 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, 
    borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceLight 
  },
  conditionChipActive: { borderColor: colors.accentGreen, backgroundColor: colors.accentGreen + '10' },
  conditionChipText: { fontSize: 13, color: colors.textTertiary, fontWeight: '700' },
  conditionChipTextActive: { color: colors.accentGreen, fontWeight: '800' },
  sellBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: colors.accentGreen, borderRadius: 14, paddingVertical: 14, 
    gap: 8, marginTop: SIZES.xs, ...shadows.glow 
  },
  sellBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
  card: { 
    backgroundColor: colors.surface, borderRadius: 20, padding: SIZES.md, 
    marginBottom: SIZES.sm + 2, borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.small,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  itemThumb: { 
    width: 50, height: 50, borderRadius: 12, 
    marginRight: SIZES.md, backgroundColor: colors.surfaceLight 
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 },
  itemSeller: { fontSize: 12, color: colors.textTertiary, fontWeight: '600' },
  dot: { fontSize: 10, color: colors.textTertiary },
  itemTime: { fontSize: 12, color: colors.textTertiary },
  itemPrice: { fontSize: 18, fontWeight: '900', color: colors.accentGreen },
  cardBottom: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    marginTop: SIZES.md, paddingTop: SIZES.sm, borderTopWidth: 1, borderTopColor: colors.borderLight 
  },
  badges: { flexDirection: 'row', gap: 6 },
  conditionBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  conditionText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, 
    paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  reserveBtn: { 
    backgroundColor: colors.accentAmber + '10',
    borderColor: colors.accentAmber + '40',
  },
  chatBtn: { 
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.glow,
  },
  disabledBtn: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.borderLight,
    opacity: 0.6,
  },
  loadingBtn: { paddingHorizontal: 20 },
  actionText: { fontSize: 13, fontWeight: '900' },
  chatText: { color: '#FFF' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineBadge: { backgroundColor: colors.accentAmber, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  inlineBadgeText: { fontSize: 9, fontWeight: '900', color: '#000', textTransform: 'uppercase' },
  
  priceContainer: { alignItems: 'flex-end' },
  statusLabel: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusLabelText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  reservedIndicator: { 
    position: 'absolute', top: -2, right: -2, width: 10, height: 10, 
    borderRadius: 5, backgroundColor: colors.accentAmber, borderWidth: 2, borderColor: colors.surface 
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
  },
});

export default BuySellScreen;
