import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import Colors from '@/constants/colors';
import { typography } from '@/constants/typography';
import { SP, HP, responsivePadding } from '@/utils/responsive';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon
}: ButtonProps) {
  const getButtonStyle = () => {
    const baseStyle: ViewStyle = {
      ...styles.button,
      opacity: disabled ? 0.6 : 1,
    };
    
    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingVertical = HP(1);
        baseStyle.paddingHorizontal = responsivePadding.md;
        break;
      case 'large':
        baseStyle.paddingVertical = HP(2);
        baseStyle.paddingHorizontal = responsivePadding.lg;
        break;
      default: // medium
        baseStyle.paddingVertical = HP(1.5);
        baseStyle.paddingHorizontal = responsivePadding.lg;
    }
    
    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = Colors.dark.secondary;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = Colors.dark.primary;
        break;
      case 'danger':
        baseStyle.backgroundColor = Colors.dark.danger;
        break;
      default: // primary
        baseStyle.backgroundColor = Colors.dark.primary;
    }
    
    return baseStyle;
  };
  
  const getTextStyle = () => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
    };
    
    // Size styles
    switch (size) {
      case 'small':
        Object.assign(baseStyle, typography.buttonSmall);
        break;
      case 'large':
        Object.assign(baseStyle, typography.h3);
        break;
      default: // medium
        Object.assign(baseStyle, typography.button);
    }
    
    // Variant styles - ensure proper contrast
    switch (variant) {
      case 'outline':
        baseStyle.color = Colors.dark.primary;
        break;
      case 'primary':
      case 'secondary':
        baseStyle.color = '#000000'; // Black text for white buttons
        break;
      case 'danger':
      default:
        baseStyle.color = '#FFFFFF'; // White text for colored buttons
    }
    
    return baseStyle;
  };
  
  // Clone icon with proper color for white buttons
  const getIconWithColor = () => {
    if (!icon) return null;
    
    const iconColor = variant === 'outline' 
      ? Colors.dark.primary 
      : (variant === 'primary' || variant === 'secondary') 
        ? '#000000' 
        : '#FFFFFF';
    
    // Check if icon is a React element and has color prop
    if (React.isValidElement(icon) && typeof icon.props === 'object') {
      return React.cloneElement(icon as React.ReactElement<any>, {
        ...icon.props,
        color: iconColor
      });
    }
    
    return icon;
  };
  
  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? Colors.dark.primary : (variant === 'primary' || variant === 'secondary') ? '#000000' : '#FFFFFF'} 
          size="small" 
        />
      ) : (
        <>
          {getIconWithColor()}
          <Text style={[getTextStyle(), icon ? { marginLeft: SP(2) } : {}, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SP(2),
  },
});