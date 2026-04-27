/**
 * DiscoverEventsScreen – Theme-Aware
 * ─────────────────────────────────────────────
 * Browse campus events.
 * Fully functional with local state.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import AnimatedPostCard from '../components/AnimatedPostCard';

const DiscoverEventsScreen = ({ navigation }) => {
  const { colors, shadows } = useTheme();
  const { 
    events, posts, 
    toggleLike, toggleSave, votePoll, userId 
  } = useData();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const handleLike = (postId) => toggleLike(postId);
  const handleSave = (postId) => toggleSave(postId);

  // Unified Feed: Events + Categorized Posts
  const mergedData = useMemo(() => {
    const eventPosts = posts
      .filter(p => p.category === 'Events' || p.category === 'Calender')
      .map(p => ({ ...p, isGenericPost: true }));
    
    const nativeEvents = events.map(e => ({ ...e, isGenericPost: false }));

    return [...nativeEvents, ...eventPosts].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : 0;
      const dateB = b.createdAt ? new Date(b.createdAt) : 0;
      return dateB - dateA;
    });
  }, [events, posts]);



  const renderItem = useCallback(({ item, index }) => {
    if (item.isGenericPost) {
      return (
        <AnimatedPostCard
          post={item}
          onPress={(p) => navigation.navigate('PostDetail', { post: p })}
          onLike={handleLike}
          onSave={handleSave}
          onComment={(p) => navigation.navigate('PostDetail', { post: p })}
          onVotePoll={votePoll}
          userId={userId}
          index={index}
        />
      );
    }

    return (
      <View style={styles.card}>
        <View style={[styles.eventIconWrap, { backgroundColor: item.color + '18' }]}>
          <Ionicons name={item.icon || 'calendar'} size={24} color={item.color || colors.primary} />
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={styles.eventRow}><Ionicons name="calendar-outline" size={13} color={colors.textTertiary} /><Text style={styles.eventDetail}>{item.date} · {item.time}</Text></View>
          <View style={styles.eventRow}><Ionicons name="location-outline" size={13} color={colors.textTertiary} /><Text style={styles.eventDetail}>{item.location}</Text></View>
        </View>

      </View>
    );
  }, [navigation, handleLike, handleSave, votePoll, userId, styles, colors]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={{ backgroundColor: '#1E3A8A' }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Discover Events</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
      </View>
      <FlatList 
        data={mergedData} 
        renderItem={renderItem} 
        keyExtractor={(item) => item.id} 
        contentContainerStyle={styles.list} 
        showsVerticalScrollIndicator={false} 
      />
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: { ...shadows.medium, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, paddingBottom: SIZES.md, paddingTop: SIZES.sm,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  list: { padding: SIZES.md, paddingBottom: SIZES.xxxl },
  card: { 
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: 20, padding: SIZES.md, 
    marginBottom: SIZES.sm + 2, borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.small,
  },
  eventIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  eventDetail: { fontSize: 12, color: colors.textTertiary, fontWeight: '600' },

});

export default DiscoverEventsScreen;
