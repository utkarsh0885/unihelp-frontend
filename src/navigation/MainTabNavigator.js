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
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          const showBadge = route.name === 'Messages' && unreadChatCount > 0;
          return (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={22}
                color={focused ? '#2563EB' : '#6B7280'}
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
    bottom: 16,
    left: 20,
    right: 20,
    height: 68,
    backgroundColor: colors.surface || '#FFFFFF',
    borderRadius: 34,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  activeIconWrap: {
    padding: 4,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconWrap: {
    padding: 4,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 2,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
});

export default MainTabNavigator;
