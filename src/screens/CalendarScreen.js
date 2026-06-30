/**
 * CalendarScreen.js
 * ─────────────────────────────────────────────
 * Official University Academic Planner & Agenda.
 * Premium Phase 9.0 Design System Redesign.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import ResponsiveContainer from '../components/ResponsiveContainer';

// Design System Tokens
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS } from '../theme';
import { getElevation } from '../theme/elevation';

const CalendarScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { events } = useData();
  
  const elevation = useMemo(() => getElevation(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors, elevation, isDark), [colors, elevation, isDark]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr || '2026-04-18');
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
  }, [selectedDate, contentAnim]);

  const markedDates = useMemo(() => {
    const marks = {};
    const today = new Date().toISOString().split('T')[0];
    
    events.forEach(event => {
      const date = event.date;
      if (!marks[date]) marks[date] = { dots: [] };
      marks[date].dots.push({
        key: event.id,
        color: date === selectedDate ? '#FFFFFF' : (event.color || colors.primary),
        selectedDotColor: '#FFFFFF'
      });
    });

    marks[today] = { ...marks[today], today: true };

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
    <View style={styles.screen}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />
      
      {/* Header Bar */}
      <View style={styles.appBar}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.appBarTitle}>Academic Planner</Text>
        <View style={{ width: SIZES.layout.minTouchTarget }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <ResponsiveContainer maxWidth={680} withCardStyle={false}>
          {/* Calendar Card */}
          <View style={styles.calendarCard}>
            <Calendar
              current={selectedDate}
              onDayPress={day => setSelectedDate(day.dateString)}
              markedDates={markedDates}
              markingType={'multi-dot'}
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                textSectionTitleColor: colors.textMuted,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: colors.accent,
                dayTextColor: colors.textPrimary,
                textDisabledColor: colors.textDisabled,
                dotColor: colors.primary,
                selectedDotColor: '#FFFFFF',
                arrowColor: colors.primary,
                disabledArrowColor: colors.textDisabled,
                monthTextColor: colors.textPrimary,
                indicatorColor: colors.primary,
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
                textDayHeaderFontWeight: '700',
                textDayFontSize: 15,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 12,
                'stylesheet.calendar.header': {
                  dayHeader: {
                    marginTop: 8,
                    marginBottom: 8,
                    width: 32,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: '700',
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                  }
                }
              }}
            />
          </View>

          {/* Agenda Section */}
          <View style={styles.agendaContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Agenda · {selectedDate}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{currentEvents.length} {currentEvents.length === 1 ? 'Item' : 'Items'}</Text>
              </View>
            </View>

            <Animated.View style={{ 
              opacity: contentAnim,
              transform: [
                { translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) },
              ]
            }}>
              {currentEvents.length > 0 ? (
                currentEvents.map(item => (
                  <Pressable key={item.id} style={({ pressed }) => [styles.agendaCard, pressed && { opacity: 0.85 }]}>
                    <View style={[styles.agendaIndicator, { backgroundColor: item.color || colors.primary }]} />
                    
                    <View style={styles.agendaDetails}>
                      <View style={styles.agendaHeaderRow}>
                        <Text style={styles.agendaTitle}>{item.title}</Text>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryText}>{item.category || 'Event'}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.agendaMetaRow}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.agendaMetaText}>{item.time || 'All Day'}</Text>
                      </View>
                      
                      {item.description ? (
                        <Text style={styles.agendaDesc} numberOfLines={2}>{item.description}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="calendar-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>Clear Schedule</Text>
                  <Text style={styles.emptySubtitle}>No academic deadlines or campus events scheduled for this day.</Text>
                  <Pressable 
                    style={({ pressed }) => [styles.suggestBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => navigation.navigate('CreateEvent', { date: selectedDate })}
                  >
                    <Ionicons name="add" size={16} color={colors.primary} />
                    <Text style={styles.suggestBtnText}>Add Personal Event</Text>
                  </Pressable>
                </View>
              )}
            </Animated.View>
          </View>
        </ResponsiveContainer>
      </ScrollView>

      {/* Floating Action Button (+) */}
      <Pressable 
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] }]}
        onPress={() => navigation.navigate('CreateEvent', { date: selectedDate })}
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
};

const createStyles = (colors, elevation, isDark) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  backBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  appBarTitle: {
    ...TYPOGRAPHY.title,
    color: colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  calendarCard: {
    backgroundColor: colors.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
  },
  agendaContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.massive,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  countText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.bold,
    color: colors.primary,
  },
  agendaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.large,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.xs,
  },
  agendaIndicator: {
    width: 4,
    height: '100%',
    minHeight: 40,
    borderRadius: RADIUS.pill,
    marginRight: SPACING.md,
  },
  agendaDetails: {
    flex: 1,
  },
  agendaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  agendaTitle: {
    ...TYPOGRAPHY.subtitle,
    color: colors.textPrimary,
    flex: 1,
  },
  categoryPill: {
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  agendaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  agendaMetaText: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textSecondary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  agendaDesc: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xxs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  suggestBtnText: {
    ...TYPOGRAPHY.button,
    color: colors.primary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.md,
  },
});

export default CalendarScreen;
