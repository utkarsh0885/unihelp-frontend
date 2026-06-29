import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

const StatCard = memo(({
  label,
  value,
  trend = null, // e.g. "+12%" or "-5%"
  trendDirection = 'up', // up | down | neutral
  icon = null,
  onPress = null,
  style = null,
}) => {
  const getTrendColor = () => {
    if (trendDirection === 'up') return COLORS.accent;
    if (trendDirection === 'down') return COLORS.danger;
    return COLORS.textMuted;
  };

  return (
    <Card onPress={onPress} padding="md" style={[styles.card, style]}>
      <View style={styles.topRow}>
        <Text style={styles.label} allowFontScaling={true} numberOfLines={1}>
          {label}
        </Text>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.value} allowFontScaling={true} numberOfLines={1}>
          {value}
        </Text>
        {trend && (
          <Text
            style={[styles.trend, { color: getTrendColor() }]}
            allowFontScaling={true}
          >
            {trend}
          </Text>
        )}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.textSecondary,
    flex: 1,
  },
  iconContainer: {
    marginLeft: SPACING.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  value: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
  },
  trend: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
});

StatCard.displayName = 'StatCard';
export default StatCard;
