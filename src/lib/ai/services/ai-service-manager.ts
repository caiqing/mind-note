/**
 * AI服务管理器 - T103.7
 * 统一的多AI服务提供商集成和智能fallback机制
 */

import { AnalysisProvider } from '@/types/ai-analysis';
import { createSummaryService, SummaryRequest, SummaryResult } from './summary-service';
import { createKeywordService, KeywordRequest, KeywordResult } from './keyword-service';
import { createSentimentService, SentimentRequest, SentimentResult } from './sentiment-service';
import { createConceptService, ConceptRequest, ConceptResult } from './concept-service';
import { createOpenAIProviderV2 } from '../providers/openai-provider-v2';
import { createClaudeProvider } from '../providers/claude-provider';
import { aiConfig } from '../ai-config';

export interface AIServiceConfig {
  enableFallback: boolean;
  retryAttempts: number;
  timeoutMs: number;
  enableLoadBalancing: boolean;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  enableHealthCheck: boolean;
  healthCheckIntervalMs: number;
}

export interface UnifiedAnalysisRequest {
  content: string;
  title?: string;
  userId: string;
  options?: {
    summary?: {
      style?: 'paragraph' | 'bullets' | 'key-points';
      maxLength?: number;
      language?: 'zh' | 'en';
    };
    keywords?: {
      maxKeywords?: number;
      priority?: 'relevance' | 'frequency' | 'importance';
      categories?: string[];
    };
    sentiment?: {
      detailLevel?: 'basic' | 'detailed' | 'comprehensive';
      includeEmotions?: boolean;
    };
    concepts?: {
      maxConcepts?: number;
      includeRelations?: boolean;
      includeDefinitions?: boolean;
    };
    preferredProvider?: string;
    language?: 'zh' | 'en';
  };
}

export interface UnifiedAnalysisResult {
  summary?: SummaryResult;
  keywords?: KeywordResult;
  sentiment?: SentimentResult;
  concepts?: ConceptResult;
  metadata: {
    requestId: string;
    processedAt: Date;
    processingTime: number;
    totalCost: number;
    totalTokens: number;
    services: string[];
    providers: string[];
    fallbacksUsed: string[];
    errors: AnalysisError[];
  };
}

export interface AnalysisError {
  service: string;
  provider: string;
  error: string;
  timestamp: Date;
}

export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  successRate: number;
  errorCount: number;
  totalRequests: number;
}

export interface LoadBalancingStats {
  provider: string;
  requestCount: number;
  avgResponseTime: number;
  successRate: number;
  currentLoad: number;
}

export class AIServiceManager {
  private providers: Map<string, AnalysisProvider> = new Map();
  private services: {
    summary: ReturnType<typeof createSummaryService>;
    keywords: ReturnType<typeof createKeywordService>;
    sentiment: ReturnType<typeof createSentimentService>;
    concepts: ReturnType<typeof createConceptService>;
  };

