/**
 * AI服务编排器
 *
 * 负责管理多个AI提供商，实现负载均衡、故障转移和成本优化
 */

import { BaseAIProvider } from './providers/base-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { ZhipuProvider } from './providers/zhipu-provider';
import {
  AIRequest,
  AIResponse,
  CategoryResponse,
  TagResponse,
  SummaryResponse,
  KeywordResponse,
  LanguageResponse,
  SentimentResponse,
} from './providers/base-provider';

export interface OrchestratorConfig {
  primaryProvider: string;
  fallbackProviders: string[];
  maxRetries: number;
  timeoutMs: number;
  enableLoadBalancing: boolean;
  costOptimization: boolean;
  qualityThreshold: number;
}

export interface ProviderStatus {
  name: string;
  isAvailable: boolean;
  responseTime: number;
  successRate: number;
  cost: number;
  lastUsed: Date;
  errorCount: number;
}

export interface AIAnalysisRequest {
  content: string;
  operations: Array<
    | 'categorize'
    | 'tag'
    | 'summarize'
    | 'extract_keywords'
    | 'analyze_sentiment'
  >;
  options?: {
    preferredProvider?: string;
    language?: string;
    maxTokens?: number;
    temperature?: number;
    [key: string]: any;
  };
}

export interface AIAnalysisResult {
  success: boolean;
  results: {
    categories?: CategoryResponse;
    tags?: TagResponse;
    summary?: SummaryResponse;
    keywords?: KeywordResponse;
    sentiment?: SentimentResponse;
    language?: LanguageResponse;
  };
  provider: string;
  totalCost: number;
  totalTime: number;
  errors?: string[];
}

export class AIServiceOrchestrator {
  private providers: Map<string, BaseAIProvider> = new Map();
  private providerStats: Map<string, ProviderStatus> = new Map();
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // 初始化OpenAI提供商
    if (process.env.OPENAI_API_KEY) {
      const openaiProvider = new OpenAIProvider(
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      );
      this.providers.set('openai', openaiProvider);
      this.providerStats.set('openai', {
        name: 'OpenAI',
        isAvailable: true,
        responseTime: 0,
        successRate: 1.0,
        cost: 0,
        lastUsed: new Date(),
        errorCount: 0,
      });
    }

    // 初始化智谱AI提供商
    if (process.env.ZHIPU_API_KEY) {
      const zhipuProvider = new ZhipuProvider(
        process.env.ZHIPU_API_KEY,
        process.env.ZHIPU_MODEL || 'glm-4',
      );
      this.providers.set('zhipu', zhipuProvider);
      this.providerStats.set('zhipu', {
        name: '智谱AI',
        isAvailable: true,
        responseTime: 0,
        successRate: 1.0,
        cost: 0,
        lastUsed: new Date(),
        errorCount: 0,
      });
    }

