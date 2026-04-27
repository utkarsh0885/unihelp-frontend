import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Animated, Text, StyleSheet, SafeAreaView } from 'react-native';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 3 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: -20,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      });
    }, 3000);
  }, [opacity, translateY]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <SafeAreaView style={styles.container} pointerEvents="none">
          <Animated.View
            style={[
              styles.toast,
              toast.type === 'error' && styles.error,
              toast.type === 'success' && styles.success,
              { opacity, transform: [{ translateY }] },
            ]}
          >
            <Text style={styles.text}>{toast.message}</Text>
          </Animated.View>
        </SafeAreaView>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50, // Below header
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    backgroundColor: '#374151', // Default info (gray-700)
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    maxWidth: '90%',
  },
  error: {
    backgroundColor: '#EF4444', // Red-500
  },
  success: {
    backgroundColor: '#10B981', // Emerald-500
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
