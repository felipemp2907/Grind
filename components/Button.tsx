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
        baseStyle.paddingVertical = 8;
        baseStyle.paddingHorizontal = 16;
        break;
      case 'large':
        baseStyle.paddingVertical = 16;
        baseStyle.paddingHorizontal = 24;
        break;
      default: // medium
        baseStyle.paddingVertical = 12;
        baseStyle.paddingHorizontal = 20;
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
      ...styles.text,
    };
    
    // Size styles
    switch (size) {
      case 'small':
        baseStyle.fontSize = 14;
        break;
      case 'large':
        baseStyle.fontSize = 18;
        break;
      default: // medium
        baseStyle.fontSize = 16;
    }
    
    // Variant styles
    if (variant === 'outline') {
      baseStyle.color = Colors.dark.primary;
    }
    
    return baseStyle;
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
          color={variant === 'outline' ? Colors.dark.primary : Colors.dark.text} 
          size="small" 
        />
      ) : (
        <>
          {icon && icon}
          <Text style={[getTextStyle(), icon ? { marginLeft: 8 } : {}, textStyle]}>
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
    borderRadius: 8,
  },
  text: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
});