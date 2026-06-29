/**
 * EditProfileModal.js
 * ─────────────────────────────────────────────
 * Premium Modal Sheet to edit user profile.
 * Premium Phase 9.0 Design System Redesign.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileImage } from '../services/storageService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import InputField from './InputField';

// Design System
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS } from '../theme';
import { getElevation } from '../theme/elevation';

const EditProfileModal = ({ visible, onClose, user }) => {
  const { colors, isDark } = useTheme();
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [specialisation, setSpecialisation] = useState(user?.specialisation || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const elevation = useMemo(() => getElevation(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors, elevation, isDark), [colors, elevation, isDark]);

  // Sync state when user object changes or modal opens
  useEffect(() => {
    if (visible) {
      setName(user?.name || '');
      setSpecialisation(user?.specialisation || '');
      setAvatarUrl(user?.avatarUrl || null);
    }
  }, [visible, user]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission needed to access photo library.', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingAvatar(true);
        setUploadProgress(0);

        try {
          const uploadedUrl = await uploadProfileImage(
            user?.id || 'anonymous',
            asset.uri,
            asset.size || 0,
            asset.mimeType || 'image/jpeg',
            (progress) => setUploadProgress(progress)
          );
          
          console.log('[EditProfileModal] Profile picture upload success! URL:', uploadedUrl);
          setAvatarUrl(uploadedUrl);
          showToast('Profile picture uploaded!', 'success');
        } catch (uploadErr) {
          console.error('[EditProfileModal] Avatar upload error:', uploadErr);
          showToast(uploadErr.message || 'Failed to upload profile picture.', 'error');
        } finally {
          setUploadingAvatar(false);
          setUploadProgress(0);
        }
      }
    } catch (err) {
      console.warn('[EditProfileModal] Picker error:', err);
      showToast('Could not open image picker.', 'error');
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy > 120) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 8,
            tension: 65,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("Display name cannot be empty.", "error");
      return;
    }
    if (specialisation.trim().length > 50) {
      showToast("Specialisation cannot exceed 50 characters.", "error");
      return;
    }
    if (uploadingAvatar) {
      showToast("Please wait for profile photo upload to finish.", "error");
      return;
    }

    setSaving(true);
    try {
      console.log('[EditProfileModal] Profile update payload being sent to updateUser:', {
        name: name.trim(),
        specialisation: specialisation.trim(),
        avatarUrl: avatarUrl,
      });
      const updated = await updateUser({
        name: name.trim(),
        specialisation: specialisation.trim(),
        avatarUrl: avatarUrl,
      });
      if (updated) {
        showToast("Profile updated successfully!", "success");
        handleClose();
      } else {
        showToast("Failed to update profile.", "error");
      }
    } catch (err) {
      showToast(err.message || "Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const avatarLetter = name ? name.charAt(0).toUpperCase() : 'U';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.dragHandleWrap} {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
            </View>
            
            <View style={styles.header}>
              <Text style={styles.title}>Edit Personal Info</Text>
              <Pressable onPress={handleClose} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.contentScroll} 
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Avatar Picker Container */}
              <View style={styles.avatarSection}>
                <Pressable 
                  style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.85 }]}
                  onPress={handlePickAvatar}
                  disabled={uploadingAvatar || saving}
                >
                  <View style={styles.avatarCircle}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                    ) : (
                      <Text style={styles.avatarPlaceholderText}>{avatarLetter}</Text>
                    )}
                  </View>

                  <View style={styles.cameraBadge}>
                    <Ionicons name="camera" size={14} color={colors.textOnPrimary} />
                  </View>

                  {uploadingAvatar && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.uploadingText}>{uploadProgress}%</Text>
                    </View>
                  )}
                </Pressable>
                <Text style={styles.avatarHint}>Tap photo to upload new picture</Text>
              </View>

              <View style={styles.formSection}>
                <InputField
                  label="Display Name"
                  placeholder="e.g. Utkarsh Singh"
                  value={name}
                  onChangeText={setName}
                />
                
                <View style={{ height: SPACING.sm }} />

                <InputField
                  label="Academic Specialisation"
                  placeholder="e.g. Computer Science, Mechanical Engineering"
                  value={specialisation}
                  onChangeText={setSpecialisation}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  (saving || uploadingAvatar) && styles.saveBtnDisabled,
                  pressed && !(saving || uploadingAvatar) && { opacity: 0.85 }
                ]}
                onPress={handleSave}
                disabled={saving || uploadingAvatar}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.textOnPrimary} />
                    <Text style={styles.saveBtnText}>Save Profile Changes</Text>
                  </>
                )}
              </Pressable>
              
              <View style={{ height: SPACING.xl }} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (colors, elevation, isDark) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    justifyContent: 'flex-end',
    width: '100%',
    maxHeight: '90%',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xxxl : SPACING.lg,
    ...elevation.md,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  title: {
    ...TYPOGRAPHY.title,
    color: colors.textPrimary,
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
  contentScroll: {
    flexShrink: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarWrap: {
    position: 'relative',
    width: 96,
    height: 96,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholderText: {
    ...TYPOGRAPHY.h1,
    color: colors.primary,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.xs,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
    marginTop: 4,
  },
  avatarHint: {
    ...TYPOGRAPHY.caption,
    color: colors.textMuted,
    marginTop: SPACING.xs,
  },
  formSection: {
    marginBottom: SPACING.lg,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: RADIUS.medium,
    height: SIZES.layout.minTouchTarget + 8,
    gap: 8,
    ...elevation.sm,
  },
  saveBtnDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  saveBtnText: {
    ...TYPOGRAPHY.button,
    color: colors.textOnPrimary,
  },
});

export default EditProfileModal;
