import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ResponsiveContainer = ({ children, style, maxWidth = 500, withCardStyle = false, noPadding = false }) => {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > maxWidth + 40; // Add padding buffer

  return (
    <View style={styles.outerContainer}>
      <View
        style={[
          styles.innerContainer,
          isLargeScreen && isWeb && {
            maxWidth: maxWidth,
            alignSelf: 'center',
            width: '100%',
          },
          isLargeScreen && isWeb && withCardStyle && {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: 24,
            padding: noPadding ? 0 : 32,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
            marginVertical: 40,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    width: '100%',
  },
  innerContainer: {
    flex: 1,
    width: '100%',
  },
});

export default ResponsiveContainer;
