/**
 * 性能监控系统
 *
 * 提供性能指标收集、分析和优化建议
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  type: 'navigation' | 'resource' | 'paint' | 'interaction' | 'custom';
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  summary: {
    totalMetrics: number;
    averageLoadTime: number;
    slowestPage: string;
    fastestPage: string;
    errorRate: number;
  };
  metrics: PerformanceMetric[];
  recommendations: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
    this.setupPageLoadTracking();
  }

  /**
   * 初始化性能观察器
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // 导航性能观察器
      const navObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric({
              name: 'page_load',
              value: navEntry.loadEventEnd - navEntry.loadEventStart,
              unit: 'ms',
              type: 'navigation',
              metadata: {
                domContentLoaded:
                  navEntry.domContentLoadedEventEnd -
                  navEntry.domContentLoadedEventStart,
                firstPaint: this.getFirstPaint(),
                firstContentfulPaint: this.getFirstContentfulPaint(),
                page: window.location.pathname,
              },
            });
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // 资源加载性能观察器
      const resourceObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordMetric({
              name: 'resource_load',
              value: resourceEntry.responseEnd - resourceEntry.requestStart,
              unit: 'ms',
              type: 'resource',
              metadata: {
                url: resourceEntry.name,
                type: this.getResourceType(resourceEntry.name),
                size: resourceEntry.transferSize,
              },
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // 绘制性能观察器
      const paintObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            this.recordMetric({
              name: entry.name,
              value: entry.startTime,
              unit: 'ms',
              type: 'paint',
            });
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    } catch (error) {
      console.warn('Performance monitoring not fully supported:', error);
    }
  }

  /**
   * 设置页面加载跟踪
   */
  private setupPageLoadTracking(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // 页面卸载时保存性能数据
    window.addEventListener('beforeunload', () => {
      this.saveMetrics();
    });

    // 页面可见性变化时记录指标
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.recordPageView();
      }
    });
  }

  /**
   * 记录性能指标
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // 保持指标数量在限制范围内
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // 性能警告
    this.checkPerformanceThresholds(fullMetric);
  }

  /**
   * 记录页面浏览
   */
  recordPageView(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.recordMetric({
      name: 'page_view',
      value: Date.now(),
      unit: 'timestamp',
      type: 'navigation',
      metadata: {
        url: window.location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      },
    });
  }

  /**
   * 记录交互性能
   */
  recordInteraction(name: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.recordMetric({
      name: `interaction_${name}`,
      value: duration,
      unit: 'ms',
      type: 'interaction',
    });
  }

  /**
   * 记录自定义指标
   */
  recordCustomMetric(
    name: string,
    value: number,
    unit: string,
    metadata?: Record<string, any>,
  ): void {
    this.recordMetric({
      name,
      value,
      unit,
      type: 'custom',
      metadata,
    });
  }

  /**
   * 获取首次绘制时间
   */
  private getFirstPaint(): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint?.startTime || 0;
  }

  /**
   * 获取首次内容绘制时间
   */
  private getFirstContentfulPaint(): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(
      entry => entry.name === 'first-contentful-paint',
    );
    return fcp?.startTime || 0;
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) {
      return 'script';
    }
    if (url.includes('.css')) {
      return 'stylesheet';
    }
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
      return 'image';
    }
    if (url.match(/\.(woff|woff2|ttf|eot)$/i)) {
      return 'font';
    }
    return 'other';
  }

  /**
   * 检查性能阈值并发出警告
   */
  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const thresholds = {
      page_load: 3000, // 3秒
      resource_load: 1000, // 1秒
      interaction: 100, // 100ms
      'first-contentful-paint': 2000, // 2秒
      first_paint: 1000, // 1秒
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(
        `⚠️ Performance warning: ${metric.name} took ${metric.value}${metric.unit} (threshold: ${threshold}${metric.unit})`,
      );
    }
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceReport {
    const pageLoadMetrics = this.metrics.filter(m => m.name === 'page_load');
    const resourceMetrics = this.metrics.filter(m => m.type === 'resource');
    const interactionMetrics = this.metrics.filter(
      m => m.type === 'interaction',
    );

    const averageLoadTime =
      pageLoadMetrics.length > 0
        ? pageLoadMetrics.reduce((sum, m) => sum + m.value, 0) /
          pageLoadMetrics.length
        : 0;

    const slowestPage = this.getSlowestPage();
    const fastestPage = this.getFastestPage();

    const recommendations = this.generateRecommendations(
      pageLoadMetrics,
      resourceMetrics,
      interactionMetrics,
    );

    return {
      summary: {
        totalMetrics: this.metrics.length,
        averageLoadTime,
        slowestPage,
        fastestPage,
        errorRate: this.calculateErrorRate(),
      },
      metrics: this.metrics.slice(-50), // 最近50个指标
      recommendations,
    };
  }

  /**
   * 获取最慢页面
   */
  private getSlowestPage(): string {
    const pageMetrics = this.metrics.filter(
      m => m.name === 'page_load' && m.metadata?.page,
    );
    if (pageMetrics.length === 0) {
      return 'N/A';
    }

    const slowest = pageMetrics.reduce((prev, current) =>
      prev.value > current.value ? prev : current,
    );
    return slowest.metadata?.page || 'N/A';
  }

  /**
   * 获取最快页面
   */
  private getFastestPage(): string {
    const pageMetrics = this.metrics.filter(
      m => m.name === 'page_load' && m.metadata?.page,
    );
    if (pageMetrics.length === 0) {
      return 'N/A';
    }

    const fastest = pageMetrics.reduce((prev, current) =>
      prev.value < current.value ? prev : current,
    );
    return fastest.metadata?.page || 'N/A';
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(): number {
    const totalMetrics = this.metrics.filter(
      m => m.type === 'navigation',
    ).length;
    const errorMetrics = this.metrics.filter(m =>
      m.name.includes('error'),
    ).length;
    return totalMetrics > 0 ? (errorMetrics / totalMetrics) * 100 : 0;
  }

  /**
   * 生成性能优化建议
   */
  private generateRecommendations(
    pageMetrics: PerformanceMetric[],
    resourceMetrics: PerformanceMetric[],
    interactionMetrics: PerformanceMetric[],
  ): string[] {
    const recommendations: string[] = [];

    // 页面加载时间建议
    const avgPageLoad =
      pageMetrics.length > 0
        ? pageMetrics.reduce((sum, m) => sum + m.value, 0) / pageMetrics.length
        : 0;

    if (avgPageLoad > 3000) {
      recommendations.push('页面加载时间较慢，建议优化资源加载和代码分割');
    }

    // 资源加载建议
    const largeResources = resourceMetrics.filter(
      r => r.metadata?.size && r.metadata.size > 1024 * 1024,
    ); // 1MB
    if (largeResources.length > 0) {
      recommendations.push('发现大型资源文件，建议进行压缩或使用CDN');
    }

    // 交互性能建议
    const slowInteractions = interactionMetrics.filter(i => i.value > 100);
    if (slowInteractions.length > 0) {
      recommendations.push('部分交互响应较慢，建议优化JavaScript执行时间');
    }

    // 资源数量建议
    const recentResources = resourceMetrics.slice(-20);
    if (recentResources.length > 50) {
      recommendations.push('页面资源数量较多，建议合并和优化资源加载');
    }

    if (recommendations.length === 0) {
      recommendations.push('性能表现良好，继续保持优化');
    }

    return recommendations;
  }

  /**
   * 保存指标到本地存储
   */
  private saveMetrics(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const data = {
        metrics: this.metrics.slice(-100), // 只保存最近100个指标
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('performance_metrics', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save performance metrics:', error);
    }
  }

  /**
   * 从本地存储加载指标
   */
  loadMetrics(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const data = localStorage.getItem('performance_metrics');
      if (data) {
        const parsed = JSON.parse(data);
        this.metrics = parsed.metrics || [];
      }
    } catch (error) {
      console.warn('Failed to load performance metrics:', error);
    }
  }

  /**
   * 清除所有指标
   */
  clearMetrics(): void {
    this.metrics = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('performance_metrics');
    }
  }

  /**
   * 获取Core Web Vitals
   */
  getCoreWebVitals(): {
    LCP?: number;
    FID?: number;
    CLS?: number;
  } {
    if (typeof window === 'undefined') {
      return {};
    }

    const vitals: any = {};

    // Largest Contentful Paint (LCP)
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      vitals.LCP = lcpEntries[lcpEntries.length - 1].startTime;
    }

    // First Input Delay (FID) - 需要事件监听器
    // Cumulative Layout Shift (CLS) - 需要额外计算

    return vitals;
  }

  /**
   * 清理观察器
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// 创建全局实例
const globalForPerformanceMonitor = globalThis as unknown as {
  performanceMonitor: PerformanceMonitor | undefined;
};

export const performanceMonitor =
  globalForPerformanceMonitor.performanceMonitor ?? new PerformanceMonitor();

if (typeof window !== 'undefined' && typeof window !== 'undefined') {
  globalForPerformanceMonitor.performanceMonitor = performanceMonitor;
}

export default performanceMonitor;
