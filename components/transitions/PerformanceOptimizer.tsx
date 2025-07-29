import { useEffect } from 'react';
import { Platform } from 'react-native';
import React from "react";

// Enable screens for better performance on native platforms
export const usePerformanceOptimization = () => {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        // Enable screens for better performance
        const { enableScreens } = require('react-native-screens');
        enableScreens(true);
        
        console.log('Performance optimizations enabled');
      } catch (error) {
        console.log('react-native-screens not available, skipping optimization');
      }
    }
  }, []);
};

export const PerformanceOptimizer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  usePerformanceOptimization();
  return children as React.ReactElement;
};