/**
 * Badge Component
 *
 * A versatile badge component supporting multiple variants, sizes, and states.
 * Built with Tailwind CSS and comprehensive accessibility support.
 *
 * Features:
 * - Multiple variants (default, secondary, destructive, outline, success, warning, info)
 * - Multiple sizes (xs, sm, default, lg)
 * - Interactive states (clickable, disabled, loading, selected)
 * - Icon support with left/right positioning
 * - Counter functionality with max display
 * - Status indicators
 * - Animation effects
 * - Full accessibility support
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Badge variants using class-variance-authority
const badgeVariants = cva(
  // Base classes
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border-border bg-background hover:bg-accent hover:text-accent-foreground',
        success: 'border-transparent bg-green-600 text-white hover:bg-green-700',
        warning: 'border-transparent bg-yellow-500 text-white hover:bg-yellow-600',
        info: 'border-transparent bg-blue-500 text-white hover:bg-blue-600',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-[10px]',
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
      clickable: {
        true: 'cursor-pointer hover:opacity-80 focus:ring-2 focus:ring-ring focus:ring-offset-2',
        false: '',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed pointer-events-none',
        false: '',
      },
      loading: {
        true: 'relative',
        false: '',
      },
      selected: {
        true: 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        false: '',
      },
      pulse: {
        true: 'animate-pulse',
        false: '',
      },
      bounce: {
        true: 'animate-bounce',
        false: '',
      },
      fade: {
        true: 'animate-fade-in',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      clickable: false,
      disabled: false,
      loading: false,
      selected: false,
      pulse: false,
      bounce: false,
      fade: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  // Interactive props
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;

  // Counter props
  max?: number;
  overflowText?: string;

  // Status props
  status?: 'online' | 'offline' | 'busy' | 'away';

  // Animation props
  pulse?: boolean;
  bounce?: boolean;
  fade?: boolean;

  // Accessibility props
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
}

// Badge Icon Component
interface BadgeIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  position?: 'left' | 'right';
}

const BadgeIcon = React.forwardRef<HTMLSpanElement, BadgeIconProps>(
  ({ className, position = 'left', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'flex items-center justify-center',
          position === 'left' && 'mr-1',
          position === 'right' && 'ml-1',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
BadgeIcon.displayName = 'BadgeIcon';

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({
    className,
    variant,
    size,
    max,
    overflowText = '+',
    status,
    pulse,
    bounce,
    fade,
    disabled,
    loading,
    selected,
    onClick,
    children,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    'aria-live': ariaLive,
    'aria-atomic': ariaAtomic,
    ...props
  }, ref) => {
    const isClickable = !!onClick && !disabled;

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      onClick?.(event);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || !isClickable) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.(event as any);
      }
    };

    // Process counter content
    const processCounterContent = (content: React.ReactNode): React.ReactNode => {
      if (max && typeof content === 'number') {
        return content > max ? `${max}${overflowText}` : content;
      }
      if (max && typeof content === 'string' && /^\d+$/.test(content)) {
        const num = parseInt(content, 10);
        return num > max ? `${max}${overflowText}` : content;
      }
      return content;
    };

    const processedChildren = processCounterContent(children);

    const badgeClasses = cn(
      badgeVariants({
        variant,
        size,
        clickable: isClickable,
        disabled,
        loading,
        selected,
        pulse,
        bounce,
        fade,
      }),
      className
    );

    const badgeProps = {
      ref,
      className: badgeClasses,
      onClick: handleClick,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onKeyDown: isClickable ? handleKeyDown : undefined,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-live': ariaLive,
      'aria-atomic': ariaAtomic,
      'data-variant': variant || 'default',
      'data-size': size || 'default',
      'data-status': status || undefined,
      'data-disabled': disabled || false,
      'data-loading': loading || false,
      'data-selected': selected || false,
      'data-pulse': pulse || false,
      'data-bounce': bounce || false,
      'data-fade': fade || false,
      'data-clickable': isClickable,
      tabIndex: disabled ? -1 : (isClickable ? 0 : undefined),
      role: isClickable ? 'button' : 'status',
      ...props,
    };

    return (
      <div {...badgeProps}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          </div>
        )}
        <div className={cn(loading && 'opacity-50', 'flex items-center gap-1')}>
          {processedChildren}
        </div>
      </div>
    );
  }
);

Badge.displayName = 'Badge';

// Attach Icon component to Badge
Badge.Icon = BadgeIcon;

export { Badge, BadgeIcon, badgeVariants };
