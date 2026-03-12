import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { AccessibilitySettings } from '@/types';

export const defaultAccessibility: AccessibilitySettings = {
  fontSize: 'medium',
  highContrast: false,
  reduceMotion: false,
  boldText: false,
  splashSound: true,
};

const fontSizeMap = {
  small: '14px',
  medium: '16px',
  large: '18px',
  xlarge: '20px',
};

export function useAccessibility() {
  const [settings, setSettings] = useLocalStorage<AccessibilitySettings>('accessibilitySettings', defaultAccessibility);

  useEffect(() => {
    const root = document.documentElement;

    // Font size
    root.style.fontSize = fontSizeMap[settings.fontSize];

    // High contrast
    root.classList.toggle('high-contrast', settings.highContrast);

    // Reduce motion
    root.classList.toggle('reduce-motion', settings.reduceMotion);

    // Bold text
    root.classList.toggle('bold-text', settings.boldText);

    return () => {
      root.style.fontSize = '';
      root.classList.remove('high-contrast', 'reduce-motion', 'bold-text');
    };
  }, [settings]);

  return [settings, setSettings] as const;
}
