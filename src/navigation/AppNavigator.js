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
const ChatScreen = lazy(() => import('../screens/ChatScreen'));
const LostAndFoundScreen = lazy(() => import('../screens/LostAndFoundScreen'));
const ProfileScreen = lazy(() => import('../screens/ProfileScreen'));

// Lazy-load the new Admin screen (we will create this next)
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
        <Stack.Group screenOptions={{ 
            headerShown: false,
            // Wrap all lazily loaded screens in Suspense automatically via a custom wrapper
            // But since React Navigation v6+, we just need to wrap the component prop
          }}>
          {/* Main app with drawer → tabs */}
          <Stack.Screen name="Main">
            {() => <Suspense fallback={<ScreenLoader />}><DrawerNavigator /></Suspense>}
          </Stack.Screen>

          {/* Modal: Create a new post or poll */}
          <Stack.Screen name="CreatePost" options={{ animation: 'slide_from_bottom', presentation: 'modal' }}>
            {() => <Suspense fallback={<ScreenLoader />}><CreatePostScreen /></Suspense>}
          </Stack.Screen>
          <Stack.Screen name="CreatePoll" options={{ animation: 'slide_from_bottom', presentation: 'modal' }}>
            {() => <Suspense fallback={<ScreenLoader />}><CreatePollScreen /></Suspense>}
          </Stack.Screen>
          <Stack.Screen name="CreateEvent" options={{ animation: 'slide_from_bottom', presentation: 'modal' }}>
            {() => <Suspense fallback={<ScreenLoader />}><CreateEventScreen /></Suspense>}
          </Stack.Screen>

          {/* Feature sub-screens */}
          <Stack.Screen name="ShareNotes" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><ShareNotesScreen /></Suspense>}
          </Stack.Screen>

          <Stack.Screen name="BuySell" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><BuySellScreen /></Suspense>}
          </Stack.Screen>
          
          <Stack.Screen name="DiscoverEvents" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><DiscoverEventsScreen /></Suspense>}
          </Stack.Screen>

          <Stack.Screen name="Calendar" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><CalendarScreen /></Suspense>}
          </Stack.Screen>

          <Stack.Screen name="Saved" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><SavedScreen /></Suspense>}
          </Stack.Screen>

          <Stack.Screen name="MyPosts" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><MyPostsScreen /></Suspense>}
          </Stack.Screen>

          <Stack.Screen name="Chat" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><ChatScreen /></Suspense>}
          </Stack.Screen>

          <Stack.Screen name="LostAndFound" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><LostAndFoundScreen /></Suspense>}
          </Stack.Screen>

          <Stack.Screen name="Profile" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><ProfileScreen /></Suspense>}
          </Stack.Screen>

          <Stack.Screen name="PostDetail" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><PostDetailScreen /></Suspense>}
          </Stack.Screen>

          {/* Role-Protected Admin Screen */}
          <Stack.Screen name="AdminDashboard" options={{ animation: 'slide_from_right' }}>
            {() => (
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<ScreenLoader />}>
                  <AdminScreen />
                </Suspense>
              </ProtectedRoute>
            )}
          </Stack.Screen>

          {/* Placeholder for coming-soon features */}
          <Stack.Screen name="Placeholder" options={{ animation: 'slide_from_right' }}>
            {() => <Suspense fallback={<ScreenLoader />}><PlaceholderScreen /></Suspense>}
          </Stack.Screen>
        </Stack.Group>
      ) : (
        /* Auth flow (Login / Signup) */
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}

    </Stack.Navigator>
  );
};

export default AppNavigator;
