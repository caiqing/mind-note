/**
 * 数据库查询优化器
 */

import { PrismaClient } from '@prisma/client';

export interface QueryOptions {
  include?: string[];
  select?: string[];
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface QueryPerformanceMetrics {
  executionTime: number;
  resultCount: number;
  cacheHit: boolean;
  queryType: string;
  timestamp: Date;
}

export class QueryOptimizer {
  private prisma: PrismaClient;
  private metrics: QueryPerformanceMetrics[] = [];
  private maxMetricsSize = 1000;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 优化的笔记查询
   */
  async findNotes(options: QueryOptions = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('notes', options);

    try {
      // 检查缓存
      if (options.cache !== false) {
        const cached = await this.checkCache(cacheKey);
        if (cached) {
          this.recordMetric({
            executionTime: Date.now() - startTime,
            resultCount: cached.length,
            cacheHit: true,
            queryType: 'notes.findMany',
            timestamp: new Date(),
          });
          return cached;
        }
      }

      // 构建查询参数
      const queryArgs: any = {};

      if (options.select && options.select.length > 0) {
        queryArgs.select = this.buildSelectObject(options.select);
      }

      if (options.include && options.include.length > 0) {
        queryArgs.include = this.buildIncludeObject(options.include);
      }

      if (options.where) {
        queryArgs.where = this.buildWhereClause(options.where);
      }

      if (options.orderBy) {
        queryArgs.orderBy = options.orderBy;
      }

      if (options.skip !== undefined) {
        queryArgs.skip = options.skip;
      }

      if (options.take !== undefined) {
        queryArgs.take = Math.min(options.take, 100); // 限制最大查询数量
      }

      // 执行查询
      const result = await this.prisma.note.findMany(queryArgs);

      // 缓存结果
      if (options.cache !== false) {
        await this.setCache(cacheKey, result, options.cacheTTL);
      }

      // 记录性能指标
      this.recordMetric({
        executionTime: Date.now() - startTime,
        resultCount: result.length,
        cacheHit: false,
        queryType: 'notes.findMany',
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      console.error('Query optimization failed:', error);
      throw error;
    }
  }

  /**
   * 优化的笔记搜索查询
   */
  async searchNotes(searchTerm: string, options: QueryOptions = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('search', {
      term: searchTerm,
      ...options,
    });

    try {
      // 检查缓存
      if (options.cache !== false) {
        const cached = await this.checkCache(cacheKey);
        if (cached) {
          this.recordMetric({
            executionTime: Date.now() - startTime,
            resultCount: cached.length,
            cacheHit: true,
            queryType: 'notes.search',
            timestamp: new Date(),
          });
          return cached;
        }
      }

      // 使用数据库全文搜索
      const queryArgs: any = {
        where: {
          OR: [
            {
              title: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              content: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              aiSummary: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              aiKeywords: {
                hasSome: [searchTerm],
              },
            },
          ],
        },
        take: Math.min(options.take || 20, 50), // 搜索结果限制为50条
        orderBy: [
          {
            viewCount: 'desc',
          },
          {
            updatedAt: 'desc',
          },
        ],
      };

      // 添加其他查询选项
      if (options.where) {
        queryArgs.where = {
          AND: [queryArgs.where, options.where],
        };
      }

      if (options.select && options.select.length > 0) {
        queryArgs.select = this.buildSelectObject(options.select);
      }

      if (options.include && options.include.length > 0) {
        queryArgs.include = this.buildIncludeObject(options.include);
      }

      if (options.skip !== undefined) {
        queryArgs.skip = options.skip;
      }

      // 执行搜索查询
      const result = await this.prisma.note.findMany(queryArgs);

      // 缓存结果（搜索结果缓存时间较短）
      if (options.cache !== false) {
        await this.setCache(
          cacheKey,
          result,
          Math.min(options.cacheTTL || 300, 300),
        );
      }

      // 记录性能指标
      this.recordMetric({
        executionTime: Date.now() - startTime,
        resultCount: result.length,
        cacheHit: false,
        queryType: 'notes.search',
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      console.error('Search query optimization failed:', error);
      throw error;
    }
  }

  /**
   * 优化的分析数据查询
   */
  async getAnalyticsData(timeRange: string, options: QueryOptions = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('analytics', {
      timeRange,
      ...options,
    });

    try {
      // 检查缓存
      if (options.cache !== false) {
        const cached = await this.checkCache(cacheKey);
        if (cached) {
          this.recordMetric({
            executionTime: Date.now() - startTime,
            resultCount: 1,
            cacheHit: true,
            queryType: 'analytics.getData',
            timestamp: new Date(),
          });
          return cached;
        }
      }

      // 计算时间范围
      const { startDate, endDate } = this.calculateDateRange(timeRange);

      // 使用原生 SQL 进行复杂分析查询（更高效）
      const analyticsQuery = `
        SELECT
          COUNT(*) as totalNotes,
          COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END) as publishedNotes,
          COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draftNotes,
          SUM(viewCount) as totalViews,
          AVG(viewCount) as averageViews,
          SUM(wordCount) as totalWords,
          COUNT(CASE WHEN aiProcessed = true THEN 1 END) as aiProcessedNotes,
          ROUND(COUNT(CASE WHEN aiProcessed = true THEN 1 END) * 100.0 / COUNT(*), 2) as aiProcessingRate,
          DATE_TRUNC('day', createdAt) as date,
          COUNT(*) as dailyCount
        FROM notes
        WHERE createdAt >= ${startDate.toISOString()}
        AND createdAt <= ${endDate.toISOString()}
        GROUP BY DATE_TRUNC('day', createdAt)
        ORDER BY date DESC
      `;

      const result = await this.prisma.$queryRawUnsafe(analyticsQuery);

      // 处理和格式化结果
      const processedResult = this.processAnalyticsResult(result, timeRange);

      // 缓存结果（分析数据缓存时间较长）
      if (options.cache !== false) {
        await this.setCache(
          cacheKey,
          processedResult,
          options.cacheTTL || 1800,
        ); // 30分钟
      }

      // 记录性能指标
      this.recordMetric({
        executionTime: Date.now() - startTime,
        resultCount: 1,
        cacheHit: false,
        queryType: 'analytics.getData',
        timestamp: new Date(),
      });

      return processedResult;
    } catch (error) {
      console.error('Analytics query optimization failed:', error);
      throw error;
    }
  }

  /**
   * 获取查询性能指标
   */
  getMetrics(): QueryPerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    const recentMetrics = this.metrics.slice(-100); // 最近100个查询

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        slowQueries: 0,
        fastQueries: 0,
      };
    }

    const totalQueries = recentMetrics.length;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const averageExecutionTime =
      recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;
    const slowQueries = recentMetrics.filter(
      m => m.executionTime > 1000,
    ).length; // 超过1秒
    const fastQueries = recentMetrics.filter(m => m.executionTime < 100).length; // 小于100ms

    return {
      totalQueries,
      averageExecutionTime,
      cacheHitRate: (cacheHits / totalQueries) * 100,
      slowQueries,
      fastQueries,
    };
  }

  /**
   * 清理性能指标
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * 构建选择对象
   */
  private buildSelectObject(fields: string[]): Record<string, any> {
    const select: Record<string, any> = {};

    fields.forEach(field => {
      if (field.includes('.')) {
        const [relation, fieldPath] = field.split('.');
        if (!select[relation]) {
          select[relation] = { select: {} };
        }
        select[relation].select[fieldPath] = true;
      } else {
        select[field] = true;
      }
    });

    return select;
  }

  /**
   * 构建包含对象
   */
  private buildIncludeObject(relations: string[]): Record<string, any> {
    const include: Record<string, any> = {};

    relations.forEach(relation => {
      include[relation] = true;
    });

    return include;
  }

  /**
   * 构建WHERE子句
   */
  private buildWhereClause(where: Record<string, any>): Record<string, any> {
    // 这里可以添加更多的WHERE子句优化逻辑
    return where;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, options: any): string {
    const optionsStr = JSON.stringify(options, Object.keys(options).sort());
    return `${type}:${Buffer.from(optionsStr).toString('base64')}`;
  }

  /**
   * 检查缓存
   */
  private async checkCache(key: string): Promise<any> {
    // 这里应该集成实际的缓存服务
    // 暂时返回null
    return null;
  }

  /**
   * 设置缓存
   */
  private async setCache(key: string, value: any, ttl?: number): Promise<void> {
    // 这里应该集成实际的缓存服务
    // 暂时不实现
  }

  /**
   * 计算日期范围
   */
  private calculateDateRange(timeRange: string): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  /**
   * 处理分析结果
   */
  private processAnalyticsResult(rawResult: any[], timeRange: string): any {
    // 这里应该处理原始查询结果并格式化为预期的数据结构
    // 暂时返回基本结构
    return {
      overview: {
        totalNotes: 0,
        publishedNotes: 0,
        draftNotes: 0,
        totalViews: 0,
        averageViews: 0,
        totalWords: 0,
        aiProcessedNotes: 0,
        aiProcessingRate: 0,
      },
      timeSeries: [],
      categoryDistribution: [],
      tagAnalysis: [],
      userActivity: {
        dailyActivity: [],
        hourlyActivity: [],
        topActivities: [],
        sessionStats: {},
      },
      aiInsights: {
        sentimentAnalysis: { positive: 0.3, negative: 0.1, neutral: 0.6 },
        contentPatterns: [],
        writingHabits: {},
        topicClusters: [],
      },
      trends: [],
    };
  }

  /**
   * 记录性能指标
   */
  private recordMetric(metric: QueryPerformanceMetrics): void {
    this.metrics.push(metric);

    // 限制指标数量
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }
}

// 全局查询优化器实例
export const queryOptimizer = new QueryOptimizer(new PrismaClient());
