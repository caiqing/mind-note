/**
 * AI服务客户端统一接口
 * 支持多个AI服务提供商的统一调用接口
 */

import { getAIServiceConfig, getPrimaryProvider, getFallbackProviders, AIProvider } from './config';

export interface AIResponse {
  content: string;
  category?: string;
  tags?: string[];
  summary?: string;
  confidence?: number;
  language?: string;
  provider: string;
  model: string;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  responseTime: number;
}

export interface AIRequest {
  content: string;
  context?: string;
  language?: string;
  maxLength?: number;
  temperature?: number;
  includeMetadata?: boolean;
}

export interface AIClient {
  name: string;
  isAvailable(): Promise<boolean>;
  generateResponse(request: AIRequest): Promise<AIResponse>;
  generateCategories(content: string): Promise<AIResponse>;
  generateTags(content: string, existingTags?: string[]): Promise<AIResponse>;
  generateSummary(content: string): Promise<AIResponse>;
}

/**
 * AI服务客户端管理器
 */
export class AIServiceManager {
  private clients: Map<string, AIClient> = new Map();
  private config = getAIServiceConfig();

  constructor() {
    this.initializeClients();
  }

  /**
   * 初始化所有可用的AI客户端
   */
  private initializeClients(): void {
    // 初始化各个AI服务客户端
    // 这里会在后续的任务中具体实现每个客户端
  }

  /**
   * 注册AI客户端
   */
  registerClient(provider: string, client: AIClient): void {
    this.clients.set(provider, client);
  }

  /**
   * 获取可用的AI客户端
   */
  getAvailableClients(): string[] {
    const availableClients: string[] = [];

    for (const [provider, client] of this.clients) {
      // 检查配置是否启用
      if (this.config.providers[provider]?.enabled) {
        availableClients.push(provider);
      }
    }

    return availableClients;
  }

  /**
   * 执行AI请求，支持自动降级
   */
  async executeRequest(request: AIRequest): Promise<AIResponse> {
    const primaryProvider = getPrimaryProvider();
    const fallbackProviders = getFallbackProviders(primaryProvider);

    // 尝试主要提供商
    if (primaryProvider && this.clients.has(primaryProvider)) {
      try {
        const client = this.clients.get(primaryProvider)!;
        if (await client.isAvailable()) {
          return await client.generateResponse(request);
        }
      } catch (error) {
        console.warn(`Primary provider ${primaryProvider} failed:`, error);
      }
    }

    // 尝试备选提供商
    for (const provider of fallbackProviders) {
      if (this.clients.has(provider)) {
        try {
          const client = this.clients.get(provider)!;
          if (await client.isAvailable()) {
            return await client.generateResponse(request);
          }
        } catch (error) {
          console.warn(`Fallback provider ${provider} failed:`, error);
        }
      }
    }

    throw new Error('所有AI服务提供商都不可用');
  }

  /**
   * 生成笔记分类
   */
  async generateCategories(content: string): Promise<AIResponse> {
    const request: AIRequest = {
      content,
      includeMetadata: true,
    };

    return this.executeRequest(request);
  }

  /**
   * 生成笔记标签
   */
  async generateTags(content: string, existingTags?: string[]): Promise<AIResponse> {
    const request: AIRequest = {
      content,
      includeMetadata: true,
    };

    if (existingTags && existingTags.length > 0) {
      request.context = `现有标签: ${existingTags.join(', ')}`;
    }

    return this.executeRequest(request);
  }

  /**
   * 生成笔记摘要
   */
  async generateSummary(content: string): Promise<AIResponse> {
    const request: AIRequest = {
      content,
      includeMetadata: true,
      maxLength: 200,
    };

    return this.executeRequest(request);
  }

  /**
   * 批量处理笔记分析
   */
  async batchAnalyze(notes: Array<{ id: string; content: string }>): Promise<Map<string, AIResponse>> {
    const results = new Map<string, AIResponse>();
    const batchSize = 5; // 限制并发数量
    const delayBetweenBatches = 1000; // 批次间延迟1秒

    for (let i = 0; i < notes.length; i += batchSize) {
      const batch = notes.slice(i, i + batchSize);

      const batchPromises = batch.map(async (note) => {
        try {
          const response = await this.executeRequest({
            content: note.content,
            includeMetadata: true,
          });
          return { id: note.id, response };
        } catch (error) {
          console.error(`Failed to analyze note ${note.id}:`, error);
          return { id: note.id, response: null };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.response) {
          results.set(result.value.id, result.value.response);
        }
      });

      // 批次间延迟，避免API限制
      if (i + batchSize < notes.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return results;
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus(): Promise<Record<string, { available: boolean; responseTime?: number }>> {
    const status: Record<string, { available: boolean; responseTime?: number }> = {};

    for (const [provider, client] of this.clients) {
      try {
        const startTime = Date.now();
        const available = await client.isAvailable();
        const responseTime = Date.now() - startTime;

        status[provider] = { available, responseTime };
      } catch (error) {
        status[provider] = { available: false };
      }
    }

    return status;
  }
}

// 全局AI服务管理器实例
export const aiServiceManager = new AIServiceManager();

/**
 * 便捷函数：生成笔记分类
 */
export async function generateNoteCategories(content: string): Promise<AIResponse> {
  return aiServiceManager.generateCategories(content);
}

/**
 * 便捷函数：生成笔记标签
 */
export async function generateNoteTags(content: string, existingTags?: string[]): Promise<AIResponse> {
  return aiServiceManager.generateTags(content, existingTags);
}

/**
 * 便捷函数：生成笔记摘要
 */
export async function generateNoteSummary(content: string): Promise<AIResponse> {
  return aiServiceManager.generateSummary(content);
}

/**
 * 便捷函数：批量分析笔记
 */
export async function batchAnalyzeNotes(notes: Array<{ id: string; content: string }>): Promise<Map<string, AIResponse>> {
  return aiServiceManager.batchAnalyze(notes);
}