/**
 * Toast Hook
 *
 * Simple toast notification system
 */

'use client'

import { useState, useCallback } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

let toastCount = 0

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] })

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 5000 }: Partial<Toast>) => {
      const id = (++toastCount).toString()
      const newToast: Toast = {
        id,
        title,
        description,
        variant,
        duration,
      }

      setState((prevState) => ({
        toasts: [...prevState.toasts, newToast],
      }))

      if (duration > 0) {
        setTimeout(() => {
          setState((prevState) => ({
            toasts: prevState.toasts.filter((t) => t.id !== id),
          }))
        }, duration)
      }

      return {
        id,
        dismiss: () => {
          setState((prevState) => ({
            toasts: prevState.toasts.filter((t) => t.id !== id),
          }))
        },
      }
    },
    []
  )

  const dismiss = useCallback((toastId: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((t) => t.id !== toastId),
    }))
  }, [])

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  }
}

// Toast provider component could be added here for global toast management
export default useToast