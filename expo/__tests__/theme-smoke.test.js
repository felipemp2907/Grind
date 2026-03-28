import { render } from '@testing-library/react-native';
import Colors from '../constants/colors';

describe('Theme Smoke Tests', () => {
  test('primary color is white for monochrome theme', () => {
    expect(Colors.dark.primary).toBe('#FFFFFF');
  });
  
  test('background is pure black', () => {
    expect(Colors.dark.background).toBe('#0D0D0D');
  });
  
  test('success color is green', () => {
    expect(Colors.dark.success).toBe('#38D9A9');
  });
  
  test('warning color is amber', () => {
    expect(Colors.dark.warning).toBe('#FFB400');
  });
  
  test('no purple colors remain', () => {
    const colorValues = Object.values(Colors.dark);
    const hasOldPurple = colorValues.some(color => 
      typeof color === 'string' && color.includes('6C5CE7')
    );
    expect(hasOldPurple).toBe(false);
  });
});