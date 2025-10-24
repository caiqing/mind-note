/**
 * 前端性能优化工具
 */

import { useCallback, useRef, useEffect, useMemo } from 'react';

// 防抖Hook
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  ) as T;
}

// 节流Hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const lastRunRef = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRunRef.current >= delay) {
        callback(...args);
        lastRunRef.current = now;
      }
    },
    [callback, delay],
  ) as T;
}

// 虚拟滚动Hook
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
) {
  const [scrollTop, setScrollTop] = useRef(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop.current / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length - 1,
    );

    return { startIndex, endIndex };
  }, [scrollTop.current, itemHeight, containerHeight, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop.current = e.currentTarget.scrollTop;
  }, []);

  return {
    visibleItems,
    totalHeight,
    visibleRange,
    handleScroll,
  };
}

// 图片懒加载Hook
export function useLazyLoad(threshold: number = 100) {
  const [loadedImages, setLoadedImages] = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;

            if (src && !loadedImages.current.has(src)) {
              img.src = src;
              loadedImages.current.add(src);
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: `${threshold}px` },
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold]);

  const observeImage = useCallback((img: HTMLImageElement) => {
    if (img.dataset.src && !loadedImages.current.has(img.dataset.src)) {
      observerRef.current?.observe(img);
    }
  }, []);

  return { observeImage };
}

// 资源预加载工具
export class ResourcePreloader {
  private preloadedResources = new Set<string>();

