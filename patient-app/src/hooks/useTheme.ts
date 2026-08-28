// src/hooks/useTheme.ts
import { useColorScheme } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '../theme';

export const useTheme = () => {
  const systemScheme = useColorScheme();
  // In real app, read from Redux store
  const isDark = systemScheme === 'dark';
  
  return {
    isDark,
    colors: isDark ? Colors.dark : Colors.light,
    typography: Typography,
    spacing: Spacing,
    borderRadius: BorderRadius,
    shadows: Shadows,
    gradients: Gradients,
    scheme: isDark ? 'dark' : 'light',
  };
};

// src/hooks/useRTL.ts
export const useRTL = () => {
  return {
    isRTL: true, // Arabic is RTL
    textAlign: 'right' as const,
    flexDirection: 'row-reverse' as const,
    alignSelf: 'flex-end' as const,
  };
};
