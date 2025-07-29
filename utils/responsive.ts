import { RFValue } from 'react-native-responsive-fontsize';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-dimensions';

// Font helper - RF(16) respects user font-scale
export const RF = (size: number) => RFValue(size, 812);

// Spacing - 4 equals 4% of screen width
export const SP = (percent: number) => wp(percent);

// Height percentage
export const HP = (percent: number) => hp(percent);

// Width percentage
export const WP = (percent: number) => wp(percent);

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