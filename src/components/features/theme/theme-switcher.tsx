'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Theme Switcher Component
 *
 * Allows users to switch between light, dark, and system themes.
 * Includes icons for visual feedback and respects system preferences.
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */
interface ThemeSwitcherProps {
  variant?: 'toggle' | 'dropdown' | 'switch';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ThemeSwitcher({
  variant = 'toggle',
  size = 'md',
  showLabel = false,
  className,
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'h-9 w-9 rounded-md border',
          size === 'sm' && 'h-8 w-8',
          size === 'lg' && 'h-10 w-10',
          className,
        )}
      />
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={cn('relative', className)}>
        <select
          value={theme}
          onChange={e => setTheme(e.target.value)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            size === 'sm' && 'h-9 text-xs',
            size === 'lg' && 'h-11 text-base',
          )}
        >
          <option value='light'>Light</option>
          <option value='dark'>Dark</option>
          <option value='system'>System</option>
        </select>
      </div>
    );
  }

  if (variant === 'switch') {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={cn(
          'theme-switcher',
          size === 'sm' && 'h-8 w-14',
          size === 'lg' && 'h-8 w-14',
          className,
        )}
        data-state={isDark ? 'checked' : 'unchecked'}
      >
        <span className='theme-switcher-thumb'>
          {isDark ? <Moon className='h-3 w-3' /> : <Sun className='h-3 w-3' />}
        </span>
        {showLabel && (
          <span className='ml-3 text-sm font-medium'>
            {isDark ? 'Dark' : 'Light'}
          </span>
        )}
      </button>
    );
  }

  // Default toggle variant
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <button
        onClick={() => setTheme('light')}
        className={cn(
          'btn btn-icon',
          size === 'sm' && 'btn-sm',
          size === 'lg' && 'btn-lg',
          theme === 'light' && 'btn-primary',
        )}
        aria-label='Light theme'
      >
        <Sun className='h-4 w-4' />
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={cn(
          'btn btn-icon',
          size === 'sm' && 'btn-sm',
          size === 'lg' && 'btn-lg',
          theme === 'dark' && 'btn-primary',
        )}
        aria-label='Dark theme'
      >
        <Moon className='h-4 w-4' />
      </button>

      <button
        onClick={() => setTheme('system')}
        className={cn(
          'btn btn-icon',
          size === 'sm' && 'btn-sm',
          size === 'lg' && 'btn-lg',
          theme === 'system' && 'btn-primary',
        )}
        aria-label='System theme'
      >
        <Monitor className='h-4 w-4' />
      </button>

      {showLabel && (
        <span className='text-sm font-medium capitalize'>{theme}</span>
      )}
    </div>
  );
}
