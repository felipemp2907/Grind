import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

export default function TargetBackdrop() {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width, height) * 1.2; // Slightly larger to ensure full coverage
  
  // Ring sizes as percentages of the base size
  const ringSizes = [
    size * 1.0,    // Outermost ring (100%)
    size * 0.75,   // Second ring (75%)
    size * 0.5,    // Third ring (50%)
    size * 0.25,   // Center circle (25%)
  ];

  // Colors from darkest (outer) to lightest (inner)
  const colors = ['#0B0B0B', '#141414', '#181818', '#1E1E1E'];

  return (
    <View style={StyleSheet.absoluteFill}>
      {ringSizes.map((ringSize, index) => {
        const radius = ringSize / 2;
        return (
          <View
            key={index}
            style={[
              styles.ring,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: radius,
                backgroundColor: colors[index],
                marginLeft: -radius,
                marginTop: -radius,
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