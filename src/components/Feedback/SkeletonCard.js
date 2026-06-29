import React, { memo, useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../theme';
import Card from '../Card/Card';

const SkeletonCard = memo(({ lines = 3, hasHeader = true, style = null }) => {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Card elevation="none" padding="md" style={[styles.card, style]}>
      {hasHeader && (
        <View style={styles.header}>
          <Animated.View style={[styles.avatar, { opacity: opacityAnim }]} />
          <View style={styles.headerText}>
            <Animated.View style={[styles.line, styles.titleLine, { opacity: opacityAnim }]} />
            <Animated.View style={[styles.line, styles.subtitleLine, { opacity: opacityAnim }]} />
          </View>
        </View>
      )}

      {Array.from({ length: lines }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.line,
            i === lines - 1 ? styles.lastLine : styles.fullLine,
            { opacity: opacityAnim },
          ]}
        />
      ))}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  line: {
    height: 14,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.small,
    marginBottom: SPACING.xs,
  },
  titleLine: {
    width: '40%',
  },
  subtitleLine: {
    width: '25%',
    height: 10,
    marginTop: 4,
  },
  fullLine: {
    width: '100%',
  },
  lastLine: {
    width: '70%',
    marginBottom: 0,
  },
});

SkeletonCard.displayName = 'SkeletonCard';
export default SkeletonCard;
