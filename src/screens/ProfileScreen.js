/**
 * ProfileScreen – Gradient Header + Theme-Aware
 * ─────────────────────────────────────────────
 * Gradient header behind avatar. Displays user data
 * from AuthContext. Dark mode toggle via ThemeContext.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import AnimatedSwitch from '../components/AnimatedSwitch';
import EditProfileModal from '../components/EditProfileModal';
import ResponsiveContainer from '../components/ResponsiveContainer';

const Stat = ({ label, value, textColor, tertiaryColor }) => (
  <View style={{ alignItems: 'center', paddingHorizontal: SIZES.lg }}>
    <Text style={{ fontSize: SIZES.fontLg, fontWeight: '800', color: textColor }}>{value}</Text>
    <Text style={{ fontSize: SIZES.fontXs, color: tertiaryColor, marginTop: 2 }}>{label}</Text>
  </View>
);

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, colors, shadows } = useTheme();
  const { posts, savedPosts, userId } = useData();
  
  const userPosts = useMemo(() => posts.filter(p => p.userId === userId), [posts, userId]);
  
  const [isEditVisible, setIsEditVisible] = useState(false);

  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  const logoutScale = useRef(new Animated.Value(1)).current;
  const onLogoutPressIn = () => Animated.spring(logoutScale, { toValue: 0.95, useNativeDriver: true, tension: 120, friction: 10 }).start();
  const onLogoutPressOut = () => Animated.spring(logoutScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 10 }).start();

  const handleLogout = async () => {
    // ── Web: Execute logout directly without prompt to ensure it fires ──
    if (Platform.OS === 'web') {
      try {
        console.log('[ProfileScreen] LOGOUT CLICKED');
        await logout();
      } catch (err) {
        console.error('[ProfileScreen] Error during web logout:', err);
        window.location.replace('/login'); // Fallback redirect if something throws
      }
      return;
    }

    // ── Native: use Alert.alert ───────────────────────────────────────────────
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
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



  const MENU_ITEMS = [
    {
      icon: 'moon-outline', label: 'Dark Mode', color: colors.primary,
      right: <AnimatedSwitch value={isDark} onValueChange={toggleTheme} activeColor={colors.primary} />,
    },
  ];

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: '#1E3A8A' }} edges={['top']} />
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
      <ResponsiveContainer maxWidth={600} withCardStyle={true} noPadding={true}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#1E3A8A', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.avatarGlow}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.nameOnGradient}>{user?.name || 'Student'}</Text>
        {user?.specialisation ? (
          <Text style={styles.specialisationOnGradient}>{user.specialisation}</Text>
        ) : null}

        <TouchableOpacity 
          style={styles.editBtnHeader} 
          activeOpacity={0.7} 
          onPress={handleEditProfile}
        >
          <Ionicons name="pencil" size={12} color="#FFFFFF" />
          <Text style={styles.editBtnHeaderText}>Edit Profile</Text>
        </TouchableOpacity>
      </LinearGradient>



      {/* Activity Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Activity</Text>
        <View style={styles.activityRow}>
          <TouchableOpacity 
            style={styles.activityCard} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MyPosts')}
          >
            <View style={[styles.activityIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.activityLabel}>My Posts</Text>
            <Text style={styles.activitySubtext}>{userPosts.length} items</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.activityCard} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Saved')}
          >
            <View style={[styles.activityIcon, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="bookmark" size={24} color={colors.success} />
            </View>
            <Text style={styles.activityLabel}>Saved Posts</Text>
            <Text style={styles.activitySubtext}>{savedPosts.length} items</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            activeOpacity={item.right ? 1 : 0.7}
            onPress={item.onPress}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            {item.right || <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <Animated.View style={[styles.logoutWrap, { transform: [{ scale: logoutScale }] }]}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          onPressIn={onLogoutPressIn}
          onPressOut={onLogoutPressOut}
          activeOpacity={1}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.version}>UNIHELP v1.0.0</Text>
      </ResponsiveContainer>
    </ScrollView>
    <EditProfileModal visible={isEditVisible} onClose={() => setIsEditVisible(false)} user={user} />
    </View>
  );
};

const createStyles = (colors, shadows, isDark) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: SIZES.xxxl + 100 },
  gradientHeader: {
    alignItems: 'center',
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.xl,
    borderTopLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderTopRightRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomLeftRadius: SIZES.radiusXxl,
    borderBottomRightRadius: SIZES.radiusXxl,
    position: 'relative',
    overflow: 'hidden',
  },
  backBtn: {
    position: 'absolute',
    top: SIZES.md,
    left: SIZES.md,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarGlow: {
    width: 100, height: 100, borderRadius: SIZES.radiusFull,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: SIZES.md,
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: SIZES.radiusFull, borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLg: {
    width: 78, height: 78, borderRadius: SIZES.radiusFull,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLgText: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
  nameOnGradient: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  specialisationOnGradient: { fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginTop: 2, fontWeight: '700' },
  handleOnGradient: { fontSize: 12, color: 'rgba(255, 255, 255, 0.65)', marginTop: 4, fontWeight: '600' },
  profileCard: {
    alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: SIZES.md,
    borderRadius: SIZES.radiusXl, paddingVertical: SIZES.lg, paddingHorizontal: SIZES.lg,
    borderWidth: 1, borderColor: colors.border, ...shadows.medium,
    marginTop: SIZES.md,
  },
  editBtnHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    marginTop: SIZES.md, gap: 5, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  editBtnHeaderText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: SIZES.lg, paddingTop: SIZES.md,
    borderTopWidth: 1, borderTopColor: colors.border, width: '100%', justifyContent: 'center',
  },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  section: { marginTop: SIZES.lg, marginHorizontal: SIZES.md },
  sectionTitle: {
    fontSize: 13, fontWeight: '900', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: SIZES.md, marginLeft: SIZES.xs,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: 20, padding: 16,
    marginBottom: SIZES.sm, borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.small,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  menuLabel: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },

  version: { textAlign: 'center', fontSize: SIZES.fontXs, color: colors.textTertiary, marginTop: SIZES.md, marginBottom: SIZES.lg },
  
  activityRow: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginTop: SIZES.xs,
  },
  activityCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  activityIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  activitySubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    marginTop: 4,
  },
  
  logoutWrap: {
    marginHorizontal: SIZES.md,
    marginTop: SIZES.xl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
    borderRadius: 20,
    paddingVertical: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.error,
  },
});

export default ProfileScreen;
