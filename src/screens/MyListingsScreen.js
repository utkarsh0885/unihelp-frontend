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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { SIZES } from '../constants/theme';

const formatPrice = (price) => {
  if (price === undefined || price === null || price === '') return '₹0';
  const cleaned = String(price).replace(/[$₹\s]/g, '');
  return `₹${cleaned}`;
};

const MyListingsScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const { deletePost, updatePost, cancelReservation } = useData();

  // Unified Style Object declared near the top to prevent TDZ issues
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('All');

  const activeUserId = user?.id;

  // Real-time Firestore subscription matching user's marketplace posts
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

        // Sort locally by createdAt desc safely
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

  // Derived statistics (Memoized)
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

  // Derived filtered items (Memoized)
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
    const isReserved = item.status === 'Reserved';
    const isSold = item.status === 'Sold';

    const getStatusColor = (status) => {
      if (status === 'Sold') return colors.error || '#EF4444';
      if (status === 'Reserved') return colors.accentAmber || '#F59E0B';
      return colors.accentGreen || '#10B981';
    };

    return (
      <View style={[styles.card, isSold && { opacity: 0.85 }]}>
        <View style={styles.cardContent}>
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
          )}
          <View style={styles.cardInfo}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status || 'Available') + '15', borderColor: getStatusColor(item.status || 'Available') + '30' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status || 'Available') }]}>
                  {item.status || 'Available'}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardPrice, { color: colors.primary }]}>{formatPrice(item.price)}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>Condition: {item.condition || 'Good'}</Text>
              {item.downloads !== undefined && (
                <Text style={[styles.metaText, { color: colors.textTertiary }]}>· {item.downloads} downloads</Text>
              )}
            </View>
          </View>
        </View>

        {/* Action button row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEdit(item)} activeOpacity={0.7}>
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={14} color={colors.error || '#EF4444'} />
            <Text style={[styles.actionText, { color: colors.error || '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>

          {isReserved && (
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleCancelReservation(item)} activeOpacity={0.7}>
              <Ionicons name="close-circle-outline" size={14} color={colors.accentAmber || '#F59E0B'} />
              <Text style={[styles.actionText, { color: colors.accentAmber || '#F59E0B' }]}>Cancel Res.</Text>
            </TouchableOpacity>
          )}

          {!isSold && (
            <TouchableOpacity style={[styles.actionBtn, styles.soldBtn]} onPress={() => handleMarkSold(item)} activeOpacity={0.7}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.accentGreen || '#10B981'} />
              <Text style={[styles.actionText, { color: colors.accentGreen || '#10B981' }]}>Mark Sold</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [colors, handleEdit, handleDelete, handleCancelReservation, handleMarkSold, styles]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: isDark ? colors.background : '#1E3A8A' }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={isDark ? ['#1A1A1A', '#0D0D0D'] : ['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Listings</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
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
              <Text style={[styles.statsValue, { color: colors.accentGreen || '#10B981' }]}>{stats.active}</Text>
              <Text style={styles.statsLabel}>Active</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={[styles.statsValue, { color: colors.accentAmber || '#F59E0B' }]}>{stats.reserved}</Text>
              <Text style={styles.statsLabel}>Reserved</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={[styles.statsValue, { color: colors.error || '#EF4444' }]}>{stats.sold}</Text>
              <Text style={styles.statsLabel}>Sold</Text>
            </View>
          </View>

          {/* Local Filter Tabs */}
          <View style={styles.tabsContainer}>
            {['All', 'Active', 'Reserved', 'Sold'].map((tab) => {
              const isActive = selectedTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => setSelectedTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, isActive ? styles.tabTextActive : { color: colors.textSecondary }]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
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
                    <Ionicons name="storefront-outline" size={40} color={colors.primary} />
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

const createStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: { zIndex: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.md,
    paddingTop: SIZES.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  scroll: {
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    marginTop: SIZES.md,
    gap: 8,
  },
  statsCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textTertiary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.md,
    marginTop: 20,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: SIZES.md,
    paddingTop: 16,
  },
  loaderWrap: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: SIZES.md,
    marginBottom: SIZES.sm + 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: SIZES.md,
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
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  editBtn: {
    backgroundColor: colors.primaryLight || colors.primary + '10',
    borderColor: colors.primary + '30',
  },
  deleteBtn: {
    backgroundColor: '#EF444410',
    borderColor: '#EF444430',
  },
  cancelBtn: {
    backgroundColor: '#F59E0B10',
    borderColor: '#F59E0B30',
  },
  soldBtn: {
    backgroundColor: '#10B98110',
    borderColor: '#10B98130',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});

export default MyListingsScreen;
