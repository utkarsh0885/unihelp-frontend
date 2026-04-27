/**
 * InputField – Theme-Aware
 * ─────────────────────────────────────────────
 * Styled input with theme support, icon, label,
 * password toggle, and error state.
 */

import React, { useState, memo, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const InputField = ({ label, icon, error, secureTextEntry, ...rest }) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          error && styles.inputRowError,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.textTertiary}
            style={styles.icon}
          />
        )}

        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry && !showPassword}
          {...rest}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    marginBottom: SIZES.md + 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.textTertiary,
    marginBottom: SIZES.sm,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: SIZES.md,
    height: 54,
  },
  inputRowFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputRowError: {
    borderColor: colors.accent,
  },
  icon: {
    marginRight: SIZES.sm + 2,
  },
  input: {
    flex: 1,
    fontSize: SIZES.fontMd,
    color: colors.textPrimary,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  error: {
    fontSize: SIZES.fontXs,
    color: colors.accent,
    marginTop: SIZES.xs + 2,
    marginLeft: SIZES.xs,
  },
});

export default memo(InputField);
