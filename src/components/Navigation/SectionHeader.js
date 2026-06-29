import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

const SectionHeader = memo(({
  title,
  subtitle = null,
  actionText = null,
  onAction = null,
  style = null,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        <Text style={styles.title} allowFontScaling={true}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} allowFontScaling={true}>
            {subtitle}
          </Text>
        )}
      </View>
      {actionText && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={actionText}
        >
          <Text style={styles.actionText} allowFontScaling={true}>
            {actionText}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.xxs,
  },
  actionBtn: {
    paddingVertical: SPACING.xxs,
    paddingHorizontal: SPACING.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  actionText: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary,
  },
});

SectionHeader.displayName = 'SectionHeader';
export default SectionHeader;
