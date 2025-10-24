import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并className的工具函数
 * 结合clsx和tailwind-merge的功能
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 格式化时间
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 相对时间格式化
 */
export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return '刚刚';
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return formatDate(d);
  }
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * 生成随机ID
 */
export function generateId(length: number = 8): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const clonedObj = {} as { [key: string]: any };
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj as T;
  }
  return obj;
}

/**
 * 安全的JSON解析
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * 检查是否为空值
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
}

/**
 * 睡眠函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delay * attempt);
      }
    }
  }

  throw lastError!;
}

/**
 * 计算字符串的哈希值
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }
  return hash;
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证URL格式
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 生成颜色
 */
export function generateColor(): string {
  const colors = [
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F97316',
    '#6366F1',
    '#84CC16',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 数字格式化
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('zh-CN').format(num);
}

/**
 * 百分比格式化
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// =========================================================================
// UI and Theme Utilities
// =========================================================================

/**
 * 获取当前主题
 */
export function getCurrentTheme(): 'light' | 'dark' | 'system' {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const theme = localStorage.getItem('mindnote-theme');
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }
  return 'system';
}

/**
 * 设置主题
 */
export function setTheme(theme: 'light' | 'dark' | 'system'): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('mindnote-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * 获取系统主题偏好
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * 监听系统主题变化
 */
export function watchSystemTheme(
  callback: (theme: 'light' | 'dark') => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handleChange);

  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}

/**
 * 检查是否为深色主题
 */
export function isDarkTheme(): boolean {
  const theme = getCurrentTheme();
  if (theme === 'dark') {
    return true;
  }
  if (theme === 'light') {
    return false;
  }
  return getSystemTheme() === 'dark';
}

/**
 * 获取CSS变量值
 */
export function getCSSVariable(variable: string): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
}

/**
 * 设置CSS变量值
 */
export function setCSSVariable(variable: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  document.documentElement.style.setProperty(variable, value);
}

/**
 * 获取响应式断点
 */
export function getBreakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
  if (typeof window === 'undefined') {
    return 'lg';
  }

  const width = window.innerWidth;

  if (width < 640) {
    return 'xs';
  }
  if (width < 768) {
    return 'sm';
  }
  if (width < 1024) {
    return 'md';
  }
  if (width < 1280) {
    return 'lg';
  }
  if (width < 1536) {
    return 'xl';
  }
  return '2xl';
}

/**
 * 检查是否为移动设备
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return getBreakpoint() === 'xs' || getBreakpoint() === 'sm';
}

/**
 * 检查是否为平板设备
 */
export function isTablet(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return getBreakpoint() === 'md';
}

/**
 * 检查是否为桌面设备
 */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  return ['lg', 'xl', '2xl'].includes(getBreakpoint());
}

/**
 * 监听窗口大小变化
 */
export function watchResize(
  callback: (breakpoint: string) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleResize = debounce(() => {
    callback(getBreakpoint());
  }, 100);

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}

/**
 * 检查是否支持触摸
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 检查是否支持 prefers-reduced-motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 获取设备像素比
 */
export function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') {
    return 1;
  }

  return window.devicePixelRatio || 1;
}

/**
 * 检查是否为高分辨率屏幕
 */
export function isHiDPI(): boolean {
  return getDevicePixelRatio() >= 2;
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch {
    return false;
  }
}

/**
 * 下载文件
 */
export function downloadFile(
  data: string | Blob,
  filename: string,
  type?: string,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const blob =
    typeof data === 'string'
      ? new Blob([data], { type: type || 'text/plain' })
      : data;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 滚动到元素
 */
export function scrollToElement(
  element: string | HTMLElement,
  options?: ScrollIntoViewOptions,
): void {
  if (typeof window === 'undefined') {
    return;
  }

  const el =
    typeof element === 'string'
      ? (document.querySelector(element) as HTMLElement)
      : element;

  if (el) {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
      ...options,
    });
  }
}

/**
 * 滚动到顶部
 */
export function scrollToTop(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth',
  });
}

/**
 * 滚动到底部
 */
export function scrollToBottom(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.scrollTo({
    top: document.body.scrollHeight,
    left: 0,
    behavior: 'smooth',
  });
}

/**
 * 获取滚动位置
 */
export function getScrollPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 };
  }

  return {
    x: window.pageXOffset || document.documentElement.scrollLeft,
    y: window.pageYOffset || document.documentElement.scrollTop,
  };
}

/**
 * 监听滚动事件
 */
export function watchScroll(
  callback: (position: { x: number; y: number }) => void,
  options?: { throttle?: number },
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const throttleDelay = options?.throttle || 100;
  const throttledCallback = throttle(callback, throttleDelay);

  const handleScroll = () => {
    throttledCallback(getScrollPosition());
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}

/**
 * 检查元素是否在视窗内
 */
export function isElementInViewport(
  element: HTMLElement | string,
  options?: { threshold?: number; rootMargin?: string },
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const el =
    typeof element === 'string'
      ? (document.querySelector(element) as HTMLElement)
      : element;

  if (!el) {
    return false;
  }

  const rect = el.getBoundingClientRect();
  const threshold = options?.threshold || 0;

  return (
    rect.top >= -threshold &&
    rect.left >= -threshold &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) +
        threshold &&
    rect.right <=
      (window.innerWidth || document.documentElement.clientWidth) + threshold
  );
}

/**
 * 获取元素的边界矩形
 */
export function getElementBounds(
  element: HTMLElement | string,
): DOMRect | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const el =
    typeof element === 'string'
      ? (document.querySelector(element) as HTMLElement)
      : element;

  return el ? el.getBoundingClientRect() : null;
}

/**
 * 焦点管理：将焦点设置到元素
 */
export function focusElement(
  element: HTMLElement | string,
  options?: { preventScroll?: boolean },
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const el =
    typeof element === 'string'
      ? (document.querySelector(element) as HTMLElement)
      : element;

  if (!el) {
    return false;
  }

  try {
    el.focus({
      preventScroll: options?.preventScroll || false,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 焦点管理：将焦点捕获到容器内
 */
export function focusTrap(container: HTMLElement): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') {
      return;
    }

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Focus first element
  if (firstElement) {
    firstElement.focus();
  }

  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * 获取计算样式
 */
export function getComputedStyles(
  element: HTMLElement | string,
): CSSStyleDeclaration | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const el =
    typeof element === 'string'
      ? (document.querySelector(element) as HTMLElement)
      : element;

  return el ? getComputedStyle(el) : null;
}

/**
 * 添加事件监听器并返回清理函数
 */
export function addEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | string,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const el =
    typeof element === 'string'
      ? (document.querySelector(element) as HTMLElement)
      : element;

  if (!el) {
    return () => {};
  }

  el.addEventListener(event, handler, options);

  return () => {
    el.removeEventListener(event, handler, options);
  };
}

/**
 * 等待DOM加载完成
 */
export function waitForDOM(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (document.readyState === 'loading') {
    return new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', () => resolve(), {
        once: true,
      });
    });
  }

  return Promise.resolve();
}
