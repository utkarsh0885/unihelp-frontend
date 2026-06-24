/**
 * BuySellScreen – Persistent + Theme-Aware
 * ─────────────────────────────────────────────
 * Campus marketplace to buy and sell items.
 * Uses DataContext for persistent data.
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPostCard from '../components/AnimatedPostCard';
import * as ImagePicker from 'expo-image-picker';
import { uploadPostImage } from '../services/storageService';
import { initChat } from '../services/chatService';

const formatPrice = (price) => {
  if (price === undefined || price === null || price === '') return '₹0';
  const cleaned = String(price).replace(/[$₹\s]/g, '');
  return `₹${cleaned}`;
};

const BuySellScreen = ({ navigation, route }) => {
  const { colors, shadows, isDark } = useTheme();
  const { 
    items, itemsLoading, posts, 
    toggleLike, toggleSave, votePoll, userId, refreshData,
    addItem, reserveItem, updatePost, deletePost 
  } = useData();
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  const handleGoBack = () => {
    if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Main');
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
      window.history.back();
    }
  };

  const handleLike = useCallback((postId) => toggleLike(postId), [toggleLike]);
  const handleSave = useCallback((postId) => toggleSave(postId), [toggleSave]);

  // Unified Feed: Items mapped to product layout cleanly to prevent duplicate generic posts
  const mergedData = useMemo(() => {
    return items.map(i => ({ ...i, isGenericPost: false })).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : 0;
      const dateB = b.createdAt ? new Date(b.createdAt) : 0;
      return dateB - dateA;
    });
  }, [items]);

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
  
  // Photo upload and edit listing states
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingItem, setEditingItem] = useState(null);

  const handlePickImage = async () => {
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
  };

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
      // Clear route parameters so it doesn't trigger repeatedly
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
          { 
            text: 'Confirm', 
            onPress: performMarkSold
          }
        ]
      );
    }
  }, [updatePost]);


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
      
      // Clear form
      setItemTitle('');
      setItemPrice('');
      setItemCondition('Good');
      setSelectedImage(null);
      setEditingItem(null);
      setShowSell(false);

      // Navigate back to Home on successful creation (if not editing)
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

    const isReserved = item.status === 'Reserved';
    const isSold = item.status === 'Sold';
    const isReserving = reservingId === item.id || reservingId === item._id;
    const isOwner = userId && (userId === item.userId || userId === item.author);

    return (
      <View style={[styles.card, isSold && { opacity: 0.85 }]}>
        <View style={styles.cardTop}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />
          ) : (
            <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
              <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
            </View>
          )}
          <View style={styles.itemInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              {isSold ? (
                <View style={[styles.inlineBadge, styles.soldBadge]}>
                  <Text style={[styles.inlineBadgeText, styles.soldBadgeText]}>Sold</Text>
                </View>
              ) : isReserved ? (
                <View style={styles.inlineBadge}>
                  <Text style={styles.inlineBadgeText}>Reserved</Text>
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
            {isOwner ? (
              <>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.editBtn]} 
                  onPress={() => handleEdit(item)} 
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={14} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionBtn, styles.deleteBtn]} 
                  onPress={() => handleDelete(item.id || item._id)} 
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.error || colors.accent} />
                  <Text style={[styles.actionText, { color: colors.error || colors.accent }]}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    styles.soldBtn,
                    isSold && styles.disabledBtn
                  ]} 
                  onPress={() => handleMarkSold(item)} 
                  activeOpacity={0.7}
                  disabled={isSold}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color={isSold ? colors.textTertiary : colors.accentGreen} />
                  <Text style={[styles.actionText, { color: isSold ? colors.textTertiary : colors.accentGreen }]}>
                    {isSold ? 'Sold' : 'Mark Sold'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    styles.reserveBtn, 
                    (isReserved || isSold) && styles.disabledBtn,
                    isReserving && styles.loadingBtn
                  ]} 
                  onPress={() => handleReserve(item)} 
                  activeOpacity={0.7}
                  disabled={isReserved || isSold || isReserving}
                >
                  {isReserving ? (
                    <ActivityIndicator size="small" color={colors.accentAmber} />
                  ) : (
                    <>
                      <Ionicons 
                        name={isSold ? "checkmark-done-circle-outline" : (isReserved ? "lock-closed" : "bookmark-outline")} 
                        size={14} 
                        color={(isReserved || isSold) ? colors.textTertiary : colors.accentAmber} 
                      />
                      <Text style={[styles.actionText, { color: (isReserved || isSold) ? colors.textTertiary : colors.accentAmber }]}>
                        {isSold ? 'Sold' : (isReserved ? 'Reserved' : 'Reserve')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionBtn, styles.chatBtn, isSold && styles.disabledBtn]} 
                  onPress={() => handleContactSeller(item)} 
                  activeOpacity={0.7}
                  disabled={isSold}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={isSold ? colors.textTertiary : "#FFF"} />
                  <Text style={[styles.actionText, styles.chatText, isSold && { color: colors.textTertiary }]}>Contact Seller</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  }, [styles, colors, CONDITION_COLORS, STATUS_COLORS, handleReserve, reservingId, handleLike, handleSave, userId, votePoll, navigation, handleContactSeller, handleEdit, handleDelete, handleMarkSold]);

  return (
    <View style={styles.screen}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={{ backgroundColor: isDark ? colors.background : '#1E3A8A' }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={isDark ? ['#1A1A1A', '#0D0D0D'] : ['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleGoBack} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(79, 157, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)' }]} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buy / Sell</Text>
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: isDark ? 'rgba(79, 157, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)' }]} 
            activeOpacity={0.7} 
            onPress={() => {
              if (showSell) {
                // Clear state when closing the Sell form
                setItemTitle('');
                setItemPrice('');
                setItemCondition('Good');
                setSelectedImage(null);
                setEditingItem(null);
              }
              setShowSell(!showSell);
            }}
          >
            <Ionicons name={showSell ? 'close' : 'add'} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {showSell && (
        <View style={styles.sellCard}>
          <Text style={styles.sellTitle}>{editingItem ? 'Edit Listing' : 'Sell an Item'}</Text>
          
          {/* Image Picker Widget */}
          {selectedImage ? (
            <View style={styles.imagePreviewWrap}>
              <Image 
                source={{ uri: typeof selectedImage === 'string' ? selectedImage : selectedImage.uri }} 
                style={styles.imagePreview} 
              />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setSelectedImage(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={24} color={colors.accent} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imagePickerBtn}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={24} color={colors.primary} />
              <Text style={styles.imagePickerText}>Add Listing Image</Text>
            </TouchableOpacity>
          )}

          {/* Upload Progress Indicator */}
          {uploadingImage && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${uploadProgress}%`, backgroundColor: colors.accentCyan }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                Uploading Image: {uploadProgress}%
              </Text>
            </View>
          )}

          <TextInput style={[styles.sellInput, { color: colors.textPrimary }]} placeholder="Item name" placeholderTextColor={colors.textTertiary} value={itemTitle} onChangeText={setItemTitle} />
          <TextInput style={[styles.sellInput, { color: colors.textPrimary }]} placeholder="Price (e.g. 50)" placeholderTextColor={colors.textTertiary} keyboardType="numeric" value={itemPrice} onChangeText={setItemPrice} />
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
                <Text style={styles.sellBtnText}>{editingItem ? 'Save Changes' : 'List Item'}</Text>
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
          keyExtractor={(item) => item.id || item._id}
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

const createStyles = (colors, shadows, isDark) => StyleSheet.create({
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
    width: 60, height: 60, borderRadius: 12, 
    marginRight: SIZES.md, backgroundColor: colors.surfaceLight 
  },
  itemThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed'
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 },
  itemSeller: { fontSize: 12, color: colors.textTertiary, fontWeight: '600', maxWidth: 120 },
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
  
  actionRow: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 320 },
  actionBtn: { 
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, 
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

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  inlineBadge: { backgroundColor: colors.accentAmber, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  inlineBadgeText: { fontSize: 9, fontWeight: '900', color: '#000', textTransform: 'uppercase' },
  soldBadge: { backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  soldBadgeText: { color: '#FFF' },
  soldBtn: {
    backgroundColor: colors.accentGreen + '10',
    borderColor: colors.accentGreen + '40',
  },

  reservedByContainer: {
    marginTop: 6,
    padding: 6,
    backgroundColor: colors.accentAmber + '12',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accentAmber + '25',
    alignSelf: 'flex-start',
  },
  reservedByStatus: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.accentAmber,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reservedByText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  
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

  // Image Picker & Uploading Styles
  imagePickerBtn: {
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
    flexDirection: 'row',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  imagePreviewWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: SIZES.md,
  },
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.background,
    borderRadius: SIZES.radiusFull,
  },
  progressContainer: {
    marginBottom: SIZES.md,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  editBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary + '30',
  },
  deleteBtn: {
    backgroundColor: (colors.error || colors.accent) + '15',
    borderColor: (colors.error || colors.accent) + '30',
  },
});

export default BuySellScreen;
