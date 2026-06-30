/**
 * MainTabNavigator – Theme-Aware Primary Navigation
 * ─────────────────────────────────────────────
 * Bottom-tab navigator with 3 primary tabs:
 * Home, Explore, and Messages.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
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
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          const showBadge = route.name === 'Messages' && unreadChatCount > 0;
          return (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={26}
                color={focused ? colors.primary : colors.textTertiary}
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
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    height: 75,
    paddingBottom: 20, // Padding for safe area / home indicator
    ...shadows.large,
    elevation: 25,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  activeIconWrap: {
    padding: 4,
    marginTop: 8,
    position: 'relative',
  },
  inactiveIconWrap: {
    padding: 4,
    marginTop: 8,
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});

export default MainTabNavigator;
