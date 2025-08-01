import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

export default function TargetBackdrop() {
  const { width, height } = useWindowDimensions();
  const screenSize = Math.max(width, height);
  
  // Create concentric rings that fill the entire screen
  // Using larger multipliers to ensure full coverage on all devices
  const baseSize = screenSize * 1.8;
  
  const rings = [
    { size: baseSize, color: '#0B0B0B' },        // Outermost (background)
    { size: baseSize * 0.8, color: '#141414' },  // Second ring
    { size: baseSize * 0.6, color: '#181818' },  // Third ring  
    { size: baseSize * 0.4, color: '#1E1E1E' },  // Fourth ring
    { size: baseSize * 0.2, color: '#0B0B0B' },  // Center circle
  ];

  return (
    <View style={StyleSheet.absoluteFill}>
      {rings.map((ring, index) => {
        const radius = ring.size / 2;
        return (
          <View
            key={index}
            style={[
              styles.ring,
              {
                width: ring.size,
                height: ring.size,
                borderRadius: radius,
                backgroundColor: ring.color,
                transform: [
                  { translateX: -radius },
                  { translateY: -radius },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
});