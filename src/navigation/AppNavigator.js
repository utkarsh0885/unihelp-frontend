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
const DiscoverEventsScreen = lazy(() => import('../screens/DiscoverEventsScreen'));
const PlaceholderScreen = lazy(() => import('../screens/PlaceholderScreen'));
const SavedScreen = lazy(() => import('../screens/SavedScreen'));
const CalendarScreen = lazy(() => import('../screens/CalendarScreen'));
const PostDetailScreen = lazy(() => import('../screens/PostDetailScreen'));
const MyPostsScreen = lazy(() => import('../screens/MyPostsScreen'));
const LostAndFoundScreen = lazy(() => import('../screens/LostAndFoundScreen'));
const ProfileScreen = lazy(() => import('../screens/ProfileScreen'));

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
const LazyDrawer = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <DrawerNavigator {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyCreatePost = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <CreatePostScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyCreatePoll = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <CreatePollScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyCreateEvent = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <CreateEventScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyShareNotes = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <ShareNotesScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyBuySell = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <BuySellScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyDiscoverEvents = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <DiscoverEventsScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyCalendar = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <CalendarScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazySaved = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <SavedScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyMyPosts = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <MyPostsScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyLostAndFound = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <LostAndFoundScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyProfile = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <ProfileScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyPostDetail = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <PostDetailScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

const LazyAdminDashboard = (props) => (
  <ScreenErrorBoundary>
    <ProtectedRoute allowedRoles={['admin']}>
      <Suspense fallback={<ScreenLoader />}>
        <AdminScreen {...props} />
      </Suspense>
    </ProtectedRoute>
  </ScreenErrorBoundary>
);

const LazyPlaceholder = (props) => (
  <ScreenErrorBoundary>
    <Suspense fallback={<ScreenLoader />}>
      <PlaceholderScreen {...props} />
    </Suspense>
  </ScreenErrorBoundary>
);

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
          <Stack.Screen name="DiscoverEvents" component={LazyDiscoverEvents} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Calendar" component={LazyCalendar} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Saved" component={LazySaved} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="MyPosts" component={LazyMyPosts} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="LostAndFound" component={LazyLostAndFound} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Profile" component={LazyProfile} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="PostDetail" component={LazyPostDetail} options={{ animation: 'slide_from_right' }} />

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
