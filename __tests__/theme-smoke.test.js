import { render } from '@testing-library/react-native';
import React from 'react';
import { View, Text } from 'react-native';
import Colors from '../constants/colors';
import Button from '../components/Button';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock stores
jest.mock('../store/goalStore', () => ({
  useGoalStore: () => ({
    goals: [],
  }),
}));

describe('Theme Smoke Tests', () => {
  test('primary colors are monochrome', () => {
    expect(Colors.dark.primary).toBe('#FFFFFF');
    expect(Colors.dark.secondary).toBe('#FFFFFF');
  });

  test('success and warning colors are preserved', () => {
    expect(Colors.dark.success).toBe('#38D9A9');
    expect(Colors.dark.warning).toBe('#FFB400');
  });

  test('background colors are updated', () => {
    expect(Colors.dark.background).toBe('#0E0E12');
    expect(Colors.dark.card).toBe('#18171D');
  });

  test('text colors are updated', () => {
    expect(Colors.dark.text).toBe('#FFFFFF');
    expect(Colors.dark.subtext).toBe('#A1A0AE');
  });

  test('primary buttons render with correct colors', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={() => {}} variant="primary" />
    );
    
    const button = getByText('Test Button').parent;
    const buttonStyle = button.props.style;
    
    // Check if button has white background
    const hasWhiteBackground = buttonStyle.some(style => 
      style && style.backgroundColor === '#FFFFFF'
    );
    expect(hasWhiteBackground).toBe(true);
  });
});