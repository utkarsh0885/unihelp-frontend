import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const SkeletonLoader = ({ width, height, style, borderRadius = 8 }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

export const PostSkeleton = () => (
  <View style={styles.postCard}>
    <View style={styles.postHeader}>
      <SkeletonLoader width={40} height={40} borderRadius={20} />
      <View style={{ marginLeft: 12 }}>
        <SkeletonLoader width={120} height={16} style={{ marginBottom: 6 }} />
        <SkeletonLoader width={80} height={12} />
      </View>
    </View>
    <SkeletonLoader width="100%" height={16} style={{ marginBottom: 8 }} />
    <SkeletonLoader width="80%" height={16} style={{ marginBottom: 16 }} />
    <SkeletonLoader width="100%" height={200} borderRadius={12} />
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB', // Tailwind gray-200
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
});

export default SkeletonLoader;
