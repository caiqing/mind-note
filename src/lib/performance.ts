/**
 * 性能监控工具
 *
 * 提供性能指标收集、分析和报告功能
 * 确保应用达到定义的性能标准
 *
 * Reference: docs/tech-stack-standards.md
 */

// =========================================================================
// 性能指标接口定义
// =========================================================================

/** Core Web Vitals 指标接口 */
export interface CoreWebVitals {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

/** 自定义性能指标接口 */
export interface CustomMetrics {
  bundleSize: number; // 包大小 (KB)
  memoryUsage: number; // 内存使用量 (MB)
  renderTime: number; // 渲染时间 (ms)
  apiResponseTime: number; // API响应时间 (ms)
  interactionTime: number; // 交互响应时间 (ms)
}

/** 性能报告接口 */
export interface PerformanceReport {
  timestamp: Date;
  userAgent: string;
  url: string;
  coreWebVitals: CoreWebVitals;
  customMetrics: CustomMetrics;
  score: PerformanceScore;
  recommendations: string[];
}

/** 性能评分接口 */
export interface PerformanceScore {
  overall: number; // 总体评分 (0-100)
  webVitals: number; // Web Vitals评分
  custom: number; // 自定义指标评分
  grade: 'A' | 'B' | 'C' | 'D' | 'F'; // 等级
}

// =========================================================================
// 性能标准定义
// =========================================================================

/** 性能标准常量 */
export const PERFORMANCE_STANDARDS = {
  // Core Web Vitals 标准
  CORE_WEB_VITALS: {
    FCP: 1500, // 1.5秒
    LCP: 2500, // 2.5秒
    FID: 100, // 100毫秒
    CLS: 0.1, // 0.1
    TTFB: 800, // 800毫秒
  },

  // 自定义指标标准
  CUSTOM_METRICS: {
    BUNDLE_SIZE: 1000, // 1MB
    MEMORY_USAGE: 50, // 50MB
    RENDER_TIME: 16.67, // 60fps = 16.67ms per frame
    API_RESPONSE_TIME: 1000, // 1秒
    INTERACTION_TIME: 100, // 100毫秒
  },

  // 评分阈值
  SCORE_THRESHOLDS: {
    A: 90,
    B: 80,
    C: 70,
    D: 60,
  },
} as const;

// =========================================================================
// 性能监控工具类
// =========================================================================

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: PerformanceObserver[] = [];
  private metrics: Partial<CoreWebVitals> = {};
  private customMetrics: Partial<CustomMetrics> = {};

  private constructor() {
    this.initializeObservers();
  }

