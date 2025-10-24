/**
 * 测试辅助工具函数
 *
 * 提供常用的测试工具和方法
 */

import { render, RenderOptions } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ComponentType } from 'react';
import { NextRouter } from 'next/router';

// 自定义渲染函数，包含常用的配置
export const customRender = <T extends ComponentType<any>>(
  ui: React.ReactElement<any, string>,
  options?: RenderOptions,
) => {
  return render(ui, {
    wrapper: ({ children }) => children,
    ...options,
  });
};

// 创建用户事件实例，包含常用配置
export const createUserEvent = () => {
  return userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
    skipAutoCleanup: true,
  });
};

// 等待指定时间的辅助函数
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

// 模拟API调用的辅助函数
export const mockApiCall = <T>(
  data: T,
  delay: number = 100,
): Promise<{ data: T; success: boolean }> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ data, success: true });
    }, delay);
  });
};

// 模拟API错误调用的辅助函数
export const mockApiError = (
  error: string,
  delay: number = 100,
): Promise<{ error: string; success: false }> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(error));
    }, delay);
  });
};

// 模拟文件上传的辅助函数
export const mockFileUpload = (fileName: string = 'test.txt'): File => {
  const content = 'Test file content';
  const blob = new Blob([content], { type: 'text/plain' });
  return new File([blob], fileName);
};

// 模拟图片文件的辅助函数
export const mockImageFile = (fileName: string = 'test.jpg'): File => {
  // 创建一个简单的1x1像素的JPEG图片
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1, 1);
  }

  return new Promise<File>(resolve => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      } else {
        resolve(new File([], fileName, { type: 'image/jpeg' }));
      }
    }, 'image/jpeg');
  });
};

// 模拟键盘事件的辅助函数
export const createKeyboardEvent = (
  key: string,
  options: KeyboardEventInit = {},
): KeyboardEvent => {
  return new KeyboardEvent('keydown', {
    key,
    code: key,
    ...options,
  });
};

// 模拟鼠标事件的辅助函数
export const createMouseEvent = (
  type: string,
  options: MouseEventInit = {},
): MouseEvent => {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  });
};

// 模拟表单数据的辅助函数
export const createFormData = (
  data: Record<string, string | number | boolean>,
): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  return formData;
};

// 测试DOM元素的辅助函数
export const expectElementToExist = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
};

export const expectElementToHaveText = (
  element: HTMLElement | null,
  text: string,
) => {
  expect(element).toBeInTheDocument();
  expect(element).toHaveTextContent(text);
};

export const expectElementToHaveClass = (
  element: HTMLElement | null,
  className: string,
) => {
  expect(element).toBeInTheDocument();
  expect(element).toHaveClass(className);
};

// 测试表单的辅助函数
export const expectFormToBeValid = (form: HTMLFormElement) => {
  expect(form.checkValidity()).toBe(true);
};

export const expectFormToBeInvalid = (form: HTMLFormElement) => {
  expect(form.checkValidity()).toBe(false);
};

// 测试异步操作的辅助函数
export const expectAsyncToComplete = async (
  asyncFn: () => Promise<any>,
  timeout: number = 5000,
) => {
  const result = await Promise.race([
    asyncFn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Async operation timed out')), timeout),
    ),
  ]);
  return result;
};

// 测试API调用的辅助函数
export const expectApiCallToHaveBeenCalled = (mockFn: jest.Mock) => {
  expect(mockFn).toHaveBeenCalled();
};

export const expectApiCallToHaveBeenCalledWith = (
  mockFn: jest.Mock,
  ...args: any[]
) => {
  expect(mockFn).toHaveBeenCalledWith(...args);
};

// 测试路由的辅助函数
export const mockRouter = () => {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
  };

  // Mock NextRouter
  jest.mock('next/router', () => ({
    useRouter: () => router,
  }));

  return router;
};

// 测试本地存储的辅助函数
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
    },
    writable: true,
  });

  return store;
};

// 测试会话存储的辅助函数
export const mockSessionStorage = () => {
  const store: Record<string, string> = {};

  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
    },
    writable: true,
  });

  return store;
};

// 测试通知的辅助函数
export const mockNotification = () => {
  const notifications: Array<{
    title: string;
    body: string;
    icon?: string;
  }> = [];

  Object.defineProperty(window, 'Notification', {
    value: jest.fn().mockImplementation((title: string, options: any) => ({
      title,
      body: options.body,
      icon: options.icon,
      close: jest.fn(),
      onclick: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
    writable: true,
  });

  // Mock Notification.requestPermission
  Object.defineProperty(Notification, 'requestPermission', {
    value: jest.fn().mockResolvedValue('granted'),
    writable: true,
  });

  return notifications;
};

// 测试IntersectionObserver的辅助函数
export const mockIntersectionObserver = () => {
  const observers: Array<{
    callback: IntersectionObserverCallback;
    options: IntersectionObserverInit;
  }> = [];

  Object.defineProperty(window, 'IntersectionObserver', {
    value: jest
      .fn()
      .mockImplementation(
        (
          callback: IntersectionObserverCallback,
          options: IntersectionObserverInit,
        ) => {
          observers.push({ callback, options });
          return {
            observe: jest.fn(),
            unobserve: jest.fn(),
            disconnect: jest.fn(),
          };
        },
      ),
    writable: true,
  });

  return observers;
};

// 测试ResizeObserver的辅助函数
export const mockResizeObserver = () => {
  const observers: Array<{
    callback: ResizeObserverCallback;
  }> = [];

  Object.defineProperty(window, 'ResizeObserver', {
    value: jest.fn().mockImplementation((callback: ResizeObserverCallback) => {
      observers.push({ callback });
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    }),
    writable: true,
  });

  return observers;
};

// 测试Clipboard API的辅助函数
export const mockClipboard = () => {
  const clipboardData: Record<string, string> = {};

  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn().mockImplementation((text: string) => {
        clipboardData.text = text;
        return Promise.resolve();
      }),
      readText: jest.fn().mockResolvedValue(clipboardData.text || ''),
    },
    writable: true,
  });

  return clipboardData;
};

// 清理所有Mock的辅助函数
export const clearAllMocks = () => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
};

// 设置测试环境的辅助函数
export const setupTestEnvironment = () => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';

  // Mock各种浏览器API
  mockLocalStorage();
  mockSessionStorage();
  mockNotification();
  mockIntersectionObserver();
  mockResizeObserver();
  mockClipboard();

  // 重置所有模拟定时器
  jest.useFakeTimers();
};

// 清理测试环境的辅助函数
export const cleanupTestEnvironment = () => {
  // 恢复真实定时器
  jest.useRealTimers();

  // 清理所有Mock
  clearAllMocks();
};

// 测试数据验证的辅助函数
export const validateMockData = (
  data: any,
  requiredFields: string[],
): boolean => {
  return requiredFields.every(
    field => field in data && data[field] !== undefined,
  );
};

// 测试响应式设计的辅助函数
export const mockMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
    writable: true,
  });
};
