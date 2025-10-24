/**
 * Textarea Component
 *
 * A versatile textarea component supporting multiple variants, sizes, and states.
 * Built with Tailwind CSS and comprehensive accessibility support.
 *
 * Features:
 * - Multiple variants (default, destructive)
 * - Multiple sizes (sm, default, lg)
 * - Auto-resize functionality
 * - Character counter
 * - Error and success states
 * - Full accessibility support
 * - Form validation support
 * - Resize controls
 * - Drag and drop support
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Textarea variants using class-variance-authority
const textareaVariants = cva(
  // Base classes
  'flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input',
        destructive: 'border-destructive text-destructive',
      },
      size: {
        sm: 'min-h-[60px] px-2 py-1 text-xs',
        default: 'min-h-[80px] px-3 py-2 text-sm',
        lg: 'min-h-[120px] px-4 py-3 text-base',
      },
      resize: {
        none: 'resize-none',
        both: 'resize',
        vertical: 'resize-y',
        horizontal: 'resize-x',
      },
      state: {
        default: '',
        error: 'border-destructive text-destructive',
        success: 'border-green-600 text-green-600',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      resize: 'vertical',
      state: 'default',
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  // State props
  hasError?: boolean;
  isSuccess?: boolean;

  // Auto-resize props
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;

  // Character counter props
  showCounter?: boolean;
  maxLength?: number;

  // Event handlers with additional context
  onValueChange?: (value: string) => void;
  onCharacterCountChange?: (count: number, max: number) => void;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    variant,
    size,
    resize,
    hasError,
    isSuccess,
    autoResize,
    minRows,
    maxRows,
    showCounter,
    maxLength,
    value,
    defaultValue,
    onChange,
    onValueChange,
    onCharacterCountChange,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(
      value || defaultValue || ''
    );
    const [characterCount, setCharacterCount] = React.useState(
      (value || defaultValue || '').length
    );
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current!);

    // Handle value changes
    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      const newCount = newValue.length;

      // Update internal state if uncontrolled
      if (value === undefined) {
        setInternalValue(newValue);
        setCharacterCount(newCount);
      } else {
        setCharacterCount(newCount);
      }

      // Call original onChange
      onChange?.(event);

      // Call custom handlers
      onValueChange?.(newValue);
      onCharacterCountChange?.(newCount, maxLength || Infinity);

      // Auto-resize if enabled
      if (autoResize && textareaRef.current) {
        adjustHeight();
      }
    };

    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get the natural scroll height
      textarea.style.height = 'auto';

      let newHeight = textarea.scrollHeight;

      // Apply min/max constraints if specified
      if (minRows) {
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
        const minHeight = minRows * lineHeight;
        newHeight = Math.max(newHeight, minHeight);
      }

      if (maxRows) {
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
        const maxHeight = maxRows * lineHeight;
        newHeight = Math.min(newHeight, maxHeight);
      }

      textarea.style.height = `${newHeight}px`;
    }, [minRows, maxRows]);

    // Initial setup and cleanup
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        adjustHeight();
      }
    }, [autoResize, adjustHeight]);

    // Update internal value when controlled value changes
    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
        setCharacterCount(value.length);
      }
    }, [value]);

    // Handle focus and blur for additional state management
    const handleFocus = (event: React.FocusEvent<HTMLTextAreaElement>) => {
      props.onFocus?.(event);

      // Auto-resize on focus if enabled
      if (autoResize && textareaRef.current) {
        adjustHeight();
      }
    };

    const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
      props.onBlur?.(event);

      // Auto-resize on blur if enabled
      if (autoResize && textareaRef.current) {
        adjustHeight();
      }
    };

    // Handle keyboard events for special functionality
    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      props.onKeyDown?.(event);

      // Auto-resize on keydown if enabled
      if (autoResize && textareaRef.current) {
        // Use setTimeout to ensure the content is updated
        setTimeout(adjustHeight, 0);
      }
    };

    const state = hasError ? 'error' : isSuccess ? 'success' : 'default';
    const currentValue = value !== undefined ? value : internalValue;
    const effectiveMaxLength = maxLength || props.maxLength;
    const showCharacterCounter = showCounter && effectiveMaxLength;

    const textareaClasses = cn(
      textareaVariants({
        variant,
        size,
        resize,
        state,
      }),
      className
    );

    return (
      <div className="relative w-full">
        <textarea
          ref={textareaRef}
          className={textareaClasses}
          value={currentValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          maxLength={effectiveMaxLength}
          data-variant={variant || 'default'}
          data-size={size || 'default'}
          data-resize={resize || 'vertical'}
          data-state={state}
          data-error={hasError || false}
          data-success={isSuccess || false}
          data-disabled={props.disabled || false}
          data-readonly={props.readOnly || false}
          data-required={props.required || false}
          data-auto-resize={autoResize || false}
          data-min-rows={minRows || undefined}
          data-max-rows={maxRows || undefined}
          data-show-counter={showCounter || false}
          {...props}
        />

        {showCharacterCounter && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground pointer-events-none">
            <span className={cn(
              characterCount > effectiveMaxLength * 0.9 && 'text-orange-600',
              characterCount >= effectiveMaxLength && 'text-destructive'
            )}>
              {characterCount}/{effectiveMaxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