  private config: AIServiceConfig;
  private fallbackOrder: string[];
  private circuitBreakers: Map<string, { isOpen: boolean; openTime: Date; failureCount: number }> = new Map();
  private providerStats: Map<string, ProviderHealth> = new Map();
  private loadBalancingStats: Map<string, LoadBalancingStats> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config?: Partial<AIServiceConfig>) {
    this.config = {
      enableFallback: true,
      retryAttempts: 2,
      timeoutMs: 30000,
      enableLoadBalancing: true,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      enableHealthCheck: true,
      healthCheckIntervalMs: 60000, // 1分钟
      ...config
    };

    this.initializeProviders();
    this.initializeServices();
    this.initializeStats();

    if (this.config.enableHealthCheck) {
      this.startHealthCheck();
    }

    console.log('🤖 AI Service Manager initialized with advanced fallback mechanisms');
  }

  private initializeProviders(): void {
    // 初始化所有可用的提供商
    try {
      const openaiProvider = createOpenAIProviderV2();
      this.providers.set('openai', openaiProvider);
      console.log('✅ OpenAI provider initialized in Service Manager');
    } catch (error) {
      console.warn('⚠️ OpenAI provider not available:', error);
    }

    try {
      const claudeProvider = createClaudeProvider();
      this.providers.set('anthropic', claudeProvider);
      console.log('✅ Claude provider initialized in Service Manager');
    } catch (error) {
      console.warn('⚠️ Claude provider not available:', error);
    }

    if (this.providers.size === 0) {
      throw new Error('No AI providers available for Service Manager');
    }

    // 设置fallback顺序
    this.fallbackOrder = aiConfig.getFallbackOrder().filter(provider =>
      this.providers.has(provider)
    );

    console.log(`📋 Available providers: ${this.fallbackOrder.join(', ')}`);
  }

  private initializeServices(): void {
    this.services = {
      summary: createSummaryService(),
      keywords: createKeywordService(),
      sentiment: createSentimentService(),
      concepts: createConceptService(),
    };

    console.log('🔧 All AI services initialized');
  }

  private initializeStats(): void {
    this.providers.forEach((_, providerName) => {
      this.providerStats.set(providerName, {
        provider: providerName,
        status: 'healthy',
        lastCheck: new Date(),
        responseTime: 0,
        successRate: 1.0,
        errorCount: 0,
        totalRequests: 0,
      });

      this.loadBalancingStats.set(providerName, {
        provider: providerName,
        requestCount: 0,
        avgResponseTime: 0,
        successRate: 1.0,
        currentLoad: 0,
      });

      this.circuitBreakers.set(providerName, {
        isOpen: false,
        openTime: new Date(),
        failureCount: 0,
      });
    });
  }

  async performUnifiedAnalysis(request: UnifiedAnalysisRequest): Promise<UnifiedAnalysisResult> {
    const requestId = `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`🚀 Starting unified analysis (Request: ${requestId})`);
    console.log(`Content length: ${request.content.length} characters`);
    console.log(`Services requested: ${this.getRequestedServices(request).join(', ')}`);

    const results: UnifiedAnalysisResult = {
      metadata: {
        requestId,
        processedAt: new Date(),
        processingTime: 0,
        totalCost: 0,
        totalTokens: 0,
        services: [],
        providers: [],
        fallbacksUsed: [],
        errors: [],
      }
    };

    const requestedServices = this.getRequestedServices(request);

    // 并行执行所有请求的服务
    const servicePromises = requestedServices.map(async (serviceName) => {
      try {
        return await this.executeService(serviceName, request, results);
      } catch (error) {
        console.error(`❌ Service ${serviceName} failed:`, error);
        results.metadata.errors.push({
          service: serviceName,
          provider: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
        return null;
      }
    });

    // 等待所有服务完成
    const serviceResults = await Promise.all(servicePromises);

    // 整理结果
    serviceResults.forEach((result, index) => {
      if (result) {
        const serviceName = requestedServices[index];
        (results as any)[serviceName] = result;
        results.metadata.services.push(serviceName);
        results.metadata.providers.push(result.provider);
        results.metadata.totalCost += result.cost || 0;
        results.metadata.totalTokens += result.tokens?.total || 0;
      }
    });

    results.metadata.processingTime = Date.now() - startTime;

    console.log(`✅ Unified analysis completed in ${results.metadata.processingTime}ms`);
    console.log(`Total cost: $${results.metadata.totalCost.toFixed(6)}`);
    console.log(`Total tokens: ${results.metadata.totalTokens}`);

    return results;
  }

  private getRequestedServices(request: UnifiedAnalysisRequest): string[] {
    const services: string[] = [];

    if (request.options?.summary) services.push('summary');
    if (request.options?.keywords) services.push('keywords');
    if (request.options?.sentiment) services.push('sentiment');
    if (request.options?.concepts) services.push('concepts');

    // 如果没有指定任何服务，默认执行所有服务
    if (services.length === 0) {
      return ['summary', 'keywords', 'sentiment', 'concepts'];
    }

    return services;
  }

  private async executeService(
    serviceName: string,
    request: UnifiedAnalysisRequest,
    results: UnifiedAnalysisResult
  ): Promise<any> {
    const service = this.services[serviceName as keyof typeof this.services];
    const preferredProvider = request.options?.preferredProvider;

    // 选择提供商
    const provider = this.selectProvider(serviceName, preferredProvider);

    // 准备服务特定的请求
    const serviceRequest = this.prepareServiceRequest(serviceName, request, provider);

    // 执行请求with fallback
    const serviceResult = await this.executeWithFallback(
      serviceName,
      provider,
      () => this.callService(service, serviceRequest)
    );

    return serviceResult;
  }

  private selectProvider(serviceName: string, preferredProvider?: string): string {
    const availableProviders = this.getAvailableProviders();

    // 如果指定了首选提供商且可用，使用它
    if (preferredProvider && availableProviders.includes(preferredProvider)) {
      return preferredProvider;
    }

    // 启用负载均衡时，选择负载最低的提供商
    if (this.config.enableLoadBalancing) {
      return this.selectProviderByLoad(availableProviders);
    }

    // 否则使用fallback顺序的第一个可用提供商
    return this.fallbackOrder.find(p => availableProviders.includes(p)) || availableProviders[0];
  }

  private selectProviderByLoad(availableProviders: string[]): string {
    let bestProvider = availableProviders[0];
    let minLoad = Infinity;

    availableProviders.forEach(provider => {
      const stats = this.loadBalancingStats.get(provider);
      if (stats && stats.currentLoad < minLoad) {
        minLoad = stats.currentLoad;
        bestProvider = provider;
      }
    });

    return bestProvider;
  }

  private prepareServiceRequest(
    serviceName: string,
    request: UnifiedAnalysisRequest,
    provider: string
  ): any {
    const baseRequest = {
      content: request.content,
      userId: request.userId,
      preferredProvider: provider,
      language: request.options?.language || 'zh',
    };

    switch (serviceName) {
      case 'summary':
        return {
          ...baseRequest,
          style: request.options?.summary?.style || 'paragraph',
          maxLength: request.options?.summary?.maxLength || 100,
        } as SummaryRequest;

      case 'keywords':
        return {
          ...baseRequest,
          maxKeywords: request.options?.keywords?.maxKeywords || 8,
          priority: request.options?.keywords?.priority || 'relevance',
          categories: request.options?.keywords?.categories || [],
        } as KeywordRequest;

      case 'sentiment':
        return {
          ...baseRequest,
          detailLevel: request.options?.sentiment?.detailLevel || 'basic',
          includeEmotions: request.options?.sentiment?.includeEmotions || false,
        } as SentimentRequest;

      case 'concepts':
        return {
          ...baseRequest,
          maxConcepts: request.options?.concepts?.maxConcepts || 10,
          includeRelations: request.options?.concepts?.includeRelations || false,
          includeDefinitions: request.options?.concepts?.includeDefinitions || false,
        } as ConceptRequest;

      default:
        return baseRequest;
    }
  }

  private async executeWithFallback<T>(
    serviceName: string,
    initialProvider: string,
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;
    const providersToTry = this.getProviderFallbackOrder(initialProvider);

    for (const provider of providersToTry) {
      // 检查熔断器
      if (this.isCircuitBreakerOpen(provider)) {
        console.warn(`⚠️ Circuit breaker open for provider ${provider}, skipping`);
        continue;
      }

      try {
        console.log(`🔄 Executing ${serviceName} with provider: ${provider}`);
        const startTime = Date.now();

        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise(this.config.timeoutMs)
        ]);

        const endTime = Date.now();
        this.recordSuccess(provider, endTime - startTime);

        if (provider !== initialProvider) {
          console.log(`✅ Fallback successful: ${initialProvider} -> ${provider}`);
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Provider ${provider} failed for ${serviceName}:`, error);

        this.recordFailure(provider);

        // 如果不是最后一个提供商，继续尝试下一个
        const currentProviderIndex = providersToTry.indexOf(provider);
        if (currentProviderIndex < providersToTry.length - 1) {
          console.log(`🔄 Falling back to next provider...`);
          continue;
        }
      }
    }

    // 所有提供商都失败了
    throw new Error(`All providers failed for ${serviceName}. Last error: ${lastError?.message}`);
  }

  private getProviderFallbackOrder(preferredProvider: string): string[] {
    const availableProviders = this.getAvailableProviders();

    // 首先尝试首选提供商
    const order = [preferredProvider].filter(p => availableProviders.includes(p));

    // 然后按照fallback顺序添加其他提供商
    this.fallbackOrder.forEach(provider => {
      if (!order.includes(provider) && availableProviders.includes(provider)) {
        order.push(provider);
      }
    });

    return order;
  }

  private getAvailableProviders(): string[] {
    return Array.from(this.providers.keys()).filter(provider => {
      const circuitBreaker = this.circuitBreakers.get(provider);
      return !circuitBreaker?.isOpen;
    });
  }

  private isCircuitBreakerOpen(provider: string): boolean {
    if (!this.config.enableCircuitBreaker) {
      return false;
    }

    const circuitBreaker = this.circuitBreakers.get(provider);
    if (!circuitBreaker) {
      return false;
    }

    // 如果熔断器已打开，检查是否可以重置
    if (circuitBreaker.isOpen) {
      const timeSinceOpen = Date.now() - circuitBreaker.openTime.getTime();
      const resetTimeout = 5 * 60 * 1000; // 5分钟后重置

      if (timeSinceOpen > resetTimeout) {
        console.log(`🔄 Resetting circuit breaker for provider ${provider}`);
        circuitBreaker.isOpen = false;
        circuitBreaker.failureCount = 0;
        return false;
      }
    }

    return circuitBreaker.isOpen;
  }

  private recordSuccess(provider: string, responseTime: number): void {
    // 更新提供商健康状态
    const health = this.providerStats.get(provider);
    if (health) {
      health.totalRequests++;
      health.lastCheck = new Date();
      health.responseTime = (health.responseTime + responseTime) / 2; // 移动平均
      health.successRate = (health.totalRequests - health.errorCount) / health.totalRequests;
      health.status = health.successRate > 0.9 ? 'healthy' :
                     health.successRate > 0.7 ? 'degraded' : 'unhealthy';
    }

    // 更新负载均衡统计
    const loadStats = this.loadBalancingStats.get(provider);
    if (loadStats) {
      loadStats.requestCount++;
      loadStats.avgResponseTime = (loadStats.avgResponseTime + responseTime) / 2;
      loadStats.successRate = (loadStats.requestCount - this.getFailureCount(provider)) / loadStats.requestCount;
      loadStats.currentLoad = Math.max(0, loadStats.currentLoad - 1);
    }

    // 重置熔断器失败计数
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker && circuitBreaker.failureCount > 0) {
      circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
    }
  }

  private recordFailure(provider: string): void {
    // 更新提供商健康状态
    const health = this.providerStats.get(provider);
    if (health) {
      health.totalRequests++;
      health.errorCount++;
      health.successRate = (health.totalRequests - health.errorCount) / health.totalRequests;
      health.status = health.successRate > 0.9 ? 'healthy' :
                     health.successRate > 0.7 ? 'degraded' : 'unhealthy';
    }

    // 更新熔断器状态
    if (this.config.enableCircuitBreaker) {
      const circuitBreaker = this.circuitBreakers.get(provider);
      if (circuitBreaker) {
        circuitBreaker.failureCount++;

        // 如果失败次数超过阈值，打开熔断器
        if (circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
          console.warn(`🔥 Opening circuit breaker for provider ${provider}`);
          circuitBreaker.isOpen = true;
          circuitBreaker.openTime = new Date();
        }
      }
    }
  }

  private getFailureCount(provider: string): number {
    const health = this.providerStats.get(provider);
    return health?.errorCount || 0;
  }

  private async callService(service: any, request: any): Promise<any> {
    // 增加负载计数
    if (request.preferredProvider) {
      const loadStats = this.loadBalancingStats.get(request.preferredProvider);
      if (loadStats) {
        loadStats.currentLoad++;
      }
    }

    try {
      // 调用具体服务
      if (service.extractKeywords) {
        return await service.extractKeywords(request);
      } else if (service.generateSummary) {
        return await service.generateSummary(request);
      } else if (service.analyzeSentiment) {
        return await service.analyzeSentiment(request);
      } else if (service.extractConcepts) {
        return await service.extractConcepts(request);
      } else {
        throw new Error(`Unknown service type`);
      }
    } finally {
      // 减少负载计数
      if (request.preferredProvider) {
        const loadStats = this.loadBalancingStats.get(request.preferredProvider);
        if (loadStats) {
          loadStats.currentLoad = Math.max(0, loadStats.currentLoad - 1);
        }
      }
    }
  }

  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);

    console.log(`🏥 Health check started (interval: ${this.config.healthCheckIntervalMs}ms)`);
  }

  private async performHealthCheck(): Promise<void> {
    console.log('🏥 Performing health check...');

    const healthPromises = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      try {
        const startTime = Date.now();

        // 简单的健康检查：尝试调用一个基本方法
        if (provider.extractKeywords) {
          await provider.extractKeywords('test');
        } else if (provider.generateSummary) {
          await provider.generateSummary({ content: 'test', userId: 'health-check' });
        }

        const responseTime = Date.now() - startTime;
        this.recordSuccess(name, responseTime);

        console.log(`✅ Provider ${name}: healthy (${responseTime}ms)`);

      } catch (error) {
        console.warn(`❌ Provider ${name}: unhealthy -`, error);
        this.recordFailure(name);
      }
    });

    await Promise.allSettled(healthPromises);
  }

  // 公共API方法
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: ProviderHealth[];
    loadBalancing: LoadBalancingStats[];
    circuitBreakers: { provider: string; isOpen: boolean; failureCount: number }[];
    config: AIServiceConfig;
  }> {
    const providers = Array.from(this.providerStats.values());
    const loadBalancing = Array.from(this.loadBalancingStats.values());
    const circuitBreakers = Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
      provider: name,
      isOpen: cb.isOpen,
      failureCount: cb.failureCount,
    }));

    const healthyProviders = providers.filter(p => p.status === 'healthy').length;
    const totalProviders = providers.length;

    const status = healthyProviders === totalProviders ? 'healthy' :
                   healthyProviders > 0 ? 'degraded' : 'unhealthy';

    return {
      status,
      providers,
      loadBalancing,
      circuitBreakers,
      config: this.config,
    };
  }

  getProviderStats(): { provider: string; stats: ProviderHealth }[] {
    return Array.from(this.providerStats.entries()).map(([name, stats]) => ({
      provider: name,
      stats,
    }));
  }

  getLoadBalancingStats(): { provider: string; stats: LoadBalancingStats }[] {
    return Array.from(this.loadBalancingStats.entries()).map(([name, stats]) => ({
      provider: name,
      stats,
    }));
  }

  async resetCircuitBreaker(provider: string): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
      console.log(`🔄 Circuit breaker reset for provider ${provider}`);
    }
  }

  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 重新启动健康检查（如果配置更改）
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      if (this.config.enableHealthCheck) {
        this.startHealthCheck();
      }
    }

    console.log('⚙️ Service Manager configuration updated');
  }

  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    console.log('🛑 AI Service Manager shutdown complete');
  }
}

// 工厂函数
export function createAIServiceManager(config?: Partial<AIServiceConfig>): AIServiceManager {
  return new AIServiceManager(config);
}

// 单例实例（可选）
export const aiServiceManager = new AIServiceManager();