/**
 * CreateEventScreen – Premium UI
 * ─────────────────────────────────────────────
 * Form to create a campus event.
 * Integrates with DataContext for persistent storage.
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as ImagePicker from 'expo-image-picker';
import { uploadEventPoster } from '../services/storageService';
import DateTimePicker from '@react-native-community/datetimepicker';

const CATEGORIES = [
  { label: 'Social', icon: 'people', color: '#2563EB' },
  { label: 'Academic', icon: 'book', color: '#D72638' },
  { label: 'Workshop', icon: 'hammer', color: '#10B981' },
  { label: 'Sports', icon: 'football', color: '#D72638' },
  { label: 'Tech', icon: 'code-slash', color: '#F59E0B' },
];

const CreateEventScreen = ({ navigation, route = {} }) => {
  console.log('[CreateEventScreen] Render — route:', route, 'navigation:', !!navigation);
  const { colors, shadows, isDark } = useTheme();
  const { addEvent } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const routeParams = route?.params || {};
  const initialDate = routeParams?.date || new Date().toISOString().split('T')[0];
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date(initialDate));
  const [time, setTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errors, setErrors] = useState({});

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const formatDateLabel = (d) => {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTimeLabel = (t) => {
    return t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handlePickPoster = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to choose a poster.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
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

  const getDbDate = (d) => d.toISOString().split('T')[0];
  const getDbTime = (t) => t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const handleCreate = async () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Event title is required';
    if (!location.trim()) newErrors.location = 'Please specify a location';
    if (!description.trim()) newErrors.description = 'Add some details about the event';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    setLoading(true);
    try {
      let posterUrl = null;
      if (selectedImage) {
        setUploadingPoster(true);
        setUploadProgress(0);
        try {
          posterUrl = await uploadEventPoster(
            user?.id || 'anonymous',
            selectedImage.uri,
            selectedImage.size,
            selectedImage.mimeType,
            (progress) => setUploadProgress(progress)
          );
        } catch (uploadErr) {
          Alert.alert('Upload Failed', uploadErr.message || 'Failed to upload event poster. Please try again.');
          setLoading(false);
          setUploadingPoster(false);
          return;
        } finally {
          setUploadingPoster(false);
          setUploadProgress(0);
        }
      }

      await addEvent({
        title,
        description,
        date: getDbDate(date),
        time: getDbTime(time),
        location: location || 'Campus Main',
        category: category.label,
        color: category.color,
        icon: category.icon,
        imageUrl: posterUrl,
      });
      
      showToast('Event created successfully! 🎉', 'success');

      // Reset form state
      setTitle('');
      setDescription('');
      setSelectedImage(null);
      setLocation('');
      setDate(new Date(initialDate));
      setTime(new Date());
      setCategory(CATEGORIES[0]);
      setErrors({});
      setUploadProgress(0);
      setUploadingPoster(false);

      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('Main', { screen: 'Home' });
      } else {
        handleGoBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (navigation && typeof navigation.goBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Main');
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
      window.history.back();
    }
  };

  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />
      
      <View style={styles.appBarContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <TouchableOpacity 
            onPress={handleCreate} 
            disabled={loading}
            style={[styles.createBtn, loading && { opacity: 0.5 }]}
          >
            <Text style={styles.createBtnText}>{loading ? '...' : 'Post'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Title</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }, errors.title && styles.inputError]}
            placeholder="What's the occasion?"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={(txt) => { setTitle(txt); if (errors.title) setErrors({...errors, title: null}); }}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        {/* Date & Time Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Select Date</Text>
            <TouchableOpacity 
              style={styles.pickerCard} 
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.pickerValue, { color: colors.textPrimary }]}>
                {formatDateLabel(date)}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Select Time</Text>
            <TouchableOpacity 
              style={styles.pickerCard} 
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.pickerValue, { color: colors.textPrimary }]}>
                {formatTimeLabel(time)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
            textColor={colors.textPrimary}
            themeVariant={isDark ? 'dark' : 'light'}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            textColor={colors.textPrimary}
            themeVariant={isDark ? 'dark' : 'light'}
          />
        )}

        {/* Location Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }, errors.location && styles.inputError]}
            placeholder="Main Audi, Block C, Room 102..."
            placeholderTextColor={colors.textTertiary}
            value={location}
            onChangeText={(txt) => { setLocation(txt); if (errors.location) setErrors({...errors, location: null}); }}
          />
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
        </View>

        {/* Event Poster Upload */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Event Poster (Optional)</Text>
          {selectedImage ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
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
              style={styles.pickerCard} 
              onPress={handlePickPoster}
              disabled={uploadingPoster || loading}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.pickerValue, { color: colors.textTertiary }]}>
                Choose Event Poster Image
              </Text>
            </TouchableOpacity>
          )}

          {uploadingPoster && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${uploadProgress}%`, backgroundColor: colors.accentCyan }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                Uploading Poster: {uploadProgress}%
              </Text>
            </View>
          )}
        </View>

        {/* Category Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.label}
                onPress={() => setCategory(cat)}
                style={[
                  styles.categoryPill,
                  category.label === cat.label && { backgroundColor: cat.color, borderColor: cat.color }
                ]}
              >
                <Ionicons 
                  name={cat.icon} 
                  size={16} 
                  color={category.label === cat.label ? '#FFFFFF' : cat.color} 
                  style={{ marginRight: 6 }} 
                />
                <Text style={[
                  styles.categoryLabel,
                  category.label === cat.label && { color: '#FFFFFF' }
                ]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Details</Text>
          <TextInput
            style={[styles.textArea, { color: colors.textPrimary }, errors.description && styles.inputError]}
            placeholder="Tell us more about the event..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={(txt) => { setDescription(txt); if (errors.description) setErrors({...errors, description: null}); }}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors, shadows, isDark) => StyleSheet.create({
  appBarContainer: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, height: 56,
  },
  closeBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderSubtle },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, textTransform: 'uppercase' },
  scrollContent: { padding: SIZES.md },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: {
    backgroundColor: colors.surfaceLight, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '600',
    borderWidth: 1, borderColor: colors.borderLight
  },
  pickerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceLight, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.borderLight
  },
  pickerValue: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  textArea: {
    backgroundColor: colors.surfaceLight, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '600',
    minHeight: 120, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.borderLight
  },
  categoryScroll: { flexDirection: 'row', marginTop: 4 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1.5, borderColor: colors.border, marginRight: 10
  },
  categoryLabel: { fontSize: 14, fontWeight: '800', color: colors.primary },
  errorText: {
    color: '#ff6b6b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: isDark ? 'rgba(255, 107, 107, 0.05)' : 'rgba(255, 107, 107, 0.02)',
  },
  imagePreviewWrap: {
    position: 'relative',
    marginTop: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceLight,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.background,
    borderRadius: 999,
  },
  progressContainer: {
    marginBottom: SIZES.md,
    marginTop: SIZES.sm,
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
    marginTop: 6,
    textAlign: 'center',
  },
});

export default CreateEventScreen;
