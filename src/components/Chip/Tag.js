import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../theme';

const Tag = memo(({
  text,
  icon = null,
  style = null,
  textStyle = null,
}) => {
  return (
    <View style={[styles.tag, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.text, textStyle]} allowFontScaling={true} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.small,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  icon: {
    marginRight: SPACING.xxs,
  },
  text: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
});

Tag.displayName = 'Tag';
export default Tag;
