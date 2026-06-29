/**
 * ProfileScreen.js
 * ─────────────────────────────────────────────
 * Official University Digital Identity Hub.
 * Premium Phase 9.0 Design System Redesign.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Platform,
  Image,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import AnimatedSwitch from '../components/AnimatedSwitch';
import EditProfileModal from '../components/EditProfileModal';
import ResponsiveContainer from '../components/ResponsiveContainer';

// Design System Tokens
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS } from '../theme';
import { getElevation } from '../theme/elevation';

const SettingItem = React.memo(({ icon, label, subtitle, color, right, onPress, colors, styles }) => (
  <Pressable
    style={({ pressed }) => [
      styles.settingItem,
      pressed && right && { opacity: 0.7 }
    ]}
    onPress={onPress}
  >
    <View style={styles.settingLeft}>
      <View style={[styles.settingIconBox, { backgroundColor: (color || colors.primary) + '15' }]}>
        <Ionicons name={icon} size={20} color={color || colors.primary} />
      </View>
      <View style={styles.settingTextWrap}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
    {right || <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
  </Pressable>
));

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const { posts, savedPosts, userId } = useData();
  const { showToast } = useToast();
  
  const userPosts = useMemo(() => posts.filter(p => p.userId === userId || p.author === userId), [posts, userId]);
  
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [notifsEnabled, setNotifsEnabled] = useState(true);
  const [emailSummaries, setEmailSummaries] = useState(true);
  const [isPublicProfile, setIsPublicProfile] = useState(true);

  const elevation = useMemo(() => getElevation(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors, elevation, isDark), [colors, elevation, isDark]);

  const logoutScale = useRef(new Animated.Value(1)).current;
  const onLogoutPressIn = () => Animated.spring(logoutScale, { toValue: 0.98, useNativeDriver: true, tension: 120, friction: 10 }).start();
  const onLogoutPressOut = () => Animated.spring(logoutScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 }).start();

  const handleLogout = async () => {
    // ── Web: Execute logout directly without prompt to ensure it fires ──
    if (Platform.OS === 'web') {
      try {
        console.log('[ProfileScreen] LOGOUT CLICKED');
        await logout();
      } catch (err) {
        console.error('[ProfileScreen] Error during web logout:', err);
        if (typeof window !== 'undefined') window.location.replace('/login');
      }
      return;
    }

    // ── Native: use Alert.alert ───────────────────────────────────────────────
    Alert.alert(
      'Sign Out of UniHelp',
      'Are you sure you want to sign out of your official university account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err) {
              console.error('[Logout] Native logout error:', err);
            }
          },
        },
      ],
    );
  };

  const handleEditProfile = () => {
    setIsEditVisible(true);
  };

  const handleGenericOption = (title) => {
    showToast(`${title} preferences saved`, 'info');
  };

  const displayName = user?.name || 'Student';
  const specialisation = user?.specialisation || 'General Campus Member';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />
      
      {/* Header Bar */}
      <View style={styles.appBar}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.appBarTitle}>University Identity</Text>
        <View style={{ width: SIZES.layout.minTouchTarget }} />
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer maxWidth={680} withCardStyle={false}>
          
          {/* Identity Header Card */}
          <View style={styles.identityCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarRing}>
                <View style={styles.avatarBox}>
                  {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarText}>{avatarLetter}</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.identityInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  </View>
                </View>
                <Text style={styles.specialisationText} numberOfLines={1}>{specialisation}</Text>
                <Text style={styles.emailText} numberOfLines={1}>{user?.email || 'student@unihelp.edu'}</Text>
              </View>
            </View>

            <View style={styles.identityActions}>
              <Pressable
                style={({ pressed }) => [styles.editProfileBtn, pressed && { opacity: 0.8 }]}
                onPress={handleEditProfile}
              >
                <Ionicons name="pencil" size={16} color={colors.textOnPrimary} />
                <Text style={styles.editProfileBtnText}>Edit Profile</Text>
              </Pressable>
            </View>
          </View>

          {/* Academic Activity Summary */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionHeader}>Campus Activity</Text>
            <View style={styles.activityGrid}>
              <Pressable 
                style={({ pressed }) => [styles.activityCard, pressed && { opacity: 0.75 }]}
                onPress={() => navigation.navigate('MyPosts')}
              >
                <View style={[styles.activityIconCircle, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="create-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.activityValue}>{userPosts.length}</Text>
                <Text style={styles.activityLabel}>Published Posts</Text>
              </Pressable>

              <Pressable 
                style={({ pressed }) => [styles.activityCard, pressed && { opacity: 0.75 }]}
                onPress={() => navigation.navigate('Saved')}
              >
                <View style={[styles.activityIconCircle, { backgroundColor: colors.success + '15' }]}>
                  <Ionicons name="bookmark-outline" size={22} color={colors.success} />
                </View>
                <Text style={styles.activityValue}>{savedPosts.length}</Text>
                <Text style={styles.activityLabel}>Saved Items</Text>
              </Pressable>
            </View>
          </View>

          {/* Grouped Settings — Account */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionHeader}>Account & Identity</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon="person-outline"
                label="Edit Personal Info"
                subtitle="Name, Avatar, and Specialisation"
                color={colors.primary}
                onPress={handleEditProfile}
                colors={colors}
                styles={styles}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="school-outline"
                label="Academic Specialisation"
                subtitle={specialisation}
                color={colors.info}
                onPress={handleEditProfile}
                colors={colors}
                styles={styles}
              />
            </View>
          </View>

          {/* Grouped Settings — Appearance */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionHeader}>Appearance</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon="moon-outline"
                label="Dark Mode"
                subtitle="Toggle high contrast dark theme"
                color={colors.accent}
                right={<AnimatedSwitch value={isDark} onValueChange={toggleTheme} activeColor={colors.primary} />}
                colors={colors}
                styles={styles}
              />
            </View>
          </View>

          {/* Grouped Settings — Privacy & Notifications */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionHeader}>Privacy & Notifications</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon="shield-checkmark-outline"
                label="Public Directory Profile"
                subtitle="Visible to verified university students"
                color={colors.success}
                right={<AnimatedSwitch value={isPublicProfile} onValueChange={setIsPublicProfile} activeColor={colors.success} />}
                colors={colors}
                styles={styles}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="notifications-outline"
                label="Push Notifications"
                subtitle="Marketplace reserves, comments & chat alerts"
                color={colors.warning}
                right={<AnimatedSwitch value={notifsEnabled} onValueChange={setNotifsEnabled} activeColor={colors.primary} />}
                colors={colors}
                styles={styles}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="mail-outline"
                label="Weekly Campus Digest"
                subtitle="Summary of top polls and academic notes"
                color={colors.info}
                right={<AnimatedSwitch value={emailSummaries} onValueChange={setEmailSummaries} activeColor={colors.info} />}
                colors={colors}
                styles={styles}
              />
            </View>
          </View>

          {/* Grouped Settings — Support & About */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionHeader}>Support & About</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon="help-buoy-outline"
                label="University Help Center"
                subtitle="Guides and campus FAQ"
                color={colors.textSecondary}
                onPress={() => handleGenericOption('Help Center')}
                colors={colors}
                styles={styles}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="document-text-outline"
                label="Community Guidelines"
                subtitle="Academic integrity and marketplace policies"
                color={colors.textSecondary}
                onPress={() => handleGenericOption('Community Guidelines')}
                colors={colors}
                styles={styles}
              />
            </View>
          </View>

          {/* Danger Zone — Logout */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionHeader}>Session</Text>
            <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
              <Pressable
                style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
                onPress={handleLogout}
                onPressIn={onLogoutPressIn}
                onPressOut={onLogoutPressOut}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                <View style={styles.logoutTextWrap}>
                  <Text style={styles.logoutTitle}>Sign Out of UniHelp</Text>
                  <Text style={styles.logoutSubtitle}>Require credentials to access campus tools</Text>
                </View>
              </Pressable>
            </Animated.View>
          </View>

          <Text style={styles.versionText}>UNIHELP OFFICIAL MOBILE CLIENT v1.0.0</Text>
          <View style={{ height: SPACING.xxxl }} />

        </ResponsiveContainer>
      </ScrollView>

      <EditProfileModal visible={isEditVisible} onClose={() => setIsEditVisible(false)} user={user} />
    </View>
  );
};

