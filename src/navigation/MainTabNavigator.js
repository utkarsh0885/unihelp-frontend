/**
 * MainTabNavigator – Theme-Aware Primary Navigation
 * ─────────────────────────────────────────────
 * Bottom-tab navigator with 3 primary tabs:
 * Home, Explore, and Messages.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
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
  const { colors, shadows } = useTheme();
  const { unreadChatCount } = useData();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          const showBadge = route.name === 'Messages' && unreadChatCount > 0;
          return (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={focused ? 27 : 23}
                color={focused ? colors.primary : colors.textSecondary}
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

const createStyles = (colors, shadows) => StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 32,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: 0,
    paddingTop: 0,
    elevation: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  tabItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
  },
  activeIconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  inactiveIconWrap: {
    width: 44,
    height: 44,
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

export default MainTabNavigator;
