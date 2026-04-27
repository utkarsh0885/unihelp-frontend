/**
 * AppNavigator (root) – Auth-Gated + Drawer
 * ─────────────────────────────────────────────
 * Top-level stack navigator:
 *   - Shows AnimatedSplash while auth loads
 *   - Auth flow (Login / Signup)  when logged out
 *   - Drawer → Tabs → Screens    when logged in
 *   - SavedScreen, CommentModal, Placeholder
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Navigators
import AuthNavigator from './AuthNavigator';
import DrawerNavigator from './DrawerNavigator';

// Screens (stack-level modals and sub-screens)
import CreatePostScreen from '../screens/CreatePostScreen';
import CreatePollScreen from '../screens/CreatePollScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import ShareNotesScreen from '../screens/ShareNotesScreen';

import BuySellScreen from '../screens/BuySellScreen';
import DiscoverEventsScreen from '../screens/DiscoverEventsScreen';
import AnimatedSplashScreen from '../screens/AnimatedSplashScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import SavedScreen from '../screens/SavedScreen';
import CalendarScreen from '../screens/CalendarScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import MyPostsScreen from '../screens/MyPostsScreen';
import ChatScreen from '../screens/ChatScreen';
import LostAndFoundScreen from '../screens/LostAndFoundScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  // ── Show animated splash while auth state is resolving ──
  if (loading) {
    return <AnimatedSplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          {/* Main app with drawer → tabs */}
          <Stack.Screen name="Main" component={DrawerNavigator} />

          {/* Modal: Create a new post or poll */}
          <Stack.Screen
            name="CreatePost"
            component={CreatePostScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="CreatePoll"
            component={CreatePollScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="CreateEvent"
            component={CreateEventScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />

          {/* Feature sub-screens */}
          <Stack.Screen
            name="ShareNotes"
            component={ShareNotesScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="BuySell"
            component={BuySellScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="DiscoverEvents"
            component={DiscoverEventsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="Saved"
            component={SavedScreen}
            options={{ animation: 'slide_from_right' }}
          />

          {/* My Posts */}
          <Stack.Screen
            name="MyPosts"
            component={MyPostsScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="LostAndFound"
            component={LostAndFoundScreen}
            options={{ animation: 'slide_from_right' }}
          />

          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />

          {/* Post Detail Screen */}
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />

          {/* Placeholder for coming-soon features */}
          <Stack.Screen
            name="Placeholder"
            component={PlaceholderScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        /* Auth flow (Login / Signup) */
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}

    </Stack.Navigator>
  );
};

export default AppNavigator;
