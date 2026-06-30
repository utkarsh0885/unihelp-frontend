/**
 * AppNavigator (root) – Auth-Gated + Drawer
 * ─────────────────────────────────────────────
 * Top-level stack navigator:
 *   - Shows AnimatedSplash while auth loads
 *   - Auth flow (Login / Signup)  when logged out
 *   - Drawer → Tabs → Screens    when logged in
 *   - SavedScreen, CommentModal, Placeholder
 */

import React, { Suspense, lazy } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

// Synchronous core imports
import AuthNavigator from './AuthNavigator';
import AnimatedSplashScreen from '../screens/AnimatedSplashScreen';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';

// Lazy-loaded Navigators & Screens
const DrawerNavigator = lazy(() => import('./DrawerNavigator'));
const CreatePostScreen = lazy(() => import('../screens/CreatePostScreen'));
const CreatePollScreen = lazy(() => import('../screens/CreatePollScreen'));
const CreateEventScreen = lazy(() => import('../screens/CreateEventScreen'));
const ShareNotesScreen = lazy(() => import('../screens/ShareNotesScreen'));
const BuySellScreen = lazy(() => import('../screens/BuySellScreen'));
const MyListingsScreen = lazy(() => import('../screens/MyListingsScreen'));
const DiscoverEventsScreen = lazy(() => import('../screens/DiscoverEventsScreen'));
const PlaceholderScreen = lazy(() => import('../screens/PlaceholderScreen'));
const SavedScreen = lazy(() => import('../screens/SavedScreen'));
const CalendarScreen = lazy(() => import('../screens/CalendarScreen'));
const PostDetailScreen = lazy(() => import('../screens/PostDetailScreen'));
const MyPostsScreen = lazy(() => import('../screens/MyPostsScreen'));
const LostAndFoundScreen = lazy(() => import('../screens/LostAndFoundScreen'));
const ProfileScreen = lazy(() => import('../screens/ProfileScreen'));
const ChatScreen = lazy(() => import('../screens/ChatScreen'));
const MessagesScreen = lazy(() => import('../screens/MessagesScreen'));
const NotificationsScreen = lazy(() => import('../screens/NotificationsScreen'));

// Lazy-load the Admin screen
const AdminScreen = lazy(() => import('../screens/AdminScreen'));

/**
 * ProtectedRoute Wrapper Component
 * Checks if the user has the required roles. If not, it can render a fallback.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Render a "Not Authorized" placeholder if user lacks the role
    return (
      <Suspense fallback={<View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>}>
        <PlaceholderScreen customTitle="Access Denied" />
      </Suspense>
    );
  }

  return children;
};

// Fallback loader for lazy screens
const ScreenLoader = () => (
  <View style={{ flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="large" color="#667eea" />
  </View>
);

// ── Define wrapped lazy components outside render to preserve reference stability ──
const wrapLazyComponent = (Component, screenName) => {
  return (props) => {
    const route = props?.route || {};
    const safeRoute = {
      ...route,
      params: route.params || {},
    };
    const safeProps = {
      ...props,
      route: safeRoute,
    };

    console.log(`[AppNavigator] Mounting ${screenName} — route params:`, safeRoute.params);

    return (
      <ScreenErrorBoundary>
        <Suspense fallback={<ScreenLoader />}>
          <Component {...safeProps} />
        </Suspense>
      </ScreenErrorBoundary>
    );
  };
};

const LazyDrawer = wrapLazyComponent(DrawerNavigator, 'Drawer');
const LazyCreatePost = wrapLazyComponent(CreatePostScreen, 'CreatePost');
const LazyCreatePoll = wrapLazyComponent(CreatePollScreen, 'CreatePoll');
const LazyCreateEvent = wrapLazyComponent(CreateEventScreen, 'CreateEvent');
const LazyShareNotes = wrapLazyComponent(ShareNotesScreen, 'ShareNotes');
const LazyBuySell = wrapLazyComponent(BuySellScreen, 'BuySell');
const LazyMyListings = wrapLazyComponent(MyListingsScreen, 'MyListings');
const LazyDiscoverEvents = wrapLazyComponent(DiscoverEventsScreen, 'DiscoverEvents');
const LazyCalendar = wrapLazyComponent(CalendarScreen, 'Calendar');
const LazySaved = wrapLazyComponent(SavedScreen, 'Saved');
const LazyMyPosts = wrapLazyComponent(MyPostsScreen, 'MyPosts');
const LazyLostAndFound = wrapLazyComponent(LostAndFoundScreen, 'LostAndFound');
const LazyProfile = wrapLazyComponent(ProfileScreen, 'Profile');
const LazyPostDetail = wrapLazyComponent(PostDetailScreen, 'PostDetail');
const LazyChat = wrapLazyComponent(ChatScreen, 'Chat');
const LazyMessages = wrapLazyComponent(MessagesScreen, 'Messages');
const LazyNotifications = wrapLazyComponent(NotificationsScreen, 'Notifications');
const LazyPlaceholder = wrapLazyComponent(PlaceholderScreen, 'Placeholder');

const LazyAdminDashboard = (props) => {
  const route = props?.route || {};
  const safeRoute = {
    ...route,
    params: route.params || {},
  };
  const safeProps = {
    ...props,
    route: safeRoute,
  };

  console.log(`[AppNavigator] Mounting AdminDashboard — route params:`, safeRoute.params);

  return (
    <ScreenErrorBoundary>
      <ProtectedRoute allowedRoles={['admin']}>
        <Suspense fallback={<ScreenLoader />}>
          <AdminScreen {...safeProps} />
        </Suspense>
      </ProtectedRoute>
    </ScreenErrorBoundary>
  );
};

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
        <Stack.Group screenOptions={{ headerShown: false }}>
          {/* Main app with drawer → tabs */}
          <Stack.Screen name="Main" component={LazyDrawer} />

          {/* Modal: Create a new post or poll */}
          <Stack.Screen
            name="CreatePost"
            component={LazyCreatePost}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="CreatePoll"
            component={LazyCreatePoll}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="CreateEvent"
            component={LazyCreateEvent}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />

          {/* Feature sub-screens */}
          <Stack.Screen name="ShareNotes" component={LazyShareNotes} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="BuySell" component={LazyBuySell} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="MyListings" component={LazyMyListings} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="DiscoverEvents" component={LazyDiscoverEvents} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Calendar" component={LazyCalendar} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Saved" component={LazySaved} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="MyPosts" component={LazyMyPosts} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="LostAndFound" component={LazyLostAndFound} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Profile" component={LazyProfile} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="PostDetail" component={LazyPostDetail} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Chat" component={LazyChat} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ChatList" component={LazyMessages} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Notifications" component={LazyNotifications} options={{ animation: 'slide_from_right' }} />

          {/* Role-Protected Admin Screen */}
          <Stack.Screen name="AdminDashboard" component={LazyAdminDashboard} options={{ animation: 'slide_from_right' }} />

          {/* Placeholder for coming-soon features */}
          <Stack.Screen name="Placeholder" component={LazyPlaceholder} options={{ animation: 'slide_from_right' }} />
        </Stack.Group>
      ) : (
        /* Auth flow (Login / Signup) */
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
