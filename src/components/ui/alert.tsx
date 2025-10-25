/**
 * Alert Component
 *
 * Simple alert component for notifications
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive'
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4',
        variant === 'default' && 'bg-background text-foreground',
        variant === 'destructive' && 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        className
      )}
      {...props}
    />
  )
)
Alert.displayName = 'Alert'

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  )
)
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription }