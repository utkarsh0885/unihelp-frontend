/**
 * BuySellScreen – Persistent + Theme-Aware
 * ─────────────────────────────────────────────
 * Campus marketplace to buy and sell items.
 * Uses DataContext for persistent data.
 * Premium Phase 9.0 Design System Redesign.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Image,
  Platform,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPostCard from '../components/AnimatedPostCard';
import * as ImagePicker from 'expo-image-picker';
import { uploadPostImage } from '../services/storageService';
import { initChat } from '../services/chatService';

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

const MarketplaceItemCard = React.memo(({
  item,
  colors,
  styles,
  STATUS_COLORS,
  CONDITION_COLORS,
  userId,
  reservingId,
  onEdit,
  onDelete,
  onCancelReservation,
  onMarkSold,
  onReserve,
  onContactSeller
}) => {
  const isReserved = item.status === 'Reserved';
  const isSold = item.status === 'Sold';
  const isReserving = reservingId === item.id || reservingId === item._id;
  const isOwner = userId && (userId === item.userId || userId === item.author);

  const statusColor = STATUS_COLORS[item.status || 'Available'] || colors.accent;
  const conditionColor = CONDITION_COLORS[item.condition] || colors.textSecondary;

  return (
    <View style={[styles.card, isSold && { opacity: 0.75 }]}>
      <View style={styles.cardTop}>
        {item.imageUrl ? (
          <LazyImage uri={item.imageUrl} style={styles.itemThumb} colors={colors} />
        ) : (
          <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
            <Ionicons name="image-outline" size={24} color={colors.textDisabled} />
          </View>
        )}
        <View style={styles.itemInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            {isSold ? (
              <View style={[styles.inlineBadge, { backgroundColor: colors.danger }]}>
                <Text style={[styles.inlineBadgeText, { color: colors.textOnPrimary }]}>Sold</Text>
              </View>
            ) : isReserved ? (
              <View style={[styles.inlineBadge, { backgroundColor: colors.warning }]}>
                <Text style={[styles.inlineBadgeText, { color: colors.textOnPrimary }]}>Reserved</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.itemMeta}>
            <Text style={styles.itemSeller} numberOfLines={1}>{item.username || item.authorName || 'Student'}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.itemTime}>{item.time || 'Public'}</Text>
          </View>
          {isOwner && isReserved && (
            <View style={styles.reservedByContainer}>
              <Text style={styles.reservedByStatus}>Reserved</Text>
              <Text style={styles.reservedByText}>Reserved By: {item.reservedByName || 'Unknown'}</Text>
            </View>
          )}
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
          <View style={[styles.statusLabel, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.statusLabelText, { color: statusColor }]}>
              {item.status || 'Available'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.badges}>
          <View style={[styles.conditionBadge, { backgroundColor: conditionColor + '18' }]}>
            <Text style={[styles.conditionText, { color: conditionColor }]}>{item.condition || 'Good'}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {isOwner ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && { opacity: 0.7 }]}
                onPress={() => onEdit(item)}
              >
                <Ionicons name="pencil" size={14} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && { opacity: 0.7 }]}
                onPress={() => onDelete(item.id || item._id)}
              >
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
              </Pressable>

              {isReserved && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.warningLight, borderColor: colors.warning + '40' },
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={() => onCancelReservation(item)}
                >
                  <Ionicons name="close-circle-outline" size={14} color={colors.warning} />
                  <Text style={[styles.actionText, { color: colors.warning }]}>Cancel Res.</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.soldBtn,
                  isSold && styles.disabledBtn,
                  pressed && !isSold && { opacity: 0.7 }
                ]}
                onPress={() => onMarkSold(item)}
                disabled={isSold}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={isSold ? colors.textDisabled : colors.accent} />
                <Text style={[styles.actionText, { color: isSold ? colors.textDisabled : colors.accent }]}>
                  {isSold ? 'Sold' : 'Mark Sold'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              {isReserved && item.reservedBy === userId ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.warningLight, borderColor: colors.warning + '40' },
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={() => onCancelReservation(item)}
                >
                  <Ionicons name="close-circle-outline" size={14} color={colors.warning} />
                  <Text style={[styles.actionText, { color: colors.warning }]}>Withdraw</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.reserveBtn,
                    (isReserved || isSold) && styles.disabledBtn,
                    isReserving && styles.loadingBtn,
                    pressed && !(isReserved || isSold || isReserving) && { opacity: 0.7 }
                  ]}
                  onPress={() => onReserve(item)}
                  disabled={isReserved || isSold || isReserving}
                >
                  {isReserving ? (
                    <ActivityIndicator size="small" color={colors.warning} />
                  ) : (
                    <>
                      <Ionicons
                        name={isSold ? "checkmark-done-circle-outline" : (isReserved ? "lock-closed" : "bookmark-outline")}
                        size={14}
                        color={(isReserved || isSold) ? colors.textDisabled : colors.warning}
                      />
                      <Text style={[styles.actionText, { color: (isReserved || isSold) ? colors.textDisabled : colors.warning }]}>
                        {isSold ? 'Sold' : (isReserved ? 'Reserved' : 'Reserve')}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.chatBtn,
                  isSold && styles.disabledBtn,
                  pressed && !isSold && { opacity: 0.85 }
                ]}
                onPress={() => onContactSeller(item)}
                disabled={isSold}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={isSold ? colors.textDisabled : colors.textOnPrimary} />
                <Text style={[styles.actionText, styles.chatText, isSold && { color: colors.textDisabled }]}>Contact Seller</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
});

const BuySellScreen = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const {
    items, itemsLoading,
    toggleLike, toggleSave, votePoll, userId,
    addItem, reserveItem, cancelReservation, updatePost, deletePost,
    loadMarketplacePosts, marketplaceHasMore, marketplaceLoadingMore
  } = useData();

  const [showSell, setShowSell] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCondition, setItemCondition] = useState('Good');
  const [posting, setPosting] = useState(false);
  const [reservingId, setReservingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All Conditions');

  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingItem, setEditingItem] = useState(null);

  const [refreshing, setRefreshing] = useState(false);

  const elevation = useMemo(() => getElevation(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors, elevation, isDark), [colors, elevation, isDark]);

  const handleGoBack = useCallback(() => {
    if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Main');
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
      window.history.back();
    }
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMarketplacePosts(true);
    } catch (e) {
      console.warn('[BuySellScreen] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [loadMarketplacePosts]);

  const handleLoadMore = useCallback(() => {
    if (marketplaceHasMore && !marketplaceLoadingMore) {
      loadMarketplacePosts(false);
    }
  }, [marketplaceHasMore, marketplaceLoadingMore, loadMarketplacePosts]);

  const renderFooter = useCallback(() => {
    if (!marketplaceLoadingMore) return null;
    return (
      <View style={{ paddingVertical: SPACING.lg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [marketplaceLoadingMore, colors]);

  const handleLike = useCallback((postId) => toggleLike(postId), [toggleLike]);
  const handleSave = useCallback((postId) => toggleSave(postId), [toggleSave]);

  const mergedData = useMemo(() => {
    return items.map(i => ({ ...i, isGenericPost: false })).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : 0;
      const dateB = b.createdAt ? new Date(b.createdAt) : 0;
      return dateB - dateA;
    });
  }, [items]);

  const filteredData = useMemo(() => {
    return mergedData.filter(item => {
      const statusValue = item.status || 'Available';
      const matchesStatus = selectedStatus === 'All' ||
        statusValue.toUpperCase() === selectedStatus.toUpperCase();

      const conditionValue = item.condition || '';
      const matchesCondition = selectedCondition === 'All Conditions' ||
        conditionValue.toUpperCase() === selectedCondition.toUpperCase();

      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesStatus && matchesCondition;

      const title = (item.title || '').toLowerCase();
      const seller = (item.username || item.authorName || '').toLowerCase();

      const matchesSearch = title.includes(query) || seller.includes(query);

      return matchesStatus && matchesCondition && matchesSearch;
    });
  }, [mergedData, selectedStatus, selectedCondition, searchQuery]);

  const CONDITION_COLORS = useMemo(() => ({
    'New': colors.accent, 'Like New': colors.info, 'Good': colors.warning, 'Used': colors.textSecondary,
  }), [colors]);

  const STATUS_COLORS = useMemo(() => ({
    'Available': colors.accent, 'Reserved': colors.warning, 'Sold': colors.danger,
  }), [colors]);

  const handlePickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to upload listing images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          size: asset.fileSize || 0,
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (e) {
      console.warn('ImagePicker error:', e);
      Alert.alert('Error', 'Could not open image picker.');
    }
  }, []);

  const handleEdit = useCallback((item) => {
    setEditingItem(item);
    setItemTitle(item.title || '');
    setItemPrice(item.price ? item.price.toString().replace(/[^0-9]/g, '') : '');
    setItemCondition(item.condition || 'Good');
    setSelectedImage(item.imageUrl ? { uri: item.imageUrl } : null);
    setShowSell(true);
  }, []);

  useEffect(() => {
    if (route?.params?.editItem) {
      handleEdit(route.params.editItem);
      navigation.setParams({ editItem: null });
    }
  }, [route?.params?.editItem, handleEdit, navigation]);

  const handleDelete = useCallback(async (itemId) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('Are you sure you want to permanently delete this listing?');
      if (confirmDelete) {
        try {
          await deletePost(itemId);
          Alert.alert('Deleted', 'Listing deleted successfully.');
        } catch (e) {
          Alert.alert('Error', 'Failed to delete listing.');
        }
      }
    } else {
      Alert.alert(
        'Delete Listing',
        'Are you sure you want to delete this item listing?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deletePost(itemId);
                Alert.alert('Deleted', 'Listing deleted successfully.');
              } catch (e) {
                Alert.alert('Error', 'Failed to delete listing.');
              }
            }
          }
        ]
      );
    }
  }, [deletePost]);

  const handleMarkSold = useCallback(async (item) => {
    const itemId = item.id || item._id;
    const performMarkSold = async () => {
      try {
        await updatePost(itemId, { status: 'Sold', soldAt: new Date().toISOString() });
        Alert.alert('Success', 'Item marked as sold.');
      } catch (error) {
        Alert.alert('Error', 'Failed to mark item as sold.');
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
        if (Platform.OS === 'web') {
          alert('Reservation cancelled.');
        } else {
          Alert.alert('Cancelled', 'The reservation has been cancelled.');
        }
      } catch (error) {
        if (Platform.OS === 'web') {
          alert('Failed to cancel reservation.');
        } else {
          Alert.alert('Error', 'Failed to cancel reservation.');
        }
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

  const handleSell = useCallback(async () => {
    if (!itemTitle.trim() || !itemPrice.trim()) {
      Alert.alert('Missing Info', 'Please enter title and price.');
      return;
    }
    setPosting(true);
    try {
      let imageUrl = selectedImage ? (typeof selectedImage === 'string' ? selectedImage : selectedImage.uri) : null;

      if (selectedImage && selectedImage.uri && selectedImage.uri !== editingItem?.imageUrl) {
        setUploadingImage(true);
        setUploadProgress(0);
        try {
          imageUrl = await uploadPostImage(
            userId || 'anonymous',
            selectedImage.uri,
            selectedImage.size,
            selectedImage.mimeType,
            (progress) => setUploadProgress(progress)
          );
        } catch (err) {
          Alert.alert('Upload Failed', 'Failed to upload item image.');
          setPosting(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
          setUploadProgress(0);
        }
      }

      if (editingItem) {
        const id = editingItem.id || editingItem._id;
        await updatePost(id, {
          title: itemTitle.trim(),
          price: `$${itemPrice.trim()}`,
          condition: itemCondition,
          imageUrl,
        });
        Alert.alert('Updated! ✨', 'Your listing has been updated.');
      } else {
        const newItemId = await addItem(itemTitle.trim(), `$${itemPrice.trim()}`, itemCondition, imageUrl);
        console.log('[Marketplace] Successfully posted item to central DB. ID:', newItemId);
        Alert.alert('Listed! 🛒', 'Your item is now visible to all students on campus!');
      }

      setItemTitle('');
      setItemPrice('');
      setItemCondition('Good');
      setSelectedImage(null);
      setEditingItem(null);
      setShowSell(false);

      if (!editingItem && navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('Main', { screen: 'Home' });
      }
    } catch (e) {
      Alert.alert('Error', `Failed to ${editingItem ? 'update' : 'list'} item.`);
    } finally {
      setPosting(false);
    }
  }, [itemTitle, itemPrice, itemCondition, selectedImage, editingItem, addItem, updatePost, userId, navigation]);

  const handleReserve = useCallback(async (item) => {
    const id = item.id || item._id;
    if (item.status === 'Reserved' || item.status === 'Sold') return;

    setReservingId(id);
    try {
      await reserveItem(id);
      Alert.alert('Reserved! 🤝', `You've reserved "${item.title}". The seller has been notified.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to reserve item.');
    } finally {
      setReservingId(null);
    }
  }, [reserveItem]);

  const handleContactSeller = useCallback(async (item) => {
    if (item.status === 'Sold') return;
    const sellerId = item.userId || item.author;
    const sellerName = item.username || item.authorName || 'Seller';
    if (!sellerId) {
      Alert.alert('Error', 'Seller information is not available.');
      return;
    }
    if (sellerId === userId) {
      Alert.alert('Info', 'You cannot contact yourself.');
      return;
    }

    try {
      const chatObj = await initChat(sellerId, sellerName, item);
      navigation.navigate('Chat', { chat: chatObj });
    } catch (e) {
      console.error('Failed to initialize chat:', e);
      if (Platform.OS === 'web') {
        alert('Failed to contact seller. Please try again later.');
      } else {
        Alert.alert('Error', 'Failed to contact seller. Please try again later.');
      }
    }
  }, [userId, navigation]);

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

    return (
      <MarketplaceItemCard
        item={item}
        colors={colors}
        styles={styles}
        STATUS_COLORS={STATUS_COLORS}
        CONDITION_COLORS={CONDITION_COLORS}
        userId={userId}
        reservingId={reservingId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancelReservation={handleCancelReservation}
        onMarkSold={handleMarkSold}
        onReserve={handleReserve}
        onContactSeller={handleContactSeller}
      />
    );
  }, [
    navigation, handleLike, handleSave, votePoll, userId, colors, styles,
    STATUS_COLORS, CONDITION_COLORS, reservingId, handleEdit, handleDelete,
    handleCancelReservation, handleMarkSold, handleReserve, handleContactSeller
  ]);

  return (
    <View style={styles.screen}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <View style={styles.header}>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Buy / Sell</Text>
          <View style={{ flexDirection: 'row', gap: SPACING.xs }}>
            <Pressable
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
              onPress={() => navigation.navigate('MyListings')}
            >
              <Ionicons name="list" size={20} color={colors.textPrimary} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
              onPress={() => {
                if (showSell) {
                  setItemTitle('');
                  setItemPrice('');
                  setItemCondition('Good');
                  setSelectedImage(null);
                  setEditingItem(null);
                }
                setShowSell(!showSell);
              }}
            >
              <Ionicons name={showSell ? 'close' : 'add'} size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>
      </View>

      {showSell && (
        <View style={styles.sellCard}>
          <Text style={styles.sellTitle}>{editingItem ? 'Edit Listing' : 'Sell an Item'}</Text>

          {selectedImage ? (
            <View style={styles.imagePreviewWrap}>
              <Image
                source={{ uri: typeof selectedImage === 'string' ? selectedImage : selectedImage.uri }}
                style={styles.imagePreview}
              />
              <Pressable
                style={styles.removeImageBtn}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={24} color={colors.danger} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.imagePickerBtn, pressed && { opacity: 0.8 }]}
              onPress={handlePickImage}
            >
              <Ionicons name="image-outline" size={24} color={colors.primary} />
              <Text style={styles.imagePickerText}>Add Listing Image</Text>
            </Pressable>
          )}

          {uploadingImage && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${uploadProgress}%`, backgroundColor: colors.info }]} />
              </View>
              <Text style={styles.progressText}>
                Uploading Image: {uploadProgress}%
              </Text>
            </View>
          )}

          <TextInput
            style={styles.sellInput}
            placeholder="Item name"
            placeholderTextColor={colors.textDisabled}
            value={itemTitle}
            onChangeText={setItemTitle}
          />
          <TextInput
            style={styles.sellInput}
            placeholder="Price (e.g. 50)"
            placeholderTextColor={colors.textDisabled}
            keyboardType="numeric"
            value={itemPrice}
            onChangeText={setItemPrice}
          />
          <View style={styles.conditionRow}>
            {['New', 'Like New', 'Good', 'Used'].map((c) => (
              <Pressable
                key={c}
                style={[styles.conditionChip, itemCondition === c && styles.conditionChipActive]}
                onPress={() => setItemCondition(c)}
              >
                <Text style={[styles.conditionChipText, itemCondition === c && styles.conditionChipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.sellBtn, (posting || pressed) && { opacity: 0.85 }]}
            onPress={handleSell}
            disabled={posting}
          >
            {posting ? <ActivityIndicator size="small" color={colors.textOnPrimary} /> : (
              <>
                <Ionicons name="storefront-outline" size={18} color={colors.textOnPrimary} />
                <Text style={styles.sellBtnText}>{editingItem ? 'Save Changes' : 'List Item'}</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {!showSell && (
        <View style={styles.filterSectionContainer}>
          <Text style={styles.sectionTitle}>Marketplace</Text>

          <View style={styles.searchBarContainer}>
            <Ionicons name="search-outline" size={18} color={colors.textDisabled} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search item title or seller..."
              placeholderTextColor={colors.textDisabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
              </Pressable>
            )}
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Status</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScrollContainer}
              style={styles.chipsScrollView}
            >
              {['All', 'Available', 'Reserved', 'Sold'].map((status) => {
                const isActive = selectedStatus === status;
                return (
                  <Pressable
                    key={status}
                    style={[styles.chipBtn, isActive ? styles.chipBtnActive : styles.chipBtnInactive]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <Text style={[styles.chipText, isActive ? styles.chipTextActive : { color: colors.textSecondary }]}>
                      {status}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.filterGroup, styles.conditionFilterGroup]}>
            <Text style={styles.filterGroupLabel}>Condition</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScrollContainer}
              style={styles.chipsScrollView}
            >
              {['All Conditions', 'New', 'Like New', 'Good', 'Used'].map((cond) => {
                const isActive = selectedCondition === cond;
                return (
                  <Pressable
                    key={cond}
                    style={[styles.chipBtn, isActive ? styles.chipBtnActive : styles.chipBtnInactive]}
                    onPress={() => setSelectedCondition(cond)}
                  >
                    <Text style={[styles.chipText, isActive ? styles.chipTextActive : { color: colors.textSecondary }]}>
                      {cond}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {itemsLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id || item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="storefront-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery.trim() !== '' || selectedStatus !== 'All' || selectedCondition !== 'All Conditions'
                  ? 'No matches found'
                  : 'No items yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim() !== '' || selectedStatus !== 'All' || selectedCondition !== 'All Conditions'
                  ? 'Try broadening your search query or adjusting your filters.'
                  : 'Be the first student to list an item for sale!'}
              </Text>
            </View>
          }
        />
      )}
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
  list: { padding: SPACING.md, paddingBottom: SPACING.massive },
  sellCard: {
    margin: SPACING.md,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.md,
  },
  sellTitle: {
    ...TYPOGRAPHY.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  sellInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: SPACING.md,
    minHeight: SIZES.layout.minTouchTarget + 6,
    ...TYPOGRAPHY.body,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  conditionRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md, flexWrap: 'wrap' },
  conditionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    minHeight: 36,
    justifyContent: 'center',
  },
  conditionChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  conditionChipText: { ...TYPOGRAPHY.caption, color: colors.textSecondary, fontWeight: FONT_WEIGHTS.semibold },
  conditionChipTextActive: { color: colors.primary, fontWeight: FONT_WEIGHTS.bold },
  sellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: RADIUS.medium,
    minHeight: SIZES.layout.minTouchTarget + 6,
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    ...elevation.sm,
  },
  sellBtnText: { ...TYPOGRAPHY.button, color: colors.textOnPrimary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.large,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  itemThumb: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.medium,
    marginRight: SPACING.md,
    backgroundColor: colors.surfaceSubtle,
  },
  itemThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  itemInfo: { flex: 1 },
  itemTitle: { ...TYPOGRAPHY.subtitle, color: colors.textPrimary },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: SPACING.xxs },
  itemSeller: { ...TYPOGRAPHY.caption, color: colors.textMuted, maxWidth: 130 },
  dot: { ...TYPOGRAPHY.caption, color: colors.textDisabled },
  itemTime: { ...TYPOGRAPHY.caption, color: colors.textMuted },
  itemPrice: { ...TYPOGRAPHY.h3, color: colors.textPrimary },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  badges: { flexDirection: 'row', gap: SPACING.xxs },
  conditionBadge: { borderRadius: RADIUS.small, paddingHorizontal: SPACING.xs, paddingVertical: 4 },
  conditionText: { ...TYPOGRAPHY.caption, fontSize: 11, fontWeight: FONT_WEIGHTS.bold },

  actionRow: { flexDirection: 'row', gap: SPACING.xs, width: '100%', maxWidth: 340 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
  },
  reserveBtn: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning + '40',
  },
  chatBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...elevation.xs,
  },
  disabledBtn: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderSubtle,
    opacity: 0.5,
  },
  loadingBtn: { paddingHorizontal: SPACING.md },
  actionText: { ...TYPOGRAPHY.caption, fontWeight: FONT_WEIGHTS.bold },
  chatText: { color: colors.textOnPrimary },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1, paddingRight: SPACING.xs },
  inlineBadge: { borderRadius: RADIUS.small, paddingHorizontal: SPACING.xs, paddingVertical: 2 },
  inlineBadgeText: { ...TYPOGRAPHY.caption, fontSize: 10, fontWeight: FONT_WEIGHTS.bold },
  soldBtn: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent + '40',
  },

  reservedByContainer: {
    marginTop: SPACING.xs,
    padding: SPACING.xs,
    backgroundColor: colors.warningLight,
    borderRadius: RADIUS.small,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    alignSelf: 'flex-start',
  },
  reservedByStatus: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.warning,
    textTransform: 'uppercase',
  },
  reservedByText: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  priceContainer: { alignItems: 'flex-end' },
  statusLabel: { marginTop: 4, paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: RADIUS.small },
  statusLabelText: { ...TYPOGRAPHY.caption, fontSize: 10, fontWeight: FONT_WEIGHTS.bold },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Empty State Styles
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
    maxWidth: 280,
  },

  // Image Picker & Uploading Styles
  imagePickerBtn: {
    height: 96,
    borderRadius: RADIUS.large,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  imagePickerText: {
    ...TYPOGRAPHY.label,
    color: colors.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  imagePreviewWrap: {
    position: 'relative',
    borderRadius: RADIUS.large,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.large,
    backgroundColor: colors.surfaceSubtle,
  },
  removeImageBtn: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.full,
  },
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressBarBg: {
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  editBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary + '30',
  },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger + '30',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.medium,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    minHeight: SIZES.layout.minTouchTarget + 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.xs,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: colors.textPrimary,
    paddingVertical: SPACING.sm,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  clearSearchBtn: {
    padding: SPACING.xxs,
  },
  filterSectionContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: colors.background,
    width: '100%',
    alignSelf: 'center',
    maxWidth: Platform.OS === 'web' ? 700 : '100%',
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  filterGroup: {
    marginBottom: SPACING.md,
  },
  conditionFilterGroup: {
    marginBottom: SPACING.lg,
  },
  filterGroupLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textMuted,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipsScrollView: {
    maxHeight: 48,
  },
  chipsScrollContainer: {
    paddingHorizontal: 2,
    alignItems: 'center',
    gap: SPACING.xs,
    paddingBottom: 4,
  },
  chipBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipBtnInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: FONT_WEIGHTS.semibold,
    textAlign: 'center',
  },
  chipTextActive: {
    color: colors.textOnPrimary,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

export default BuySellScreen;
