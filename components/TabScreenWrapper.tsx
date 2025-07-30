import React from 'react';
import { Platform } from 'react-native';
import TabSlideTransition from './TabSlideTransition';
import { useTabTransition } from '@/hooks/useTabTransition';

interface TabScreenWrapperProps {
  children: React.ReactNode;
  tabPath: string;
}

const TabScreenWrapper: React.FC<TabScreenWrapperProps> = ({ children, tabPath }) => {
  const { getTransitionDirection, isActiveTab } = useTabTransition();

  // Skip animation on web for compatibility
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  const isActive = isActiveTab(tabPath);
  const direction = getTransitionDirection(tabPath);

  return (
    <TabSlideTransition
      isActive={isActive}
      direction={direction}
    >
      {children}
    </TabSlideTransition>
  );
};

export default TabScreenWrapper;