    // TODO: 添加其他提供商（DeepSeek, Kimi, Qwen等）
  }

  /**
   * 获取可用的提供商列表
   */
  private async getAvailableProviders(): Promise<string[]> {
    const availableProviders: string[] = [];

    for (const [name, provider] of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        const stats = this.providerStats.get(name);
        if (stats) {
          stats.isAvailable = isAvailable;
        }

        if (isAvailable) {
          availableProviders.push(name);
        }
      } catch (error) {
        console.error(
          `Error checking availability for provider ${name}:`,
          error,
        );
        const stats = this.providerStats.get(name);
        if (stats) {
          stats.isAvailable = false;
          stats.errorCount++;
        }
      }
    }

    return availableProviders;
  }

  /**
   * 选择最佳提供商
   */
  private async selectBestProvider(preferred?: string): Promise<string> {
    const availableProviders = await this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error('No AI providers are currently available');
    }

    // 如果指定了首选提供商且可用，优先使用
    if (preferred && availableProviders.includes(preferred)) {
      return preferred;
    }

    // 如果主提供商可用，使用主提供商
    if (availableProviders.includes(this.config.primaryProvider)) {
      return this.config.primaryProvider;
    }

    // 尝试故障转移提供商
    for (const fallbackProvider of this.config.fallbackProviders) {
      if (availableProviders.includes(fallbackProvider)) {
        return fallbackProvider;
      }
    }

    // 如果都不可用，返回第一个可用的
    return availableProviders[0];
  }

  /**
   * 更新提供商统计信息
   */
  private updateProviderStats(
    providerName: string,
    response: AIResponse,
  ): void {
    const stats = this.providerStats.get(providerName);
    if (stats) {
      stats.responseTime = (stats.responseTime + response.responseTime) / 2;
      stats.cost += response.cost;
      stats.lastUsed = new Date();

      if (response.success) {
        stats.successRate = stats.successRate * 0.9 + 1.0 * 0.1;
        stats.errorCount = 0;
      } else {
        stats.successRate = stats.successRate * 0.9 + 0.0 * 0.1;
        stats.errorCount++;
      }
    }
  }

  /**
   * 执行AI分析
   */
  async analyzeContent(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    const results: AIAnalysisResult['results'] = {};
    const errors: string[] = [];
    let totalCost = 0;
    let usedProvider = '';

    try {
      // 选择提供商
      const providerName = await this.selectBestProvider(
        request.options?.preferredProvider,
      );
      const provider = this.providers.get(providerName);

      if (!provider) {
        throw new Error(`Provider ${providerName} not found`);
      }

      usedProvider = providerName;

      // 执行各个分析操作
      for (const operation of request.operations) {
        try {
          let operationResult: any;

          switch (operation) {
          case 'categorize':
            operationResult = await provider.generateCategories(
              request.content,
            );
            break;
          case 'tag':
            operationResult = await provider.generateTags(request.content, {
              language: request.options?.language,
              maxTags: request.options?.maxTags,
            });
            break;
          case 'summarize':
            operationResult = await provider.generateSummary(
              request.content,
              {
                language: request.options?.language,
                maxLength: request.options?.maxLength,
                style: request.options?.summaryStyle,
              },
            );
            break;
          case 'extract_keywords':
            operationResult = await provider.extractKeywords(request.content);
            break;
          case 'analyze_sentiment':
            operationResult = await provider.analyzeSentiment(
              request.content,
            );
            break;
          default:
            throw new Error(`Unsupported operation: ${operation}`);
          }

          results[operation] = operationResult;
          totalCost += operationResult.cost || 0;
        } catch (error) {
          const errorMsg = `Failed to execute ${operation}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      const totalTime = Date.now() - startTime;

      return {
        success: errors.length === 0,
        results,
        provider: usedProvider,
        totalCost,
        totalTime,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;

      return {
        success: false,
        results,
        provider: usedProvider,
        totalCost,
        totalTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * 获取提供商状态
   */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    await this.getAvailableProviders(); // 更新可用性状态
    return Array.from(this.providerStats.values());
  }

  /**
   * 获取使用统计
   */
  getUsageStats(period: 'day' | 'week' | 'month' = 'day'): {
    totalCost: number;
    totalRequests: number;
    averageResponseTime: number;
    providerUsage: Record<
      string,
      {
        requests: number;
        cost: number;
        averageTime: number;
      }
    >;
  } {
    const stats = {
      totalCost: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      providerUsage: {} as Record<string, any>,
    };

    for (const [name, providerStat] of this.providerStats) {
      stats.totalCost += providerStat.cost;
      stats.providerUsage[name] = {
        requests: 1, // 简化统计
        cost: providerStat.cost,
        averageTime: providerStat.responseTime,
      };
      stats.totalRequests++;
    }

    return stats;
  }

  /**
   * 测试所有提供商
   */
  async testProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        results[name] = isAvailable;
      } catch (error) {
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * 重置提供商统计
   */
  resetStats(): void {
    for (const [name, stat] of this.providerStats) {
      stat.responseTime = 0;
      stat.cost = 0;
      stat.successRate = 1.0;
      stat.errorCount = 0;
    }
  }

  /**
   * 获取推荐提供商
   */
  getRecommendedProvider(operation?: string): string {
    // 基于成本、性能和可用性推荐提供商
    const availableProviders = Array.from(this.providerStats.entries())
      .filter(([_, stat]) => stat.isAvailable)
      .sort(([_, a], [__, b]) => {
        // 综合评分：成功率 * 0.4 + 响应时间权重 * 0.3 + 成本权重 * 0.3
        const scoreA =
          a.successRate * 0.4 +
          (1000 / (a.responseTime + 1)) * 0.3 +
          (1 / (a.cost + 0.001)) * 0.3;
        const scoreB =
          b.successRate * 0.4 +
          (1000 / (b.responseTime + 1)) * 0.3 +
          (1 / (b.cost + 0.001)) * 0.3;
        return scoreB - scoreA;
      });

    return availableProviders.length > 0
      ? availableProviders[0][0]
      : this.config.primaryProvider;
  }
}
