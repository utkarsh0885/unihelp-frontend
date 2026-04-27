/**
 * CalendarScreen – Campus Events Tracker
 * ─────────────────────────────────────────────
 * Interactive monthly calendar with date-specific
 * event lists. Uses react-native-calendars.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

const { width } = Dimensions.get('window');

// Persistent events managed via DataContext 🏛️

const CalendarScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { events } = useData();
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  const [selectedDate, setSelectedDate] = useState('2026-04-18');
  const [contentAnim] = useState(new Animated.Value(0));

  // ── Animation Effect on Date Change ──
  React.useEffect(() => {
    contentAnim.setValue(0);
    Animated.spring(contentAnim, {
      toValue: 1,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [selectedDate]);

  const markedDates = useMemo(() => {
    const marks = {};
    const today = new Date().toISOString().split('T')[0];
    
    // Add multi-dots for events from global state
    events.forEach(event => {
      const date = event.date;
      if (!marks[date]) marks[date] = { dots: [] };
      marks[date].dots.push({
        key: event.id,
        color: date === selectedDate ? '#FFFFFF' : event.color,
        selectedDotColor: '#FFFFFF'
      });
    });

    // Add today styling
    marks[today] = { ...marks[today], today: true };

      // Add selection styling
      marks[selectedDate] = {
        ...marks[selectedDate],
        selected: true,
        selectedColor: colors.primary,
        selectedTextColor: '#FFFFFF',
      };
      return marks;
    }, [selectedDate, events, colors]);

  const currentEvents = useMemo(() => 
    events.filter(e => e.date === selectedDate),
    [selectedDate, events]
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: isDark ? colors.background : '#1E3A8A' }]} edges={['top']}>
      <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" />
      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={isDark ? ['#1A1A1A', '#0D0D0D'] : ['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(79, 157, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)' }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Campus Calendar</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
      </View>

        {/* Calendar Section */}
        <View style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={day => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            markingType={'multi-dot'}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.textTertiary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: colors.accent,
              dayTextColor: colors.textPrimary,
              textDisabledColor: colors.borderLight,
              dotColor: colors.accent,
              selectedDotColor: '#FFFFFF',
              arrowColor: colors.primary,
              disabledArrowColor: colors.borderLight,
              monthTextColor: colors.primary,
              indicatorColor: colors.primary,
              textDayFontWeight: '500',
              textMonthFontWeight: '900',
              textDayHeaderFontWeight: '700',
              textDayFontSize: 15,
              textMonthFontSize: 20,
              textDayHeaderFontSize: 12,
              'stylesheet.calendar.header': {
                dayHeader: {
                  marginTop: 8,
                  marginBottom: 8,
                  width: 32,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.textTertiary,
                  textTransform: 'uppercase',
                }
              }
            }}
          />
        </View>
        {/* Events List Section */}
        <View style={styles.eventsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{currentEvents.length} Tasks</Text>
            </View>
          </View>

        <Animated.View style={{ 
          opacity: contentAnim,
          transform: [
            { translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            { scale: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }
          ]
        }}>
            {currentEvents.length > 0 ? (
              currentEvents.map(item => (
                <TouchableOpacity key={item.id} style={styles.eventCard} activeOpacity={0.8}>
                  <View style={[styles.eventIndicator, { backgroundColor: item.color }]} />
                  <View style={styles.eventDetails}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle}>{item.title}</Text>
                      <View style={[styles.categoryPill, { backgroundColor: item.color + '10' }]}>
                        <Text style={[styles.categoryText, { color: item.color }]}>{item.category}</Text>
                      </View>
                    </View>
                    <View style={styles.eventInfoRow}>
                      <View style={styles.infoItem}>
                        <Ionicons name="time-outline" size={14} color="#6B7280" />
                        <Text style={styles.infoText}>{item.time}</Text>
                      </View>
                    </View>
                    <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="calendar-clear-outline" size={40} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Free day! 🕊️</Text>
                <Text style={styles.emptySubtitle}>No events scheduled for this day. Perfect time for some self-study!</Text>
                <TouchableOpacity style={styles.suggestBtn} activeOpacity={0.8}>
                  <Text style={styles.suggestBtnText}>Host a Global Event</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* Floating Action Button (+) */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CreateEvent', { date: selectedDate })}
      >
        <LinearGradient
          colors={isDark ? ['#1A1A1A', '#2A2A2A'] : ['#1E3A8A', '#2563EB']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const createStyles = (colors, shadows, isDark) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: { ...shadows.medium, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, paddingBottom: SIZES.md, paddingTop: SIZES.sm,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  calendarCard: {
    backgroundColor: colors.surface, margin: SIZES.md, borderRadius: 24, padding: SIZES.xs,
    ...shadows.medium, borderColor: colors.borderLight, borderWidth: 1,
  },
  eventsContainer: { paddingHorizontal: SIZES.md, paddingBottom: 60 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md, marginTop: SIZES.sm },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1.2 },
  badge: { backgroundColor: colors.primaryGlow, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: SIZES.md,
    marginBottom: SIZES.sm + 4, ...shadows.small, borderWidth: 1, borderColor: colors.borderLight,
  },
  eventIndicator: { width: 5, height: 44, borderRadius: 3, marginRight: SIZES.md },
  eventDetails: { flex: 1 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  eventTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, flex: 1, marginRight: 8 },
  eventDesc: { fontSize: 13, color: colors.textTertiary, marginTop: 4, lineHeight: 18 },
  categoryPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  categoryText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  eventInfoRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: colors.textTertiary, fontWeight: '700' },
  
  // Empty State Styles
  emptyContainer: {
    padding: 60, alignItems: 'center', justifyContent: 'center', marginTop: SIZES.md,
    backgroundColor: colors.surfaceLight, borderRadius: 24, borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', lineHeight: 20, maxWidth: 220 },
  suggestBtnText: { fontSize: 14, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Floating Action Button
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 64, height: 64, borderRadius: 32,
    ...shadows.medium, elevation: 8,
  },
  fabGradient: {
    width: '100%', height: '100%', borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default CalendarScreen;
