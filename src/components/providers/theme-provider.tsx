'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

/**
 * Theme Provider Component
 *
 * Provides theme context for the entire application, supporting:
 * - Light/Dark theme switching
 * - System preference detection
 * - Theme persistence
 * - Smooth transitions
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute='data-theme'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange={false}
      storageKey='mindnote-theme'
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
