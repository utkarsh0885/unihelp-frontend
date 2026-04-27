import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../services/apiClient';

const StatCard = ({ title, value, icon, color, colors }) => (
  <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
    <View style={[styles.statIconWrap, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textTertiary }]}>{title}</Text>
    </View>
  </View>
);

const AdminScreen = () => {
  const { colors, shadows, isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, flaggedRes] = await Promise.all([
        apiClient.get('/api/admin/stats'),
        apiClient.get('/api/admin/flagged'),
      ]);
      setStats(statsRes.data);
      setFlaggedPosts(flaggedRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      Alert.alert('Error', 'Failed to fetch admin dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (postId, action) => {
    try {
      if (action === 'delete') {
        await apiClient.delete(`/api/admin/posts/${postId}`);
        setFlaggedPosts(prev => prev.filter(p => p._id !== postId));
      }
    } catch (err) {
      Alert.alert('Error', 'Action failed');
    }
  };

  const renderFlaggedItem = ({ item }) => {
    const post = item.targetId;
    if (!post) return null;

    return (
      <View style={[styles.flaggedItem, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.flaggedHeader}>
          <Text style={[styles.flaggedTitle, { color: colors.textPrimary }]}>{post.title}</Text>
          <Ionicons name="flag" size={20} color="#EF4444" />
        </View>
        <Text style={[styles.flaggedAuthor, { color: colors.textTertiary }]}>
          By: {post.authorName || post.author?.name || 'Anonymous'} · Reported by: {item.reporter?.name || 'User'}
        </Text>
        <Text style={[styles.flaggedReason, { color: '#EF4444' }]}>Reason: {item.reason}</Text>
        <Text style={[styles.flaggedContent, { color: colors.textSecondary }]} numberOfLines={2}>{post.content}</Text>
        
        <View style={styles.flaggedActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#EF444420' }]} 
            onPress={() => handleAction(post._id, 'delete')}
          >
            <Text style={{ color: '#EF4444', fontWeight: '700' }}>Delete Post</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loaderWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Admin Console</Text>
        <TouchableOpacity onPress={fetchData}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard title="Total Users" value={stats?.users || 0} icon="people" color="#3B82F6" colors={colors} />
          <StatCard title="Active Posts" value={stats?.posts || 0} icon="document-text" color="#10B981" colors={colors} />
          <StatCard title="Messages" value={stats?.messages || 0} icon="chatbubbles" color="#8B5CF6" colors={colors} />
          <StatCard title="Banned" value={stats?.banned || 0} icon="ban" color="#EF4444" colors={colors} />
        </View>

        {/* Flagged Content */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Flagged for Review</Text>
          <FlatList
            data={flaggedPosts}
            renderItem={renderFlaggedItem}
            keyExtractor={item => item._id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No flagged content at the moment.</Text>
            }
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick System Actions</Text>
          <TouchableOpacity style={[styles.systemBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={[styles.systemBtnText, { color: colors.textPrimary }]}>Verify Pending Users</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.systemBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="stats-chart" size={20} color="#10B981" />
            <Text style={[styles.systemBtnText, { color: colors.textPrimary }]}>System Health Log</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  scrollContent: { padding: 20 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    width: '48%',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statTitle: { fontSize: 12, fontWeight: '600' },
  
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
  
  flaggedItem: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  flaggedHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  flaggedTitle: { fontSize: 16, fontWeight: '700' },
  flaggedAuthor: { fontSize: 12, marginBottom: 4 },
  flaggedReason: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  flaggedContent: { fontSize: 14, marginBottom: 15 },
  flaggedActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  
  systemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
  },
  systemBtnText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600' },
  emptyText: { textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default AdminScreen;
