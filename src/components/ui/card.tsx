/**
 * Card Component
 *
 * A versatile card component supporting multiple variants, sizes, and states.
 * Built with Tailwind CSS and comprehensive accessibility support.
 *
 * Features:
 * - Multiple variants (default, outlined, elevated, filled)
 * - Multiple sizes (sm, default, lg, xl)
 * - Interactive states (clickable, hoverable, disabled, loading)
 * - Structured sub-components (Header, Title, Description, Body, Footer, Actions)
 * - Media support (Image, Avatar, Icon)
 * - Full accessibility support
 * - Responsive design
 * - Animation and transitions
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Card variants using class-variance-authority
const cardVariants = cva(
  // Base classes
  'rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-border bg-card',
        outlined: 'border-2 border-border bg-background',
        elevated: 'border-0 shadow-lg bg-card',
        filled: 'border-0 bg-muted',
      },
      size: {
        sm: 'p-3 text-sm',
        default: 'p-4 text-sm',
        lg: 'p-6 text-base',
        xl: 'p-8 text-lg',
      },
      hoverable: {
        true: 'hover:shadow-md cursor-pointer',
        false: '',
      },
      clickable: {
        true: 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        false: '',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed pointer-events-none',
        false: '',
      },
      loading: {
        true: 'relative overflow-hidden',
        false: '',
      },
      selected: {
        true: 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        false: '',
      },
      transition: {
        true: 'transition-all duration-200 ease-in-out',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      hoverable: false,
      clickable: false,
      disabled: false,
      loading: false,
      selected: false,
      transition: true,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  // Interactive props
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
  hoverable?: boolean;

  // Accessibility props
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-pressed'?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant,
    size,
    hoverable,
    disabled,
    loading,
    selected,
    transition,
    onClick,
    children,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    'aria-expanded': ariaExpanded,
    'aria-pressed': ariaPressed,
    ...props
  }, ref) => {
    const isClickable = !!onClick && !disabled;
    const [isHovered, setIsHovered] = React.useState(false);

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      onClick?.(event);
    };

    const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(true);
      onMouseEnter?.(event);
    };

    const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
      setIsHovered(false);
      onMouseLeave?.(event);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || !isClickable) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.(event as any);
      }
    };

    const cardClasses = cn(
      cardVariants({
        variant,
        size,
        hoverable: hoverable || isClickable,
        clickable: isClickable,
        disabled,
        loading,
        selected,
        transition,
      }),
      className
    );

    const cardProps = {
      ref,
      className: cardClasses,
      onClick: handleClick,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus,
      onBlur,
      onKeyDown: isClickable ? handleKeyDown : undefined,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-expanded': ariaExpanded,
      'aria-pressed': ariaPressed,
      'data-variant': variant || 'default',
      'data-size': size || 'default',
      'data-hover': isHovered,
      'data-hoverable': hoverable || isClickable,
      'data-clickable': isClickable,
      'data-disabled': disabled || false,
      'data-loading': loading || false,
      'data-selected': selected || false,
      'data-transition': transition,
      tabIndex: disabled ? -1 : (isClickable ? 0 : undefined),
      role: isClickable ? 'button' : 'article',
      ...props,
    };

    return (
      <div {...cardProps}>
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <div className={cn(loading && 'opacity-50')}>
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header Component
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

// Card Title Component
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

// Card Description Component
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

// Card Body Component
interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('pt-0', className)}
      {...props}
    />
  )
);
CardBody.displayName = 'CardBody';

// Card Footer Component
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

// Card Actions Component
interface CardActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardActions = React.forwardRef<HTMLDivElement, CardActionsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-2 pt-4', className)}
      {...props}
    />
  )
);
CardActions.displayName = 'CardActions';

// Card Media Component
interface CardMediaProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
}

const CardMedia = React.forwardRef<HTMLImageElement, CardMediaProps>(
  ({ className, aspectRatio = 'landscape', ...props }, ref) => {
    const aspectRatioClasses = {
      square: 'aspect-square',
      video: 'aspect-video',
      portrait: 'aspect-[3/4]',
      landscape: 'aspect-[16/9]',
    };

    return (
      <img
        ref={ref}
        className={cn(
          'w-full object-cover',
          aspectRatioClasses[aspectRatio],
          className
        )}
        {...props}
      />
    );
  }
);
CardMedia.displayName = 'CardMedia';

// Card Avatar Component
interface CardAvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: 'sm' | 'default' | 'lg';
}

const CardAvatar = React.forwardRef<HTMLImageElement, CardAvatarProps>(
  ({ className, size = 'default', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      default: 'h-10 w-10',
      lg: 'h-12 w-12',
    };

    return (
      <img
        ref={ref}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
CardAvatar.displayName = 'CardAvatar';

// Card Icon Component
interface CardIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg';
}

const CardIcon = React.forwardRef<HTMLDivElement, CardIconProps>(
  ({ className, size = 'default', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      default: 'h-6 w-6',
      lg: 'h-8 w-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center text-muted-foreground',
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
CardIcon.displayName = 'CardIcon';

// Attach sub-components to Card
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Actions = CardActions;
Card.Media = CardMedia;
Card.Avatar = CardAvatar;
Card.Icon = CardIcon;

// Maintain backward compatibility
const CardContent = CardBody;

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardContent, // backward compatibility
  CardFooter,
  CardActions,
  CardMedia,
  CardAvatar,
  CardIcon,
  cardVariants
};
