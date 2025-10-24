/**
 * Input Component
 *
 * A versatile input component supporting multiple variants, sizes, and states.
 * Built with Tailwind CSS and comprehensive accessibility support.
 *
 * Features:
 * - Multiple variants (default, destructive)
 * - Multiple sizes (sm, default, lg)
 * - Error and success states
 * - Prefix and suffix support
 * - Full accessibility support
 * - Form validation support
 * - File input support
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Input variants using class-variance-authority
const inputVariants = cva(
  // Base classes
  'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input',
        destructive: 'border-destructive text-destructive',
      },
      size: {
        default: 'h-10 px-3 py-2 text-sm',
        sm: 'h-9 px-2 py-1 text-xs',
        lg: 'h-11 px-4 py-3 text-base',
      },
      state: {
        default: '',
        error: 'border-destructive text-destructive',
        success: 'border-green-600 text-green-600',
      },
      hasPrefix: {
        true: 'pl-10',
        false: '',
      },
      hasSuffix: {
        true: 'pr-10',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'default',
      hasPrefix: false,
      hasSuffix: false,
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  hasError?: boolean;
  isSuccess?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    hasError,
    isSuccess,
    prefix,
    suffix,
    disabled,
    required,
    readOnly,
    type = 'text',
    ...props
  }, ref) => {
    const state = hasError ? 'error' : isSuccess ? 'success' : 'default';
    const hasPrefix = !!prefix;
    const hasSuffix = !!suffix;

    return (
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {prefix}
          </div>
        )}
        <input
          type={type}
          className={cn(
            inputVariants({ variant, size, state, hasPrefix, hasSuffix }),
            className
          )}
          ref={ref}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          data-variant={variant || 'default'}
          data-size={size || 'default'}
          data-state={state}
          data-error={hasError || false}
          data-success={isSuccess || false}
          data-disabled={disabled || false}
          data-required={required || false}
          data-readonly={readOnly || false}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {suffix}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input, inputVariants };