  /** 获取单例实例 */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /** 初始化性能观察器 */
  private initializeObservers(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // 观察页面加载性能
      this.observeNavigation();

      // 观察最大内容绘制
      this.observeLCP();

      // 观察首次输入延迟
      this.observeFID();

      // 观察累积布局偏移
      this.observeCLS();

      // 观察资源加载
      this.observeResources();
    } catch (error) {
      console.warn('Performance monitoring initialization failed:', error);
    }
  }

  /** 观察导航性能 */
  private observeNavigation(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.fcp = navEntry.loadEventEnd - navEntry.loadEventStart;
            this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe navigation performance:', error);
    }
  }

  /** 观察最大内容绘制 */
  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        this.metrics.lcp = lastEntry.startTime;
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe LCP:', error);
    }
  }

  /** 观察首次输入延迟 */
  private observeFID(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'first-input') {
            const fidEntry = entry as PerformanceEventTiming;
            this.metrics.fid = fidEntry.processingStart - fidEntry.startTime;
          }
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe FID:', error);
    }
  }

  /** 观察累积布局偏移 */
  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      let clsValue = 0;

      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (
            entry.entryType === 'layout-shift' &&
            !(entry as any).hadRecentInput
          ) {
            clsValue += (entry as any).value;
            this.metrics.cls = clsValue;
          }
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe CLS:', error);
    }
  }

  /** 观察资源加载 */
  private observeResources(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        let totalSize = 0;

        entries.forEach(entry => {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            totalSize += resource.transferSize || 0;
          }
        });

        this.customMetrics.bundleSize = Math.round(totalSize / 1024); // Convert to KB
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe resources:', error);
    }
  }

  /** 测量内存使用 */
  measureMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.customMetrics.memoryUsage = Math.round(
        memory.usedJSHeapSize / (1024 * 1024), // Convert to MB
      );
    }
  }

  /** 测量API响应时间 */
  measureApiResponseTime(url: string, startTime: number): void {
    const endTime = performance.now();
    const duration = endTime - startTime;

    // 存储API响应时间（可以扩展为更复杂的存储机制）
    this.customMetrics.apiResponseTime = Math.round(duration);
  }

  /** 测量交互响应时间 */
  measureInteractionTime(callback: () => void): void {
    const startTime = performance.now();

    requestAnimationFrame(() => {
      const endTime = performance.now();
      this.customMetrics.interactionTime = Math.round(endTime - startTime);
      callback();
    });
  }

  /** 计算性能评分 */
  calculateScore(): PerformanceScore {
    const standards = PERFORMANCE_STANDARDS;

    // 计算Web Vitals评分
    const webVitalsScores = [
      this.calculateMetricScore(
        this.metrics.fcp || 0,
        standards.CORE_WEB_VITALS.FCP,
      ),
      this.calculateMetricScore(
        this.metrics.lcp || 0,
        standards.CORE_WEB_VITALS.LCP,
      ),
      this.calculateMetricScore(
        this.metrics.fid || 0,
        standards.CORE_WEB_VITALS.FID,
        true,
      ),
      this.calculateMetricScore(
        this.metrics.cls || 0,
        standards.CORE_WEB_VITALS.CLS,
        true,
      ),
      this.calculateMetricScore(
        this.metrics.ttfb || 0,
        standards.CORE_WEB_VITALS.TTFB,
      ),
    ];

    const webVitalsScore =
      webVitalsScores.reduce((sum, score) => sum + score, 0) /
      webVitalsScores.length;

    // 计算自定义指标评分
    const customScores = [
      this.calculateMetricScore(
        this.customMetrics.bundleSize || 0,
        standards.CUSTOM_METRICS.BUNDLE_SIZE,
      ),
      this.calculateMetricScore(
        this.customMetrics.memoryUsage || 0,
        standards.CUSTOM_METRICS.MEMORY_USAGE,
      ),
      this.calculateMetricScore(
        this.customMetrics.interactionTime || 0,
        standards.CUSTOM_METRICS.INTERACTION_TIME,
        true,
      ),
      this.calculateMetricScore(
        this.customMetrics.apiResponseTime || 0,
        standards.CUSTOM_METRICS.API_RESPONSE_TIME,
        true,
      ),
    ];

    const customScore =
      customScores.reduce((sum, score) => sum + score, 0) / customScores.length;

    // 计算总体评分
    const overall = (webVitalsScore + customScore) / 2;

    // 确定等级
    const thresholds = standards.SCORE_THRESHOLDS;
    let grade: PerformanceScore['grade'] = 'F';
    if (overall >= thresholds.A) {
      grade = 'A';
    } else if (overall >= thresholds.B) {
      grade = 'B';
    } else if (overall >= thresholds.C) {
      grade = 'C';
    } else if (overall >= thresholds.D) {
      grade = 'D';
    }

    return {
      overall: Math.round(overall),
      webVitals: Math.round(webVitalsScore),
      custom: Math.round(customScore),
      grade,
    };
  }

  /** 计算单个指标评分 */
  private calculateMetricScore(
    value: number,
    standard: number,
    lowerIsBetter: boolean = false,
  ): number {
    if (value === 0) {
      return 100;
    }

    const ratio = lowerIsBetter ? standard / value : value / standard;

    if (ratio >= 1) {
      return 100;
    }
    if (ratio >= 0.8) {
      return 80;
    }
    if (ratio >= 0.6) {
      return 60;
    }
    if (ratio >= 0.4) {
      return 40;
    }
    return 20;
  }

  /** 生成性能报告 */
  generateReport(): PerformanceReport {
    this.measureMemoryUsage();

    const score = this.calculateScore();
    const recommendations = this.generateRecommendations(score);

    return {
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      coreWebVitals: this.metrics as CoreWebVitals,
      customMetrics: this.customMetrics as CustomMetrics,
      score,
      recommendations,
    };
  }

  /** 生成优化建议 */
  private generateRecommendations(score: PerformanceScore): string[] {
    const recommendations: string[] = [];

    if (score.webVitals < 80) {
      recommendations.push('优化页面加载性能以提升Web Vitals评分');
    }

    if (this.metrics.fcp > PERFORMANCE_STANDARDS.CORE_WEB_VITALS.FCP) {
      recommendations.push('减少首次内容绘制时间，考虑代码分割和懒加载');
    }

    if (this.metrics.lcp > PERFORMANCE_STANDARDS.CORE_WEB_VITALS.LCP) {
      recommendations.push('优化最大内容绘制时间，压缩图片和关键资源');
    }

    if (this.metrics.fid > PERFORMANCE_STANDARDS.CORE_WEB_VITALS.FID) {
      recommendations.push(
        '减少JavaScript执行时间，使用Web Workers处理复杂计算',
      );
    }

    if (this.metrics.cls > PERFORMANCE_STANDARDS.CORE_WEB_VITALS.CLS) {
      recommendations.push('减少布局偏移，为图片和广告预留空间');
    }

    if (
      this.customMetrics.bundleSize >
      PERFORMANCE_STANDARDS.CUSTOM_METRICS.BUNDLE_SIZE
    ) {
      recommendations.push('减少包体积，使用tree shaking和代码分割');
    }

    if (
      this.customMetrics.memoryUsage >
      PERFORMANCE_STANDARDS.CUSTOM_METRICS.MEMORY_USAGE
    ) {
      recommendations.push('优化内存使用，避免内存泄漏');
    }

    if (score.custom < 80) {
      recommendations.push('优化自定义性能指标以提升整体体验');
    }

    return recommendations;
  }

  /** 清理观察器 */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = {};
    this.customMetrics = {};
  }
}

