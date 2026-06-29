/**
 * MyListingsScreen.js
 * ─────────────────────────────────────────────
 * Professional seller dashboard.
 * Premium Phase 9.0 Design System Redesign.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import ResponsiveContainer from '../components/ResponsiveContainer';

// Design System
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS } from '../theme';
import { getElevation } from '../theme/elevation';

const formatPrice = (price) => {
  if (price === undefined || price === null || price === '') return '₹0';
  const cleaned = String(price).replace(/[$₹\s]/g, '');
  return `₹${cleaned}`;
};

const LazyImage = React.memo(({ uri, style, colors }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={style}>
      {loading && !error && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSubtle }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {error ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSubtle }]}>
          <Ionicons name="image-outline" size={20} color={colors.textDisabled} />
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={style}
          onLoadEnd={() => setLoading(false)}
          onError={() => setError(true)}
        />
      )}
    </View>
  );
});

const MyListingItemCard = React.memo(({
  item,
  colors,
  styles,
  onEdit,
  onDelete,
  onCancelReservation,
  onMarkSold
}) => {
  const isReserved = item.status === 'Reserved';
  const isSold = item.status === 'Sold';

  const getStatusColor = (status) => {
    if (status === 'Sold') return colors.danger;
    if (status === 'Reserved') return colors.warning;
    return colors.accent;
  };

  const statusColor = getStatusColor(item.status || 'Available');

  return (
    <View style={[styles.card, isSold && { opacity: 0.75 }]}>
      <View style={styles.cardContent}>
        {item.imageUrl ? (
          <LazyImage uri={item.imageUrl} style={styles.cardImage} colors={colors} />
        ) : (
          <View style={[styles.cardImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="image-outline" size={24} color={colors.textDisabled} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status || 'Available'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Condition: {item.condition || 'Good'}</Text>
            {item.downloads !== undefined && (
              <Text style={styles.metaText}>· {item.downloads} downloads</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && { opacity: 0.7 }]}
          onPress={() => onEdit(item)}
        >
          <Ionicons name="pencil" size={14} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && { opacity: 0.7 }]}
          onPress={() => onDelete(item)}
        >
          <Ionicons name="trash-outline" size={14} color={colors.danger} />
          <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
        </Pressable>

        {isReserved && (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.cancelBtn, pressed && { opacity: 0.7 }]}
            onPress={() => onCancelReservation(item)}
          >
            <Ionicons name="close-circle-outline" size={14} color={colors.warning} />
            <Text style={[styles.actionText, { color: colors.warning }]}>Cancel Res.</Text>
          </Pressable>
        )}

        {!isSold && (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.soldBtn, pressed && { opacity: 0.7 }]}
            onPress={() => onMarkSold(item)}
          >
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.accent} />
            <Text style={[styles.actionText, { color: colors.accent }]}>Mark Sold</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const MyListingsScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { deletePost, updatePost, cancelReservation } = useData();

  const elevation = useMemo(() => getElevation(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors, elevation, isDark), [colors, elevation, isDark]);

  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('All');

  const activeUserId = user?.id;

  useEffect(() => {
    if (!activeUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'posts'),
      where('author', '==', activeUserId),
      where('category', '==', 'Buy/Sell')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postsList = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          postsList.push({
            id: doc.id,
            ...data,
          });
        });

        postsList.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt?.seconds * 1000 || a.createdAt) : 0;
          const dateB = b.createdAt ? new Date(b.createdAt?.seconds * 1000 || b.createdAt) : 0;
          return dateB - dateA;
        });

        setMyItems(postsList);
        setLoading(false);
      },
      (error) => {
        console.error('[MyListingsScreen] Firestore error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeUserId]);

  const stats = useMemo(() => {
    let active = 0;
    let reserved = 0;
    let sold = 0;

    myItems.forEach((item) => {
      const status = item.status || 'Available';
      if (status === 'Available') active++;
      else if (status === 'Reserved') reserved++;
      else if (status === 'Sold') sold++;
    });

    return {
      active,
      reserved,
      sold,
      total: myItems.length,
    };
  }, [myItems]);

  const filteredItems = useMemo(() => {
    return myItems.filter((item) => {
      const status = item.status || 'Available';
      if (selectedTab === 'All') return true;
      if (selectedTab === 'Active') return status === 'Available';
      if (selectedTab === 'Reserved') return status === 'Reserved';
      if (selectedTab === 'Sold') return status === 'Sold';
      return true;
    });
  }, [myItems, selectedTab]);

  const handleGoBack = useCallback(() => {
    if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  }, [navigation]);

  const handleEdit = useCallback((item) => {
    navigation.navigate('BuySell', { editItem: item });
  }, [navigation]);

  const handleDelete = useCallback(async (item) => {
    const itemId = item.id || item._id;
    const performDelete = async () => {
      try {
        await deletePost(itemId);
        if (Platform.OS === 'web') alert('Listing deleted successfully.');
        else Alert.alert('Deleted', 'Listing deleted successfully.');
      } catch (e) {
        if (Platform.OS === 'web') alert('Failed to delete listing.');
        else Alert.alert('Error', 'Failed to delete listing.');
      }
    };

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('Are you sure you want to delete this item listing?');
      if (confirmDelete) {
        await performDelete();
      }
    } else {
      Alert.alert(
        'Delete Listing',
        'Are you sure you want to delete this item listing?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  }, [deletePost]);

  const handleMarkSold = useCallback(async (item) => {
    const itemId = item.id || item._id;
    const performMarkSold = async () => {
      try {
        await updatePost(itemId, { status: 'Sold', soldAt: new Date().toISOString() });
        if (Platform.OS === 'web') alert('Item marked as sold.');
        else Alert.alert('Success', 'Item marked as sold.');
      } catch (error) {
        if (Platform.OS === 'web') alert('Failed to mark item as sold.');
        else Alert.alert('Error', 'Failed to mark item as sold.');
      }
    };

    if (Platform.OS === 'web') {
      const confirmSold = window.confirm('Are you sure you sold this item?');
      if (confirmSold) {
        await performMarkSold();
      }
    } else {
      Alert.alert(
        'Mark as Sold',
        'Are you sure you sold this item?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: performMarkSold }
        ]
      );
    }
  }, [updatePost]);

  const handleCancelReservation = useCallback(async (item) => {
    const itemId = item.id || item._id;
    const performCancel = async () => {
      try {
        await cancelReservation(itemId);
        if (Platform.OS === 'web') alert('Reservation cancelled.');
        else Alert.alert('Cancelled', 'The reservation has been cancelled.');
      } catch (error) {
        if (Platform.OS === 'web') alert('Failed to cancel reservation.');
        else Alert.alert('Error', 'Failed to cancel reservation.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Cancel this reservation?')) {
        await performCancel();
      }
    } else {
      Alert.alert(
        'Cancel Reservation',
        'Are you sure you want to cancel this reservation?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel', onPress: performCancel, style: 'destructive' }
        ]
      );
    }
  }, [cancelReservation]);

  const renderItem = useCallback(({ item }) => {
    return (
      <MyListingItemCard
        item={item}
        colors={colors}
        styles={styles}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancelReservation={handleCancelReservation}
        onMarkSold={handleMarkSold}
      />
    );
  }, [colors, styles, handleEdit, handleDelete, handleCancelReservation, handleMarkSold]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <View style={styles.header}>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>My Listings</Text>
          <View style={{ width: SIZES.layout.minTouchTarget }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer maxWidth={700} withCardStyle={false}>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statsCard}>
              <Text style={styles.statsValue}>{stats.total}</Text>
              <Text style={styles.statsLabel}>Total</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={[styles.statsValue, { color: colors.accent }]}>{stats.active}</Text>
              <Text style={styles.statsLabel}>Active</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={[styles.statsValue, { color: colors.warning }]}>{stats.reserved}</Text>
              <Text style={styles.statsLabel}>Reserved</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={[styles.statsValue, { color: colors.danger }]}>{stats.sold}</Text>
              <Text style={styles.statsLabel}>Sold</Text>
            </View>
          </View>

          {/* Local Filter Tabs */}
          <View style={styles.tabsContainer}>
            {['All', 'Active', 'Reserved', 'Sold'].map((tab) => {
              const isActive = selectedTab === tab;
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabBtn, isActive ? styles.tabBtnActive : styles.tabBtnInactive]}
                  onPress={() => setSelectedTab(tab)}
                >
                  <Text style={[styles.tabText, isActive ? styles.tabTextActive : { color: colors.textSecondary }]}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.id || item._id}
              scrollEnabled={false}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="storefront-outline" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>No listings found</Text>
                  <Text style={styles.emptySubtitle}>
                    {selectedTab === 'All'
                      ? "You haven't listed any items for sale yet."
                      : `You don't have any items in the "${selectedTab}" state.`}
                  </Text>
                </View>
              }
            />
          )}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors, elevation, isDark) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 56,
  },
  iconBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    color: colors.textPrimary,
  },
  scroll: {
    paddingBottom: SPACING.xxxl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  statsCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.large,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.xs,
  },
  statsValue: {
    ...TYPOGRAPHY.h3,
    color: colors.textPrimary,
  },
  statsLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabBtnInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  tabText: {
    ...TYPOGRAPHY.caption,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  loaderWrap: {
    marginTop: SPACING.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...elevation.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImage: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.medium,
    marginRight: SPACING.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...TYPOGRAPHY.subtitle,
    color: colors.textPrimary,
    flex: 1,
    marginRight: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.small,
    borderWidth: 1,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    textTransform: 'uppercase',
  },
  cardPrice: {
    ...TYPOGRAPHY.h3,
    color: colors.textPrimary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: SPACING.md,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    minHeight: 36,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    gap: 4,
  },
  actionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: FONT_WEIGHTS.bold,
  },
  editBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary + '30',
  },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger + '30',
  },
  cancelBtn: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning + '30',
  },
  soldBtn: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent + '30',
  },
  emptyContainer: {
    paddingVertical: SPACING.massive,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: SPACING.xxs,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MyListingsScreen;
