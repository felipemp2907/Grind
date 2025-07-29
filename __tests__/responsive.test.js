import { RF, SP, HP } from '../utils/responsive';

// Mock the responsive libraries
jest.mock('react-native-responsive-fontsize', () => ({
  RFValue: (size, baseHeight = 812) => {
    // Simulate responsive font scaling
    const screenHeight = 667; // iPhone SE height for testing
    return Math.round((size * screenHeight) / baseHeight);
  },
}));

jest.mock('react-native-responsive-dimensions', () => ({
  widthPercentageToDP: (percent) => {
    const screenWidth = 375; // iPhone SE width for testing
    return Math.round((percent * screenWidth) / 100);
  },
  heightPercentageToDP: (percent) => {
    const screenHeight = 667; // iPhone SE height for testing
    return Math.round((percent * screenHeight) / 100);
  },
}));

describe('Responsive Utilities', () => {
  test('RF should scale fonts based on screen height', () => {
    expect(RF(16)).toBeCloseTo(13, 0); // 16 * 667 / 812 ≈ 13
    expect(RF(24)).toBeCloseTo(20, 0); // 24 * 667 / 812 ≈ 20
  });

  test('SP should return percentage of screen width', () => {
    expect(SP(4)).toBe(15); // 4% of 375 = 15
    expect(SP(10)).toBe(38); // 10% of 375 = 37.5 ≈ 38
  });

  test('HP should return percentage of screen height', () => {
    expect(HP(5)).toBe(33); // 5% of 667 = 33.35 ≈ 33
    expect(HP(10)).toBe(67); // 10% of 667 = 66.7 ≈ 67
  });
});