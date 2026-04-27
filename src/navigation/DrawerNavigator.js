/**
 * DrawerNavigator – Theme-Aware Custom Drawer
 * ─────────────────────────────────────────────
 * Wraps MainTabNavigator in a drawer with:
 *   - Gradient header with user info
 *   - Saved Posts, Notifications links
 *   - Theme-responsive styling
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
// import {
//   createDrawerNavigator,
//   DrawerContentScrollView,
// } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import MainTabNavigator from './MainTabNavigator';

// const Drawer = createDrawerNavigator();

const createStyles = (colors, shadows) => StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: SIZES.xxxl + SIZES.md,
    paddingBottom: SIZES.xl,
    paddingHorizontal: SIZES.lg,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: SIZES.radiusFull,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: SIZES.radiusFull,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: SIZES.fontXl,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: SIZES.fontLg,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: SIZES.fontSm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  menuSection: {
    flex: 1,
    paddingTop: SIZES.md,
    paddingHorizontal: SIZES.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm + 4,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.xs,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: SIZES.radiusSm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footer: {
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm + 4,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.radiusMd,
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    marginBottom: SIZES.sm,
    gap: SIZES.sm,
  },
  logoutLabel: {
    fontSize: SIZES.fontMd,
    fontWeight: '700',
    color: '#ff6b6b',
  },
  version: {
    fontSize: SIZES.fontXs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: SIZES.xs,
  },
});

// ── Custom Drawer Content ──
const CustomDrawerContent = (props) => {
  const { colors, shadows } = useTheme();
  const { user, logout } = useAuth();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const displayName = user?.name || 'Student';
  const email = user?.email || 'student@unihelp.edu';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const DRAWER_ITEMS = [
    { icon: 'home-outline', label: 'Home', onPress: () => props.navigation.navigate('Tabs') },
    { icon: 'bookmark-outline', label: 'Saved Posts', onPress: () => { props.navigation.closeDrawer(); props.navigation.getParent()?.navigate('Saved'); } },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => { props.navigation.closeDrawer(); props.navigation.getParent()?.navigate('Notifications'); } },
    { icon: 'document-text-outline', label: 'Share Notes', onPress: () => { props.navigation.closeDrawer(); props.navigation.getParent()?.navigate('ShareNotes'); } },
    { icon: 'cart-outline', label: 'Buy / Sell', onPress: () => { props.navigation.closeDrawer(); props.navigation.getParent()?.navigate('BuySell'); } },
    { icon: 'calendar-outline', label: 'Discover Events', onPress: () => { props.navigation.closeDrawer(); props.navigation.getParent()?.navigate('DiscoverEvents'); } },
  ];

  return (
    <View style={styles.drawerContainer}>
      {/* Gradient Header */}
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
        </View>
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{email}</Text>
      </LinearGradient>

      {/* Menu Items */}
      <ScrollView style={styles.menuSection} showsVerticalScrollIndicator={false}>
        {DRAWER_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer – Logout + Version */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.7}
          onPress={() => {
            props.navigation.closeDrawer();
            logout();
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#ff6b6b" />
          <Text style={styles.logoutLabel}>Log Out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>UNIHELP v1.0.0</Text>
      </View>
    </View>
  );
};

// ── Drawer Navigator (Bypassed entirely per user request) ──
const DrawerNavigator = (props) => {
  return <MainTabNavigator {...props} />;
};

export default DrawerNavigator;