  /**
   * 预加载图片
   */
  preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedResources.has(src)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.preloadedResources.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * 预加载脚本
   */
  preloadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedResources.has(src)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.onload = () => {
        this.preloadedResources.add(src);
        resolve();
      };
      script.onerror = reject;
      script.src = src;
      document.head.appendChild(script);
    });
  }

  /**
   * 预加载样式表
   */
  preloadStylesheet(href: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedResources.has(href)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.onload = () => {
        this.preloadedResources.add(href);
        resolve();
      };
      link.onerror = reject;
      link.href = href;
      document.head.appendChild(link);
    });
  }

  /**
   * 预加载字体
   */
  preloadFont(fontUrl: string, fontFamily: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedResources.has(fontUrl)) {
        resolve();
        return;
      }

      const font = new FontFace(fontFamily, `url(${fontUrl})`);
      font
        .load()
        .then(() => {
          this.preloadedResources
            .add(fontUrl)(document.fonts as any)
            .add(font);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * 批量预加载资源
   */
  async preloadResources(
    resources: Array<{
      type: 'image' | 'script' | 'stylesheet' | 'font';
      url: string;
      fontFamily?: string;
    }>,
  ): Promise<void> {
    const promises = resources.map(resource => {
      switch (resource.type) {
      case 'image':
        return this.preloadImage(resource.url);
      case 'script':
        return this.preloadScript(resource.url);
      case 'stylesheet':
        return this.preloadStylesheet(resource.url);
      case 'font':
        return this.preloadFont(
          resource.url,
          resource.fontFamily || 'custom-font',
        );
      default:
        return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }
}

// 全局资源预加载器实例
export const resourcePreloader = new ResourcePreloader();

// 性能监控工具
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  /**
   * 开始监控
   */
  startMonitoring(): void {
    // 监控长任务
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            type: 'long-task',
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            timestamp: Date.now(),
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

      // 监控导航
      const navigationObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric({
              type: 'navigation',
              name: 'page-load',
              startTime: navEntry.startTime,
              duration: navEntry.loadEventEnd - navEntry.loadEventStart,
              timestamp: Date.now(),
              details: {
                domContentLoaded:
                  navEntry.domContentLoadedEventEnd -
                  navEntry.domContentLoadedEventStart,
                firstPaint: this.getMetricByName('first-paint')?.startTime || 0,
                firstContentfulPaint:
                  this.getMetricByName('first-contentful-paint')?.startTime ||
                  0,
              },
            });
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

      // 监控资源加载
      const resourceObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordMetric({
              type: 'resource',
              name: entry.name,
              startTime: entry.startTime,
              duration: entry.duration,
              timestamp: Date.now(),
              details: {
                size: (entry as any).transferSize || 0,
                type: (entry as any).initiatorType,
              },
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    }
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * 记录自定义指标
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // 限制指标数量
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): PerformanceStats {
    const recentMetrics = this.metrics.slice(-100);
    const longTasks = recentMetrics.filter(m => m.type === 'long-task');
    const navigationMetrics = recentMetrics.filter(
      m => m.type === 'navigation',
    );
    const resourceMetrics = recentMetrics.filter(m => m.type === 'resource');

    return {
      longTaskCount: longTasks.length,
      averageLongTaskDuration:
        longTasks.length > 0
          ? longTasks.reduce((sum, task) => sum + task.duration, 0) /
            longTasks.length
          : 0,
      pageLoadTime:
        navigationMetrics.length > 0 ? navigationMetrics[0].duration : 0,
      resourceLoadTime:
        resourceMetrics.length > 0
          ? resourceMetrics.reduce(
            (sum, resource) => sum + resource.duration,
            0,
          ) / resourceMetrics.length
          : 0,
      totalResources: resourceMetrics.length,
    };
  }

  /**
   * 获取指定名称的指标
   */
  private getMetricByName(name: string): PerformanceMetric | undefined {
    return this.metrics.find(m => m.name === name);
  }
}

// 性能指标接口
export interface PerformanceMetric {
  type: string;
  name: string;
  startTime: number;
  duration: number;
  timestamp: number;
  details?: any;
}

export interface PerformanceStats {
  longTaskCount: number;
  averageLongTaskDuration: number;
  pageLoadTime: number;
  resourceLoadTime: number;
  totalResources: number;
}

// 全局性能监控器实例
export const performanceMonitor = new PerformanceMonitor();

// Bundle分析工具
export class BundleAnalyzer {
  private chunks: ChunkInfo[] = [];

  /**
   * 分析当前bundle
   */
  async analyzeCurrentBundle(): Promise<BundleAnalysis> {
    if (!('__webpack_require__' in window)) {
      throw new Error('Bundle analyzer requires webpack runtime');
    }

    // 这里应该与webpack的runtime集成来获取实际的chunk信息
    // 暂时返回模拟数据
    return this.getMockAnalysis();
  }

  /**
   * 获取bundle优化建议
   */
  getOptimizationSuggestions(
    analysis: BundleAnalysis,
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 检查大chunk
    const largeChunks = analysis.chunks.filter(chunk => chunk.size > 500000);
    if (largeChunks.length > 0) {
      suggestions.push({
        type: 'code-splitting',
        priority: 'high',
        description: '发现大体积chunk，建议进行代码分割',
        chunks: largeChunks.map(c => c.name),
        potentialSavings: largeChunks.reduce((sum, c) => sum + c.size, 0) * 0.3,
      });
    }

    // 检查重复依赖
    const duplicateModules = this.findDuplicateModules(analysis);
    if (duplicateModules.length > 0) {
      suggestions.push({
        type: 'deduplication',
        priority: 'medium',
        description: '发现重复依赖，建议进行去重',
        modules: duplicateModules,
        potentialSavings: duplicateModules.length * 50000, // 估算节省
      });
    }

    return suggestions;
  }

  private findDuplicateModules(analysis: BundleAnalysis): string[] {
    const moduleCount = new Map<string, number>();

    analysis.chunks.forEach(chunk => {
      chunk.modules.forEach(module => {
        moduleCount.set(module.name, (moduleCount.get(module.name) || 0) + 1);
      });
    });

    return Array.from(moduleCount.entries())
      .filter(([name, count]) => count > 1)
      .map(([name]) => name);
  }

  private getMockAnalysis(): BundleAnalysis {
    return {
      totalSize: 2500000,
      chunks: [
        {
          name: 'main',
          size: 1500000,
          modules: [
            { name: 'react', size: 200000 },
            { name: 'react-dom', size: 150000 },
            { name: '@/components/App', size: 50000 },
          ],
        },
        {
          name: 'vendor',
          size: 800000,
          modules: [
            { name: 'lodash', size: 100000 },
            { name: 'date-fns', size: 80000 },
          ],
        },
        {
          name: 'runtime',
          size: 200000,
          modules: [],
        },
      ],
    };
  }
}

// Bundle分析接口
export interface BundleAnalysis {
  totalSize: number;
  chunks: ChunkInfo[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  modules: ModuleInfo[];
}

export interface ModuleInfo {
  name: string;
  size: number;
}

export interface OptimizationSuggestion {
  type: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  chunks?: string[];
  modules?: string[];
  potentialSavings: number;
}

// 全局Bundle分析器实例
export const bundleAnalyzer = new BundleAnalyzer();
