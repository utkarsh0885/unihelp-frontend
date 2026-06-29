import React, { memo } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SIZES } from '../../theme';

const SearchInput = memo(({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  disabled = false,
  style = null,
  accessibilityLabel = 'Search Input',
  ...rest
}) => {
  return (
    <View style={[styles.container, disabled && styles.disabled, style]}>
      {/* Search Icon symbol representation */}
      <View style={styles.iconContainer}>
        <View style={styles.searchCircle} />
        <View style={styles.searchHandle} />
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        editable={!disabled}
        returnKeyType="search"
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        style={styles.input}
        allowFontScaling={true}
        {...rest}
      />

      {value && value.length > 0 && onClear && !disabled && (
        <Pressable
          onPress={onClear}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <View style={styles.clearIcon} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    minHeight: SIZES.layout.minTouchTarget,
    paddingHorizontal: SPACING.md,
  },
  disabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 16,
    height: 16,
    marginRight: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
  },
  searchHandle: {
    width: 5,
    height: 2,
    backgroundColor: COLORS.textMuted,
    position: 'absolute',
    bottom: 1,
    right: 1,
    transform: [{ rotate: '45deg' }],
  },
  input: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    flex: 1,
    paddingVertical: SPACING.xs,
  },
  clearButton: {
    padding: SPACING.xxs,
  },
  clearIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.textMuted,
  },
});

SearchInput.displayName = 'SearchInput';
export default SearchInput;
