import React, { memo, useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../theme';

const TextArea = memo(({
  label,
  value,
  onChangeText,
  placeholder,
  disabled = false,
  error = null,
  helperText = null,
  numberOfLines = 4,
  maxLength = null,
  style = null,
  inputStyle = null,
  accessibilityLabel,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[styles.label, disabled && styles.disabledText]}
          allowFontScaling={true}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focusedContainer,
          error && styles.errorContainer,
          disabled && styles.disabledContainer,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          editable={!disabled}
          multiline={true}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          textAlignVertical="top"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessible={true}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityState={{ disabled }}
          style={[
            styles.input,
            { minHeight: numberOfLines * 22 },
            disabled && styles.disabledText,
            inputStyle,
          ]}
          allowFontScaling={true}
          {...rest}
        />
      </View>

      <View style={styles.footerContainer}>
        <View style={styles.helperWrapper}>
          {error ? (
            <Text style={styles.errorText} allowFontScaling={true}>
              {error}
            </Text>
          ) : helperText ? (
            <Text style={styles.helperText} allowFontScaling={true}>
              {helperText}
            </Text>
          ) : null}
        </View>

        {maxLength && (
          <Text style={styles.charCount} allowFontScaling={true}>
            {value ? value.length : 0}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xxs,
  },
  inputContainer: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.medium,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  focusedContainer: {
    borderColor: COLORS.borderFocus,
    backgroundColor: COLORS.surface,
  },
  errorContainer: {
    borderColor: COLORS.danger,
  },
  disabledContainer: {
    backgroundColor: COLORS.background,
    opacity: 0.7,
  },
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  disabledText: {
    color: COLORS.textDisabled,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xxs,
  },
  helperWrapper: {
    flex: 1,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  charCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
});

TextArea.displayName = 'TextArea';
export default TextArea;
