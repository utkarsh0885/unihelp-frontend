/**
 * CreatePostScreen – Firestore-Backed
 * ─────────────────────────────────────────────
 * Creates a post via DataContext with working
 * image picker and link attachment.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import GradientButton from '../components/GradientButton';

const MAX_LENGTH = 500;

const CreatePostScreen = ({ navigation, route }) => {
  const { colors, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const { addPost, updatePost } = useData();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const existingPost = route.params?.post;
  const isEdit = !!existingPost;

  const [title, setTitle] = useState(existingPost?.title || '');
  const [content, setContent] = useState(existingPost?.content || '');
  const [category, setCategory] = useState(existingPost?.category || 'General');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(existingPost?.imageUrl || null);
  const [attachedLink, setAttachedLink] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

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
      // Request permission
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
        setSelectedImage(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('ImagePicker error:', e);
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleAttachLink = () => {
    if (showLinkInput && attachedLink.trim()) {
      // Validate URL
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

    setLoading(true);
    try {
      // Build final content with link if attached
      let finalContent = content.trim();
      if (attachedLink.trim()) {
        finalContent += '\n\n🔗 ' + attachedLink.trim();
      }

      if (isEdit) {
        await updatePost(existingPost.id, {
          title: title.trim(),
          content: finalContent,
          category,
          imageUrl: selectedImage,
        });
        Alert.alert('Updated! ✨', 'Your post has been successfully modified.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await addPost(finalContent, { 
          title: title.trim(), 
          category, 
          imageUrl: selectedImage 
        });

        Alert.alert('Posted! 🎉', 'Your user-driven post is now live.', [
          { text: 'OK', onPress: () => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Main');
          }},
        ]);
      }
    } catch (e) {
      Alert.alert('Error', `Failed to ${isEdit ? 'update' : 'create'} post. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const displayName = user?.name || 'You';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ backgroundColor: isDark ? colors.background : '#1E3A8A' }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={isDark ? ['#1A1A1A', '#0D0D0D'] : ['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Main');
          }} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(79, 157, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)' }]} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{isEdit ? 'Edit Post' : 'New Post'}</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <View style={styles.authorRow}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{avatarLetter}</Text></View>
            </View>
            <View>
              <Text style={styles.authorName}>{displayName}</Text>
              <View style={styles.visRow}>
                <Ionicons name="earth" size={11} color={colors.textTertiary} />
                <Text style={styles.visibility}> Public Post</Text>
              </View>
            </View>
          </View>

          {/* Title Input */}
          <View style={styles.titleWrapper}>
            <TextInput
              style={styles.titleInput}
              placeholder="Title (required)"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <TextInput
            style={styles.textArea}
            placeholder="Description... share details with the campus community!"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={MAX_LENGTH}
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />

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
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={cat.icon} 
                    size={16} 
                    color={isActive ? '#FFFFFF' : colors.textSecondary} 
                  />
                  <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Image Preview */}
          {selectedImage && (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setSelectedImage(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={24} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}

          {/* Link Input */}
          {showLinkInput && (
            <View style={styles.linkInputRow}>
              <TextInput
                style={styles.linkInput}
                placeholder="https://example.com"
                placeholderTextColor={colors.textTertiary}
                value={attachedLink}
                onChangeText={setAttachedLink}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          )}

          {/* Attached link badge */}
          {attachedLink.trim() && !showLinkInput ? (
            <TouchableOpacity style={styles.linkBadge} onPress={() => setShowLinkInput(true)} activeOpacity={0.7}>
              <Ionicons name="link" size={14} color={colors.accentCyan} />
              <Text style={styles.linkBadgeText} numberOfLines={1}>{attachedLink.trim()}</Text>
              <TouchableOpacity onPress={() => { setAttachedLink(''); }} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : null}

          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: isNearLimit ? colors.accent : colors.primary }]} />
            </View>
            <Text style={[styles.charCount, isNearLimit && { color: colors.accent }]}>{charsLeft}</Text>
          </View>

          <View style={styles.attachRow}>
            {/* Image Picker */}
            <TouchableOpacity
              style={[styles.attachBtn, selectedImage && { backgroundColor: colors.accentGreen + '25' }]}
              activeOpacity={0.7}
              onPress={handlePickImage}
            >
              <Ionicons name="image-outline" size={20} color={selectedImage ? colors.accentGreen : colors.accentGreen} />
            </TouchableOpacity>

            {/* Link Attachment */}
            <TouchableOpacity
              style={[styles.attachBtn, attachedLink.trim() && { backgroundColor: colors.accentCyan + '25' }]}
              activeOpacity={0.7}
              onPress={handleAttachLink}
            >
              <Ionicons name="link-outline" size={20} color={colors.accentCyan} />
            </TouchableOpacity>
          </View>
        </View>

        <GradientButton
          title={loading ? (isEdit ? 'Updating…' : 'Posting…') : (isEdit ? 'Save Changes' : 'Post to Campus')}
          onPress={handleSubmit}
          loading={loading}
          style={{ marginHorizontal: SIZES.md, marginTop: SIZES.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: { ...shadows.medium, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, paddingBottom: SIZES.md, paddingTop: SIZES.sm,
  },
  closeBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  card: { 
    backgroundColor: colors.surface, borderRadius: 24, marginHorizontal: SIZES.md, 
    padding: SIZES.lg, borderWidth: 1, borderColor: colors.borderLight, ...shadows.medium,
    marginTop: SIZES.md,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.md },
  avatarRing: { width: SIZES.avatarMd + 4, height: SIZES.avatarMd + 4, borderRadius: SIZES.radiusFull, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.sm + 4 },
  avatar: { width: SIZES.avatarMd, height: SIZES.avatarMd, borderRadius: SIZES.radiusFull, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: SIZES.fontMd },
  authorName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  visRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  visibility: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '900', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginTop: SIZES.sm, marginBottom: SIZES.md },
  titleWrapper: { borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 4, marginBottom: SIZES.xs },
  titleInput: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, paddingVertical: 10 },
  textArea: { 
    minHeight: 120, fontSize: 16, lineHeight: 24, color: colors.textPrimary, 
    paddingTop: SIZES.sm, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) 
  },
  categoryScroll: { marginHorizontal: -SIZES.lg, marginBottom: SIZES.md },
  categoryContent: { paddingHorizontal: SIZES.lg, gap: 10, paddingVertical: 4 },
  categoryChip: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, 
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 6,
    borderWidth: 1, borderColor: colors.borderLight
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  categoryLabelActive: { color: '#FFFFFF' },
  imagePreviewWrap: { position: 'relative', marginTop: SIZES.md, borderRadius: SIZES.radiusMd, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },
  imagePreview: { width: '100%', height: 220, borderRadius: SIZES.radiusMd, backgroundColor: colors.surfaceLight },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.background, borderRadius: SIZES.radiusFull },
  linkInputRow: { marginTop: SIZES.sm },
  linkInput: {
    backgroundColor: colors.surfaceLight, borderRadius: SIZES.radiusMd, borderWidth: 1, borderColor: colors.accentCyan,
    paddingHorizontal: SIZES.md, height: 44, fontSize: SIZES.fontMd, color: colors.textPrimary,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  linkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SIZES.sm,
    backgroundColor: colors.accentCyan + '15', borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.sm + 4, paddingVertical: SIZES.xs + 2,
  },
  linkBadgeText: { flex: 1, fontSize: SIZES.fontSm, color: colors.accentCyan, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: SIZES.sm, gap: SIZES.sm },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.surfaceLight, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  charCount: { fontSize: SIZES.fontXs, color: colors.textTertiary, fontWeight: '600', minWidth: 28, textAlign: 'right' },
  attachRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, marginTop: SIZES.md, paddingTop: SIZES.md, gap: SIZES.sm },
  attachBtn: { width: 44, height: 44, borderRadius: SIZES.radiusMd, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
});

export default CreatePostScreen;
