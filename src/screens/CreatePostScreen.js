/**
 * CreatePostScreen – Firestore-Backed
 * ─────────────────────────────────────────────
 * Creates a post via DataContext with working
 * image picker and link attachment.
 * Premium Phase 9.0 Design System Redesign.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { uploadPostImage } from '../services/storageService';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import GradientButton from '../components/GradientButton';
import ResponsiveContainer from '../components/ResponsiveContainer';

// Design System
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS } from '../theme';
import { getElevation } from '../theme/elevation';

let DateTimePicker = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {}
}

const formatReadableDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatReadableTime = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const MAX_LENGTH = 500;

const CreatePostScreen = ({ navigation, route = {} }) => {
  console.log('[CreatePostScreen] Render — route:', route, 'navigation:', !!navigation);
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { addPost, updatePost } = useData();
  const { showToast } = useToast();

  const elevation = useMemo(() => getElevation(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors, elevation, isDark), [colors, elevation, isDark]);

  const routeParams = route?.params || {};
  const existingPost = routeParams?.post || null;
  const isEdit = !!existingPost;
  const defaultCategory = routeParams?.defaultCategory || 'General';

  const [title, setTitle] = useState(existingPost?.title || '');
  const [content, setContent] = useState(existingPost?.content || '');
  const [category, setCategory] = useState(existingPost?.category || defaultCategory);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(existingPost?.imageUrl || null);
  const [attachedLink, setAttachedLink] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Marketplace states
  const [price, setPrice] = useState(existingPost?.price || '');
  const [condition, setCondition] = useState(existingPost?.condition || 'Good');

  // Event Details states
  const [eventDate, setEventDate] = useState(existingPost?.eventDate || existingPost?.date || '');
  const [eventDateRaw, setEventDateRaw] = useState(existingPost?.eventDateRaw || '');
  const [eventTime, setEventTime] = useState(existingPost?.eventTime || existingPost?.time || '');
  const [eventTimeRaw, setEventTimeRaw] = useState(existingPost?.eventTimeRaw || '');
  const [eventLocation, setEventLocation] = useState(existingPost?.eventLocation || existingPost?.location || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateObj, setDateObj] = useState(existingPost?.eventDateRaw ? new Date(existingPost.eventDateRaw) : new Date());
  const [timeObj, setTimeObj] = useState(new Date());

  const CATEGORIES = [
    { id: 'General', icon: 'apps-outline', label: 'General' },
    { id: 'Buy/Sell', icon: 'cart-outline', label: 'Buy/Sell' },
    { id: 'Events', icon: 'calendar-outline', label: 'Events' },
    { id: 'Lost & Found', icon: 'search-outline', label: 'Lost & Found' },
    { id: 'Other', icon: 'ellipsis-horizontal-outline', label: 'Other' },
  ];

  const charsLeft = MAX_LENGTH - content.length;
  const isNearLimit = charsLeft <= 50;
  const progress = content.length / MAX_LENGTH;

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library to attach images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
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

  const handleAttachLink = () => {
    if (showLinkInput && attachedLink.trim()) {
      const url = attachedLink.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        Alert.alert('Invalid Link', 'Please enter a valid URL starting with http:// or https://');
        return;
      }
      setShowLinkInput(false);
      Alert.alert('Link Attached ✅', `"${url}" will be included with your post.`);
    } else if (showLinkInput) {
      setShowLinkInput(false);
    } else {
      setShowLinkInput(true);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your post.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Empty Post', 'Write something before posting!');
      return;
    }
    if (category === 'Buy/Sell') {
      const parsedPrice = parseFloat(String(price).replace(/[$₹\s]/g, ''));
      if (price === undefined || price === null || String(price).trim() === '' || isNaN(parsedPrice) || parsedPrice <= 0) {
        Alert.alert('Invalid Price', 'Please enter a valid price greater than 0.');
        return;
      }
    }
    if (category === 'Events') {
      if (!eventDate || !String(eventDate).trim()) {
        Alert.alert('Missing Date', 'Please select an event date.');
        return;
      }
    }

    if (uploadingImage) {
      Alert.alert('Please Wait', 'Please wait for the image upload to complete.');
      return;
    }

    setLoading(true);
    try {
      let finalContent = content.trim();
      if (attachedLink.trim()) {
        finalContent += '\n\n🔗 ' + attachedLink.trim();
      }

      let imageUrl = null;
      if (selectedImage) {
        if (typeof selectedImage === 'string') {
          imageUrl = selectedImage;
        } else if (selectedImage.uri) {
          setUploadingImage(true);
          setUploadProgress(0);
          try {
            imageUrl = await uploadPostImage(
              user?.id || 'anonymous',
              selectedImage.uri,
              selectedImage.size,
              selectedImage.mimeType,
              (progress) => setUploadProgress(progress)
            );
          } catch (uploadErr) {
            Alert.alert('Upload Failed', uploadErr.message || 'Failed to upload image. Please try again.');
            setLoading(false);
            setUploadingImage(false);
            return;
          } finally {
            setUploadingImage(false);
            setUploadProgress(0);
          }
        }
      }

      if (isEdit) {
        await updatePost(existingPost?.id, {
          title: title.trim(),
          content: finalContent,
          category,
          imageUrl,
          price: category === 'Buy/Sell' ? parseFloat(String(price).replace(/[$₹\s]/g, '')) : null,
          condition: category === 'Buy/Sell' ? condition : null,
          eventDate: category === 'Events' ? eventDate : null,
          eventDateRaw: category === 'Events' ? eventDateRaw : null,
          eventTime: category === 'Events' ? eventTime : null,
          eventTimeRaw: category === 'Events' ? eventTimeRaw : null,
          eventLocation: category === 'Events' ? eventLocation.trim() : null,
          date: category === 'Events' ? eventDate : null,
          time: category === 'Events' ? eventTime : null,
          location: category === 'Events' ? eventLocation.trim() : null,
        });
        showToast('Post updated successfully! ✨', 'success');

        setTitle('');
        setContent('');
        setSelectedImage(null);
        setAttachedLink('');
        setShowLinkInput(false);
        setUploadProgress(0);
        setUploadingImage(false);
        setPrice('');
        setCondition('Good');
        setEventDate('');
        setEventDateRaw('');
        setEventTime('');
        setEventTimeRaw('');
        setEventLocation('');

        if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('Main', { screen: 'Home' });
        } else {
          handleGoBack();
        }
      } else {
        await addPost(finalContent, {
          title: title.trim(),
          category,
          imageUrl,
          price: category === 'Buy/Sell' ? parseFloat(String(price).replace(/[$₹\s]/g, '')) : null,
          condition: category === 'Buy/Sell' ? condition : null,
          eventDate: category === 'Events' ? eventDate : null,
          eventDateRaw: category === 'Events' ? eventDateRaw : null,
          eventTime: category === 'Events' ? eventTime : null,
          eventTimeRaw: category === 'Events' ? eventTimeRaw : null,
          eventLocation: category === 'Events' ? eventLocation.trim() : null,
          date: category === 'Events' ? eventDate : null,
          time: category === 'Events' ? eventTime : null,
          location: category === 'Events' ? eventLocation.trim() : null,
        });
        showToast('Post created successfully! 🎉', 'success');

        setTitle('');
        setContent('');
        setSelectedImage(null);
        setAttachedLink('');
        setShowLinkInput(false);
        setUploadProgress(0);
        setUploadingImage(false);
        setPrice('');
        setCondition('Good');
        setEventDate('');
        setEventDateRaw('');
        setEventTime('');
        setEventTimeRaw('');
        setEventLocation('');

        if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('Main', { screen: 'Home' });
        } else {
          handleGoBack();
        }
      }
    } catch (e) {
      Alert.alert('Error', `Failed to ${isEdit ? 'update' : 'create'} post. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Main');
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
      window.history.back();
    }
  };

  const displayName = user?.name || 'You';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <View style={styles.header}>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.screenTitle}>{isEdit ? 'Edit Post' : 'New Post'}</Text>
          <View style={{ width: SIZES.layout.minTouchTarget }} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ResponsiveContainer maxWidth={650} withCardStyle={false}>
          <View style={styles.formContainer}>
            <View style={styles.card}>
            <View style={styles.authorRow}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{avatarLetter}</Text></View>
              </View>
              <View>
                <Text style={styles.authorName}>{displayName}</Text>
                <View style={styles.visRow}>
                  <Ionicons name="earth" size={12} color={colors.textMuted} />
                  <Text style={styles.visibility}> Public Campus Post</Text>
                </View>
              </View>
            </View>

            {/* Title Input */}
            <View style={styles.titleWrapper}>
              <TextInput
                style={styles.titleInput}
                placeholder="Title (required)"
                placeholderTextColor={colors.textDisabled}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            <TextInput
              style={styles.textArea}
              placeholder="Description... share details with the campus community!"
              placeholderTextColor={colors.textDisabled}
              multiline
              maxLength={MAX_LENGTH}
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
            />

            {/* Event Details Section (rendered immediately if Events category selected) */}
            {category === 'Events' && (
              <View style={styles.eventDetailsBox}>
                <Text style={styles.eventSectionTitle}>Event Details</Text>

                {/* Event Date (Required) */}
                <Text style={styles.label}>📅 Event Date (Required)</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webInputWrapper}>
                    <input
                      type="date"
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        padding: '12px 14px',
                        borderRadius: `${RADIUS.medium || 12}px`,
                        border: `1px solid ${!eventDate ? (colors.danger || '#EF4444') : colors.border}`,
                        backgroundColor: colors.surfaceSubtle,
                        color: colors.textPrimary,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        display: 'block',
                      }}
                      value={eventDateRaw}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const parts = val.split('-');
                          if (parts.length === 3) {
                            const dt = new Date(parts[0], parts[1] - 1, parts[2]);
                            setDateObj(dt);
                            setEventDate(formatReadableDate(dt));
                            setEventDateRaw(val);
                          }
                        } else {
                          setEventDate('');
                          setEventDateRaw('');
                        }
                      }}
                    />
                  </View>
                ) : (
                  <Pressable
                    style={[styles.eventPickerRow, !eventDate && { borderColor: colors.danger || '#EF4444' }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={[styles.eventPickerText, !eventDate && { color: colors.textDisabled }]} numberOfLines={1}>
                      {eventDate || 'Select Event Date'}
                    </Text>
                  </Pressable>
                )}
                {!eventDate && (
                  <Text style={styles.eventValidationText}>Please select an event date.</Text>
                )}

                {/* Event Time (Optional) */}
                <Text style={styles.label}>🕒 Event Time (Optional)</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webInputWrapper}>
                    <input
                      type="time"
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        padding: '12px 14px',
                        borderRadius: `${RADIUS.medium || 12}px`,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.surfaceSubtle,
                        color: colors.textPrimary,
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        display: 'block',
                      }}
                      value={eventTimeRaw}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const parts = val.split(':');
                          if (parts.length >= 2) {
                            const dt = new Date();
                            dt.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10));
                            setTimeObj(dt);
                            setEventTime(formatReadableTime(dt));
                            setEventTimeRaw(val);
                          }
                        } else {
                          setEventTime('');
                          setEventTimeRaw('');
                        }
                      }}
                    />
                  </View>
                ) : (
                  <Pressable
                    style={styles.eventPickerRow}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                    <Text style={[styles.eventPickerText, !eventTime && { color: colors.textDisabled }]} numberOfLines={1}>
                      {eventTime || 'Select Event Time'}
                    </Text>
                  </Pressable>
                )}

                {/* Event Location (Optional) */}
                <Text style={styles.label}>📍 Event Location (Optional)</Text>
                <View style={styles.eventInputRow}>
                  <Ionicons name="location-outline" size={20} color={colors.primary} style={{ marginLeft: 12, marginRight: 8 }} />
                  <TextInput
                    style={styles.eventInput}
                    placeholder="Enter venue or location"
                    placeholderTextColor={colors.textDisabled}
                    value={eventLocation}
                    onChangeText={setEventLocation}
                  />
                </View>

                {/* Event Poster (Optional) */}
                <Text style={styles.label}>🖼 Event Poster (Optional)</Text>
                <Pressable
                  style={styles.eventPosterBtn}
                  onPress={handlePickImage}
                >
                  <Ionicons name="image-outline" size={20} color={selectedImage ? colors.accent : colors.primary} />
                  <Text style={styles.eventPosterText}>
                    {selectedImage ? 'Event Poster Attached (Tap to Change)' : 'Attach Event Poster'}
                  </Text>
                </Pressable>

                {/* Native Date / Time Pickers */}
                {Platform.OS !== 'web' && DateTimePicker && showDatePicker && (
                  <DateTimePicker
                    value={dateObj}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(evt, selected) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (selected) {
                        setDateObj(selected);
                        setEventDate(formatReadableDate(selected));
                        setEventDateRaw(selected.toISOString().split('T')[0]);
                      }
                    }}
                  />
                )}
                {Platform.OS !== 'web' && DateTimePicker && showTimePicker && (
                  <DateTimePicker
                    value={timeObj}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(evt, selected) => {
                      setShowTimePicker(Platform.OS === 'ios');
                      if (selected) {
                        setTimeObj(selected);
                        setEventTime(formatReadableTime(selected));
                        const hours = String(selected.getHours()).padStart(2, '0');
                        const mins = String(selected.getMinutes()).padStart(2, '0');
                        setEventTimeRaw(`${hours}:${mins}`);
                      }
                    }}
                  />
                )}
              </View>
            )}

            {/* Category Selector */}
            <Text style={styles.label}>Select Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryContent}
            >
              {CATEGORIES.map((cat) => {
                const isActive = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[styles.categoryChip, isActive ? styles.categoryChipActive : styles.categoryChipInactive]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={16}
                      color={isActive ? colors.textOnPrimary : colors.textSecondary}
                    />
                    <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Marketplace Fields (rendered immediately if Buy/Sell category selected) */}
            {category === 'Buy/Sell' && (
              <View style={styles.marketplaceFields}>
                <Text style={styles.label}>Price (₹)</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Enter price (e.g. 50)"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric"
                  value={String(price)}
                  onChangeText={setPrice}
                />

                <Text style={styles.label}>Condition</Text>
                <View style={styles.conditionRow}>
                  {['New', 'Like New', 'Good', 'Used'].map((c) => (
                    <Pressable
                      key={c}
                      style={[styles.conditionChip, condition === c && styles.conditionChipActive]}
                      onPress={() => setCondition(c)}
                    >
                      <Text style={[styles.conditionChipText, condition === c && styles.conditionChipTextActive]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Image Preview */}
            {selectedImage && (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: typeof selectedImage === 'string' ? selectedImage : selectedImage.uri }} style={styles.imagePreview} />
                <Pressable
                  style={styles.removeImageBtn}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                </Pressable>
              </View>
            )}

            {/* Upload Progress Indicator */}
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

            {/* Link Input */}
            {showLinkInput && (
              <View style={styles.linkInputRow}>
                <TextInput
                  style={styles.linkInput}
                  placeholder="https://example.com"
                  placeholderTextColor={colors.textDisabled}
                  value={attachedLink}
                  onChangeText={setAttachedLink}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            )}

            {/* Attached link badge */}
            {attachedLink.trim() && !showLinkInput ? (
              <Pressable style={styles.linkBadge} onPress={() => setShowLinkInput(true)}>
                <Ionicons name="link" size={14} color={colors.info} />
                <Text style={styles.linkBadgeText} numberOfLines={1}>{attachedLink.trim()}</Text>
                <Pressable onPress={() => { setAttachedLink(''); }}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              </Pressable>
            ) : null}

            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: isNearLimit ? colors.danger : colors.primary }]} />
              </View>
              <Text style={[styles.charCount, isNearLimit && { color: colors.danger }]}>{charsLeft}</Text>
            </View>

            <View style={styles.attachRow}>
              <Pressable
                style={({ pressed }) => [styles.attachBtn, selectedImage && { backgroundColor: colors.accentLight }, pressed && { opacity: 0.7 }]}
                onPress={handlePickImage}
              >
                <Ionicons name="image-outline" size={20} color={selectedImage ? colors.accent : colors.textSecondary} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.attachBtn, attachedLink.trim() && { backgroundColor: colors.infoLight }, pressed && { opacity: 0.7 }]}
                onPress={handleAttachLink}
              >
                <Ionicons name="link-outline" size={20} color={attachedLink.trim() ? colors.info : colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <GradientButton
            title={loading ? (isEdit ? 'Updating…' : 'Posting…') : (isEdit ? 'Save Changes' : 'Post to Campus')}
            onPress={handleSubmit}
            loading={loading}
            disabled={category === 'Events' && !eventDate}
            style={styles.submitButton}
          />
        </View>
      </ResponsiveContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors, elevation, isDark) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box', overflowX: 'hidden' } : {}),
  },
  appBarContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 56,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  closeBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  screenTitle: {
    ...TYPOGRAPHY.title,
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'center',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: SPACING.xxxl,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  formContainer: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    paddingHorizontal: SPACING.md,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  card: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.large,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
    marginTop: SPACING.md,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    flexShrink: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: FONT_WEIGHTS.bold, fontSize: 16 },
  authorName: { ...TYPOGRAPHY.subtitle, color: colors.textPrimary, flexShrink: 1 },
  visRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4, flexWrap: 'wrap' },
  visibility: { ...TYPOGRAPHY.caption, color: colors.textMuted, flexShrink: 1 },
  label: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  titleWrapper: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: 4,
    marginBottom: SPACING.xs,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  titleInput: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    ...TYPOGRAPHY.h3,
    color: colors.textPrimary,
    paddingVertical: SPACING.xs,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box', outlineStyle: 'none' } : {}),
  },
  textArea: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    minHeight: 120,
    ...TYPOGRAPHY.body,
    lineHeight: 24,
    color: colors.textPrimary,
    paddingTop: SPACING.sm,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box', outlineStyle: 'none' } : {}),
  },
  categoryScroll: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    marginBottom: SPACING.md,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  categoryContent: {
    gap: SPACING.xs,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    minHeight: 36,
    flexShrink: 0,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipInactive: { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
  categoryLabel: { ...TYPOGRAPHY.caption, fontWeight: FONT_WEIGHTS.semibold, color: colors.textSecondary },
  categoryLabelActive: { color: colors.textOnPrimary, fontWeight: FONT_WEIGHTS.bold },
  imagePreviewWrap: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    position: 'relative',
    marginTop: SPACING.md,
    borderRadius: RADIUS.large,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  imagePreview: {
    width: '100%',
    maxWidth: '100%',
    height: 200,
    borderRadius: RADIUS.large,
    backgroundColor: colors.surfaceSubtle,
  },
  removeImageBtn: { position: 'absolute', top: SPACING.xs, right: SPACING.xs, backgroundColor: colors.surface, borderRadius: RADIUS.full },
  linkInputRow: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    marginTop: SPACING.sm,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  linkInput: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    borderColor: colors.info,
    paddingHorizontal: SPACING.md,
    height: SIZES.layout.minTouchTarget,
    ...TYPOGRAPHY.body,
    color: colors.textPrimary,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', boxSizing: 'border-box' } : {}),
  },
  linkBadge: {
    maxWidth: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    backgroundColor: colors.infoLight,
    borderRadius: RADIUS.medium,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  linkBadgeText: { flex: 1, minWidth: 0, ...TYPOGRAPHY.caption, color: colors.info, fontWeight: FONT_WEIGHTS.semibold },
  progressRow: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  progressTrack: { flex: 1, height: 4, borderRadius: RADIUS.pill, backgroundColor: colors.surfaceSubtle, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.pill },
  charCount: { ...TYPOGRAPHY.caption, fontSize: 11, color: colors.textMuted, fontWeight: FONT_WEIGHTS.semibold, minWidth: 28, textAlign: 'right' },
  attachRow: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  attachBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  progressContainer: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
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
    marginTop: 6,
    textAlign: 'center',
  },
  marketplaceFields: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  priceInput: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: SPACING.md,
    height: SIZES.layout.minTouchTarget + 6,
    ...TYPOGRAPHY.body,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', boxSizing: 'border-box' } : {}),
  },
  conditionRow: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
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
  eventDetailsBox: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.large,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box', overflow: 'hidden' } : {}),
  },
  eventSectionTitle: {
    ...TYPOGRAPHY.h3,
    color: colors.primary,
    marginBottom: SPACING.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  webInputWrapper: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    marginBottom: 10,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  eventPickerRow: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: SPACING.md,
    height: SIZES.layout.minTouchTarget + 6,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  eventPickerText: {
    flex: 1,
    minWidth: 0,
    ...TYPOGRAPHY.body,
    color: colors.textPrimary,
  },
  eventValidationText: {
    ...TYPOGRAPHY.caption,
    color: colors.danger,
    marginTop: -4,
    marginBottom: SPACING.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  eventInputRow: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.sm,
    height: SIZES.layout.minTouchTarget + 6,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  eventInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingRight: SPACING.md,
    ...TYPOGRAPHY.body,
    color: colors.textPrimary,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none', boxSizing: 'border-box' } : {}),
  },
  eventPosterBtn: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    ...(Platform.OS === 'web' ? { boxSizing: 'border-box' } : {}),
  },
  eventPosterText: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'center',
    ...TYPOGRAPHY.bodySmall,
    color: colors.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  submitButton: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },
});

export default CreatePostScreen;
