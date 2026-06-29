import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../theme';

const Badge = memo(({
  label,
  variant = 'neutral', // neutral | success | warning | danger | info | accent
  size = 'md', // sm | md
  style = null,
  textStyle = null,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return { bg: COLORS.accentLight, text: COLORS.accent };
      case 'warning':
        return { bg: COLORS.warningLight, text: COLORS.warning };
      case 'danger':
        return { bg: COLORS.dangerLight, text: COLORS.danger };
      case 'info':
        return { bg: COLORS.infoLight, text: COLORS.info };
      case 'accent':
        return { bg: COLORS.primaryLight, text: COLORS.primary };
      default:
        return { bg: COLORS.surfaceSubtle, text: COLORS.textSecondary };
    }
  };

  const currentVariant = getVariantStyles();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: currentVariant.bg },
        isSmall ? styles.badgeSm : styles.badgeMd,
        style,
      ]}
    >
      <Text
        style={[
          isSmall ? TYPOGRAPHY.caption : TYPOGRAPHY.label,
          { color: currentVariant.text },
          textStyle,
        ]}
        allowFontScaling={true}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    borderRadius: RADIUS.pill,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
  },
});

Badge.displayName = 'Badge';
export default Badge;
