/**
 * Toast通知系统
 *
 * 提供用户友好的通知界面，用于显示操作结果、错误信息等
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = generateId();
      const newToast: Toast = { ...toast, id };

      setToasts(prev => [...prev, newToast]);

      // 自动移除非持久化的toast
      if (!toast.persistent && toast.duration !== 0) {
        const duration = toast.duration || 5000;
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [generateId],
  );

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback(
    (title: string, message?: string) => {
      return addToast({ type: 'success', title, message });
    },
    [addToast],
  );

  const error = useCallback(
    (title: string, message?: string) => {
      return addToast({
        type: 'error',
        title,
        message,
        duration: 8000, // 错误消息显示更长时间
        persistent: false,
      });
    },
    [addToast],
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      return addToast({ type: 'warning', title, message });
    },
    [addToast],
  );

  const info = useCallback(
    (title: string, message?: string) => {
      return addToast({ type: 'info', title, message });
    },
    [addToast],
  );

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className='fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full'>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className='h-5 w-5 text-green-500' />;
      case 'error':
        return <XCircle className='h-5 w-5 text-red-500' />;
      case 'warning':
        return <AlertCircle className='h-5 w-5 text-yellow-500' />;
      case 'info':
        return <Info className='h-5 w-5 text-blue-500' />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTitleColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
    }
  };

  return (
    <div
      className={`
        relative p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out
        ${getBackgroundColor()} ${getBorderColor()} border-l-4
        transform translate-x-0 opacity-100
        max-w-sm w-full
      `}
      role='alert'
    >
      <div className='flex items-start'>
        <div className='flex-shrink-0'>{getIcon()}</div>

        <div className='ml-3 flex-1'>
          <h3 className={`text-sm font-medium ${getTitleColor()}`}>
            {toast.title}
          </h3>

          {toast.message && (
            <p className='mt-1 text-sm text-gray-600'>{toast.message}</p>
          )}

          {toast.action && (
            <div className='mt-2'>
              <button
                onClick={toast.action.onClick}
                className='text-sm font-medium underline hover:no-underline focus:outline-none'
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>

        <div className='ml-4 flex-shrink-0'>
          <button
            onClick={() => onRemove(toast.id)}
            className='inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors'
            aria-label='关闭通知'
          >
            <X className='h-4 w-4' />
          </button>
        </div>
      </div>

      {/* 进度条 */}
      {!toast.persistent && toast.duration !== 0 && (
        <div className='absolute bottom-0 left-0 h-1 bg-gray-300 rounded-b-lg overflow-hidden'>
          <div
            className='h-full bg-gray-400 transition-all ease-linear'
            style={{
              width: '100%',
              animation: `toast-progress ${toast.duration || 5000}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// 全局Toast Hook（用于在非组件中使用）
let globalToastContext: ToastContextType | null = null;

export const setGlobalToastContext = (context: ToastContextType) => {
  globalToastContext = context;
};

export const getGlobalToast = () => {
  if (!globalToastContext) {
    throw new Error(
      'Toast context not initialized. Wrap your app with ToastProvider.',
    );
  }
  return globalToastContext;
};

// 便捷的全局方法
export const toast = {
  success: (title: string, message?: string) => {
    const toast = getGlobalToast();
    return toast.success(title, message);
  },
  error: (title: string, message?: string) => {
    const toast = getGlobalToast();
    return toast.error(title, message);
  },
  warning: (title: string, message?: string) => {
    const toast = getGlobalToast();
    return toast.warning(title, message);
  },
  info: (title: string, message?: string) => {
    const toast = getGlobalToast();
    return toast.info(title, message);
  },
};

export default ToastProvider;