// =========================================================================
// 性能工具函数
// =========================================================================

/** 创建性能监控实例 */
export const createPerformanceMonitor = (): PerformanceMonitor => {
  return PerformanceMonitor.getInstance();
};

/** 测量函数执行时间 */
export function measureFunctionPerformance<T>(
  fn: () => T,
  name?: string,
): { result: T; duration: number } {
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (name) {
    console.log(`Function ${name} took ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/** 异步函数性能测量 */
export async function measureAsyncFunctionPerformance<T>(
  fn: () => Promise<T>,
  name?: string,
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (name) {
    console.log(`Async function ${name} took ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/** 创建性能标记 */
export function createPerformanceMark(name: string): void {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(name);
  }
}

/** 测量性能标记间的时间 */
export function measurePerformanceMark(
  startMark: string,
  endMark: string,
  measureName?: string,
): number | null {
  if ('performance' in window && 'measure' in performance) {
    try {
      performance.measure(
        measureName || `${startMark}-${endMark}`,
        startMark,
        endMark,
      );
      const entries = performance.getEntriesByName(
        measureName || `${startMark}-${endMark}`,
        'measure',
      );
      return entries.length > 0 ? entries[entries.length - 1].duration : null;
    } catch (error) {
      console.warn('Failed to measure performance marks:', error);
      return null;
    }
  }
  return null;
}

// =========================================================================
// 性能监控Hook
// =========================================================================

import { useEffect, useState, useCallback } from 'react';

/** 性能监控Hook */
export function usePerformanceMonitor() {
  const [monitor] = useState(() => createPerformanceMonitor());
  const [report, setReport] = useState<PerformanceReport | null>(null);

  const generateReport = useCallback(() => {
    const newReport = monitor.generateReport();
    setReport(newReport);
    return newReport;
  }, [monitor]);

  useEffect(() => {
    // 页面卸载时清理
    return () => {
      monitor.cleanup();
    };
  }, [monitor]);

  return {
    monitor,
    report,
    generateReport,
  };
}

// =========================================================================
// 默认导出
// =========================================================================

export default {
  PerformanceMonitor,
  createPerformanceMonitor,
  measureFunctionPerformance,
  measureAsyncFunctionPerformance,
  createPerformanceMark,
  measurePerformanceMark,
  usePerformanceMonitor,
  PERFORMANCE_STANDARDS,
};
