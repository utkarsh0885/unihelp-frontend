import React, { memo, useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SIZES } from '../../theme';

const Input = memo(({
  label,
  value,
  onChangeText,
  placeholder,
  disabled = false,
  error = null,
  helperText = null,
  leftIcon = null,
  rightIcon = null,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
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
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessible={true}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityState={{ disabled }}
          style={[
            styles.input,
            disabled && styles.disabledText,
            inputStyle,
          ]}
          allowFontScaling={true}
          {...rest}
        />

        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.medium,
    minHeight: SIZES.layout.minTouchTarget,
    paddingHorizontal: SPACING.md,
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
    flex: 1,
    paddingVertical: SPACING.xs,
  },
  disabledText: {
    color: COLORS.textDisabled,
  },
  leftIcon: {
    marginRight: SPACING.xs,
  },
  rightIcon: {
    marginLeft: SPACING.xs,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    marginTop: SPACING.xxs,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.xxs,
  },
});

Input.displayName = 'Input';
export default Input;