const createStyles = (colors, elevation, isDark) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  backBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  appBarTitle: {
    ...TYPOGRAPHY.title,
    color: colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.massive,
  },
  identityCard: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
    marginBottom: SPACING.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarBox: {
    width: 76,
    height: 76,
    borderRadius: RADIUS.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    ...TYPOGRAPHY.h1,
    color: colors.primary,
  },
  identityInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    ...TYPOGRAPHY.h2,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  verifiedBadge: {
    justifyContent: 'center',
  },
  specialisationText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    fontWeight: FONT_WEIGHTS.semibold,
    marginTop: 2,
  },
  emailText: {
    ...TYPOGRAPHY.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  identityActions: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: RADIUS.medium,
    height: SIZES.layout.minTouchTarget,
    gap: 8,
    ...elevation.xs,
  },
  editProfileBtnText: {
    ...TYPOGRAPHY.button,
    color: colors.textOnPrimary,
  },
  sectionGroup: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
    marginLeft: 4,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  activityCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.large,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.xs,
  },
  activityIconCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  activityValue: {
    ...TYPOGRAPHY.h2,
    color: colors.textPrimary,
  },
  activityLabel: {
    ...TYPOGRAPHY.caption,
    color: colors.textMuted,
    fontWeight: FONT_WEIGHTS.semibold,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.large,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...elevation.xs,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    minHeight: SIZES.layout.minTouchTarget + 6,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  settingIconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingLabel: {
    ...TYPOGRAPHY.subtitle,
    color: colors.textPrimary,
  },
  settingSubtitle: {
    ...TYPOGRAPHY.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginLeft: 68,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: RADIUS.large,
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.danger + '30',
    minHeight: SIZES.layout.minTouchTarget + 8,
  },
  logoutTextWrap: {
    marginLeft: SPACING.md,
  },
  logoutTitle: {
    ...TYPOGRAPHY.subtitle,
    color: colors.danger,
  },
  logoutSubtitle: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  versionText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: colors.textDisabled,
    textAlign: 'center',
    marginTop: SPACING.sm,
    letterSpacing: 1,
  },
});

export default ProfileScreen;
