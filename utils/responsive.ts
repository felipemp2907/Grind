import { Dimensions, Platform } from 'react-native';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Base dimensions for scaling (iPhone 11 Pro dimensions)
const baseWidth = 375;
const baseHeight = 812;

// Width percentage to DP
const widthPercentageToDP = (percent: number): number => {
  const value = (percent * screenWidth) / 100;
  return Math.round(value);
};

// Height percentage to DP
const heightPercentageToDP = (percent: number): number => {
  const value = (percent * screenHeight) / 100;
  return Math.round(value);
};

// Responsive font value
const responsiveFontValue = (size: number, standardScreenHeight: number = baseHeight): number => {
  const heightPercent = (size * screenHeight) / standardScreenHeight;
  return Math.round(heightPercent);
};

// Safe wrapper functions
const safeWp = widthPercentageToDP;
const safeHp = heightPercentageToDP;

// Font helper - RF(16) respects user font-scale
export const RF = (size: number): number => {
  if (Platform.OS === 'web') {
    return size; // No scaling on web
  }
  return responsiveFontValue(size, baseHeight);
};

// Spacing - 4 equals 4% of screen width
export const SP = (percent: number) => safeWp(percent);

// Height percentage
export const HP = (percent: number) => safeHp(percent);

// Width percentage
export const WP = (percent: number) => safeWp(percent);

// Responsive padding/margin helpers
export const responsivePadding = {
  xs: SP(1),
  sm: SP(2),
  md: SP(4),
  lg: SP(6),
  xl: SP(8),
};

export const responsiveMargin = {
  xs: SP(1),
  sm: SP(2),
  md: SP(4),
  lg: SP(6),
  xl: SP(8),
};