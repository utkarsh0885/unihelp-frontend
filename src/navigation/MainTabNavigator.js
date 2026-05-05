/**
 * MainTabNavigator – Theme-Aware
 * ─────────────────────────────────────────────
 * Bottom-tab navigator with theme-reactive
 * surface bar, active glow pill, and refined styling.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';

import ProfileScreen from '../screens/ProfileScreen';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: { active: 'home', inactive: 'home-outline' },
  Explore: { active: 'compass', inactive: 'compass-outline' },
};

const MainTabNavigator = () => {
  const { colors, shadows } = useTheme();
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
          const icons = TAB_ICONS[route.name];
          return (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Ionicons
                name={focused ? icons.active : icons.inactive}
                size={26}
                color={focused ? colors.primary : colors.textTertiary}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
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
  },
  inactiveIconWrap: {
    padding: 4,
    marginTop: 8,
  },
});

export default MainTabNavigator;
