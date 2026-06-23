import React, { useRef, useEffect } from 'react';
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
  Keyboard,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileImage } from '../services/storageService';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import InputField from './InputField';
import GradientButton from './GradientButton';

const EditProfileModal = ({ visible, onClose, user }) => {
  const { colors, shadows, isDark } = useTheme();
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  
  const [name, setName] = React.useState(user?.name || '');
  const [specialisation, setSpecialisation] = React.useState(user?.specialisation || '');
  const [avatarUrl, setAvatarUrl] = React.useState(user?.avatarUrl || null);
  const [saving, setSaving] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const slideAnim = useRef(new Animated.Value(600)).current;

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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleClose} />
        
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.sheetContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
          >
            <Animated.View
              style={[
                styles.sheet,
                { 
                  backgroundColor: colors.surface, 
                  borderTopColor: colors.borderLight,
                  transform: [{ translateY: slideAnim }]
                },
                shadows.large,
              ]}
            >
              <View style={styles.dragHandleWrap} {...panResponder.panHandlers}>
                <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              </View>
              
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Profile</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.contentScroll} 
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TouchableOpacity 
                  style={[styles.avatarEdit, { backgroundColor: isDark ? colors.surfaceElevated : colors.primaryLight }]}
                  onPress={handlePickAvatar}
                  disabled={uploadingAvatar || saving}
                  activeOpacity={0.7}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarTextPlaceholder}>
                      {name.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  )}
                  <View style={[styles.cameraOverlay, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </View>
                  {uploadingAvatar && (
                    <View style={styles.uploadLoader}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.progressText}>
                        {uploadProgress}%
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <InputField
                  label="Display Name"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChangeText={setName}
                />
                
                <InputField
                  label="Specialisation"
                  placeholder="e.g. Computer Science, Mechanical, MBA"
                  value={specialisation}
                  onChangeText={setSpecialisation}
                />

                <GradientButton 
                  title="Save Changes" 
                  loading={saving}
                  onPress={handleSave} 
                  style={{ marginTop: SIZES.lg }} 
                />
                
                <View style={{ height: 40 }} />
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    justifyContent: 'flex-end',
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl,
    borderWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? SIZES.xxxl : SIZES.lg,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: SIZES.md,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.fontLg,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  contentScroll: {
    flexShrink: 1,
  },
  contentContainer: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xl,
    flexGrow: 1,
  },
  avatarEdit: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radiusFull,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.lg,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarTextPlaceholder: {
    fontSize: 32,
    fontWeight: '900',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  uploadLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 40,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
});

export default EditProfileModal;
