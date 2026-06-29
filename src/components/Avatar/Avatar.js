import React, { memo, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SIZES } from '../../theme';

const Avatar = memo(({
  src = null,
  name = 'User',
  size = 'md', // xs | sm | md | lg | xl
  status = null, // online | offline | busy
  style = null,
}) => {
  const [imageError, setImageError] = useState(false);

  const getDimension = () => {
    return SIZES.avatars[size] || SIZES.avatars.md;
  };

  const dim = getDimension();
  const radius = dim / 2;

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return str.charAt(0).toUpperCase();
  };

  const getFontForSize = () => {
    if (size === 'xs' || size === 'sm') return TYPOGRAPHY.caption;
    if (size === 'lg') return TYPOGRAPHY.h3;
    if (size === 'xl') return TYPOGRAPHY.h1;
    return TYPOGRAPHY.body;
  };

  const getStatusColor = () => {
    if (status === 'online') return COLORS.accent;
    if (status === 'busy') return COLORS.danger;
    return COLORS.textDisabled;
  };

  const renderContent = () => {
    if (src && !imageError) {
      return (
        <Image
          source={{ uri: src }}
          style={{ width: dim, height: dim, borderRadius: radius }}
          onError={() => setImageError(true)}
          accessibilityRole="image"
          accessibilityLabel={`${name}'s avatar`}
        />
      );
    }
    return (
      <Text
        style={[getFontForSize(), { color: COLORS.textPrimary, fontWeight: '700' }]}
        allowFontScaling={true}
      >
        {getInitials(name)}
      </Text>
    );
  };

  return (
    <View style={[styles.container, { width: dim, height: dim, borderRadius: radius }, style]}>
      <View style={[styles.inner, { width: dim, height: dim, borderRadius: radius }]}>
        {renderContent()}
      </View>
      {status && (
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: getStatusColor(),
              width: Math.max(10, dim * 0.25),
              height: Math.max(10, dim * 0.25),
              borderRadius: Math.max(5, (dim * 0.25) / 2),
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
});

Avatar.displayName = 'Avatar';
export default Avatar;
