import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SIZES, GRADIENTS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const ExpandableFAB = ({ onPost, onEvent, onPoll }) => {
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [isOpen, setIsOpen] = useState(false);
  
  const animation = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const onPressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleAction = (action) => {
    toggleMenu();
    setTimeout(() => action?.(), 200);
  };

  const makeActionStyle = (offsetY) => ({
    transform: [
      { scale: animation },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, offsetY],
        }),
      },
    ],
    opacity: animation.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0, 0, 1],
    }),
  });

  const rotation = {
    transform: [
      { scale: pressScale },
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '135deg'],
        }),
      },
    ],
  };

  // Premium Gradient (Blue -> Cyan for tech/campus feel)
  const premiumGradient = ['#1E3A8A', '#06B6D4'];

  return (
    <View style={styles.container}>


      {/* Expanded items */}
      <Animated.View style={[styles.actionBtn, makeActionStyle(-180)]}>
        <TouchableOpacity onPress={() => handleAction(onPoll)} style={styles.actionTouchable} activeOpacity={0.7}>
          <View style={[styles.gradientInner, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="bar-chart" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.actionBtn, makeActionStyle(-120)]}>
        <TouchableOpacity onPress={() => handleAction(onEvent)} style={styles.actionTouchable} activeOpacity={0.7}>
          <View style={[styles.gradientInner, { backgroundColor: '#10B981' }]}>
            <Ionicons name="calendar-sharp" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.actionBtn, makeActionStyle(-60)]}>
        <TouchableOpacity onPress={() => handleAction(onPost)} style={styles.actionTouchable} activeOpacity={0.7}>
          <View style={[styles.gradientInner, { backgroundColor: colors.primary }]}>
            <Ionicons name="create" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Main button */}
      <TouchableOpacity 
        onPress={toggleMenu} 
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <Animated.View style={[styles.mainBtn, rotation, { backgroundColor: isOpen ? (isDark ? colors.surfaceElevated : '#111827') : colors.primary }]}>
          <View style={styles.mainGradientInner}>
            <Ionicons name="add" size={40} color="#FFFFFF" />
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  actionBtn: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    ...shadows.medium,
    elevation: 6,
  },
  gradientInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTouchable: {
    width: '100%',
    height: '100%',
  },
  mainBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    ...shadows.glow,
    elevation: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mainGradientInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ExpandableFAB;
