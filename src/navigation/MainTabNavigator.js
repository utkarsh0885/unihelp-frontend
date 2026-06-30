/**
 * MainTabNavigator – Theme-Aware Primary Navigation
 * ─────────────────────────────────────────────
 * Bottom-tab navigator with 3 primary tabs:
 * Home, Explore, and Messages.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import MessagesScreen from '../screens/MessagesScreen';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: { active: 'home', inactive: 'home-outline' },
  Explore: { active: 'compass', inactive: 'compass-outline' },
  Messages: { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
};

const MainTabNavigator = () => {
  const { colors, shadows, isDark } = useTheme();
  const { unreadChatCount } = useData();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, shadows, isDark, width), [colors, shadows, isDark, width]);

  // Determine responsive radius for background rendering
  const navRadius = width >= 1200 ? 32 : (width >= 768 ? 31 : 29);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarBackground: () => {
          if (Platform.OS === 'web') {
            return (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: isDark ? 'rgba(20, 20, 20, 0.55)' : 'rgba(255, 255, 255, 0.55)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  borderRadius: `${navRadius}px`,
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.30)',
                  boxShadow: isDark ? '0 8px 24px rgba(0, 0, 0, 0.25)' : '0 8px 24px rgba(0, 0, 0, 0.05)',
                  pointerEvents: 'none',
                }}
              />
            );
          }

          let BlurViewNative = null;
          try {
            BlurViewNative = require('expo-blur').BlurView;
          } catch (e) {}

          return (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: navRadius,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.30)',
                  overflow: 'hidden',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.25 : 0.08,
                  shadowRadius: 12,
                  elevation: 6,
                },
              ]}
            >
              {BlurViewNative ? (
                <>
                  <BlurViewNative
                    intensity={65}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                  />
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: isDark ? 'rgba(20, 20, 20, 0.18)' : 'rgba(255, 255, 255, 0.18)',
                      },
                    ]}
                  />
                </>
              ) : (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: isDark ? 'rgba(20, 20, 20, 0.65)' : 'rgba(255, 255, 255, 0.65)',
                    },
                  ]}
                />
              )}
            </View>
          );
        },
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          const showBadge = route.name === 'Messages' && unreadChatCount > 0;
          return (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={24}
                color={focused ? colors.primary : (isDark ? '#9CA3AF' : '#6B7280')}
              />
              {showBadge && <View style={styles.badgeDot} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
    </Tab.Navigator>
  );
};

const createStyles = (colors, shadows, isDark, width) => {
  let navWidth, navHeight, navBottom, navLeft;

  if (width >= 1200) {
    // DESKTOP (>= 1200px): Width ~720px, height 64px, bottom 20px
    navWidth = Math.min(720, width - 40);
    navHeight = 64;
    navBottom = 20;
    navLeft = (width - navWidth) / 2;
  } else if (width >= 768) {
    // TABLET (768–1199px): ~70% width (max 700px), height 62px
    navWidth = Math.min(width * 0.70, 700);
    navHeight = 62;
    navBottom = 20;
    navLeft = (width - navWidth) / 2;
  } else {
    // MOBILE (< 768px): calc(100% - 32px), height 58px, bottom 16px (or safe area)
    navWidth = width - 32;
    navHeight = 58;
    navBottom = Platform.OS === 'ios' ? 24 : 16;
    navLeft = 16;
  }

  return StyleSheet.create({
    tabBar: {
      position: 'absolute',
      bottom: navBottom,
      left: navLeft,
      width: navWidth,
      height: navHeight,
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      borderWidth: 0,
      elevation: 0,
      paddingBottom: 0,
      paddingTop: 0,
    },
    tabItem: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 0,
    },
    activeIconWrap: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    inactiveIconWrap: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    badgeDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.error,
    },
  });
};

export default MainTabNavigator;
