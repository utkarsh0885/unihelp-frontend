import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';
import PrimaryButton from '../Button/PrimaryButton';

const EmptyState = memo(({
  title = 'No Data Available',
  subtitle = 'Nothing to show here right now. Check back later.',
  icon = null,
  actionTitle = null,
  onAction = null,
  style = null,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title} allowFontScaling={true}>
        {title}
      </Text>
      {subtitle && (
        <Text style={styles.subtitle} allowFontScaling={true}>
          {subtitle}
        </Text>
      )}
      {actionTitle && onAction && (
        <View style={styles.actionContainer}>
          <PrimaryButton title={actionTitle} onPress={onAction} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.massive,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    opacity: 0.8,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: SPACING.xl,
  },
});

EmptyState.displayName = 'EmptyState';
export default EmptyState;
