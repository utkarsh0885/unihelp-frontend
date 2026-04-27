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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import InputField from './InputField';
import GradientButton from './GradientButton';

const EditProfileModal = ({ visible, onClose, user }) => {
  const { colors, shadows, isDark } = useTheme();
  const { updateUser } = useAuth();
  
  const [name, setName] = React.useState(user?.name || '');
  const [specialisation, setSpecialisation] = React.useState(user?.specialisation || '');
  const [saving, setSaving] = React.useState(false);

  const slideAnim = useRef(new Animated.Value(600)).current;

  // Sync state when user object changes or modal opens
  useEffect(() => {
    if (visible) {
      setName(user?.name || '');
      setSpecialisation(user?.specialisation || '');
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
                <View style={[styles.avatarEdit, { backgroundColor: isDark ? colors.surfaceElevated : colors.primaryLight }]}>
                  <Ionicons name="camera-outline" size={32} color={colors.primary} />
                </View>

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
                  title={saving ? "Saving..." : "Save Changes"} 
                  onPress={async () => {
                    setSaving(true);
                    await updateUser({ name, specialisation });
                    setSaving(false);
                    handleClose();
                  }} 
                  disabled={saving}
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
  },
});

export default EditProfileModal;
