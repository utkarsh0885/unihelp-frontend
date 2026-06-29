import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme';

const SectionCard = memo(({
  title,
  subtitle = null,
  action = null,
  children,
  elevation = 'sm',
  padding = 'md',
  style = null,
}) => {
  return (
    <Card elevation={elevation} padding={padding} style={style}>
      {(title || action) && (
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {title && (
              <Text style={styles.title} allowFontScaling={true}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={styles.subtitle} allowFontScaling={true}>
                {subtitle}
              </Text>
            )}
          </View>
          {action && <View style={styles.actionContainer}>{action}</View>}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </Card>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  titleContainer: {
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
  actionContainer: {
    marginLeft: SPACING.sm,
  },
  content: {
    flexDirection: 'column',
  },
});

SectionCard.displayName = 'SectionCard';
export default SectionCard;
