import { useState, useEffect } from 'react';
import { usePathname } from 'expo-router';

const TAB_ORDER = ['/', '/tasks', '/calendar', '/journal', '/coach', '/settings'];

export const useTabTransition = () => {
  const pathname = usePathname();
  const [previousTab, setPreviousTab] = useState<string>('/');
  const [currentTab, setCurrentTab] = useState<string>('/');

  useEffect(() => {
    const normalizedPath = pathname === '/index' ? '/' : pathname;
    
    if (normalizedPath !== currentTab) {
      setPreviousTab(currentTab);
      setCurrentTab(normalizedPath);
    }
  }, [pathname, currentTab]);

  const getTransitionDirection = (tabPath: string): 'left' | 'right' => {
    const currentIndex = TAB_ORDER.indexOf(currentTab);
    const tabIndex = TAB_ORDER.indexOf(tabPath);
    const previousIndex = TAB_ORDER.indexOf(previousTab);

    if (currentIndex > previousIndex) {
      return tabIndex < currentIndex ? 'left' : 'right';
    } else {
      return tabIndex > currentIndex ? 'right' : 'left';
    }
  };

  const isActiveTab = (tabPath: string): boolean => {
    const normalizedPath = tabPath === '/index' ? '/' : tabPath;
    const normalizedCurrent = currentTab === '/index' ? '/' : currentTab;
    return normalizedPath === normalizedCurrent;
  };

  return {
    currentTab,
    previousTab,
    getTransitionDirection,
    isActiveTab,
  };
};