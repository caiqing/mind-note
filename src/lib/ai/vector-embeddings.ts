/**
 * 向量嵌入服务
 *
 * 负责将文本转换为向量表示，支持多种AI提供商
 */

import { BaseAIProvider } from './providers/base-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { ZhipuProvider } from './providers/zhipu-provider';

export interface VectorEmbeddingRequest {
  content: string;
  model?: string;
  provider?: string;
  dimensions?: number;
}

export interface VectorEmbeddingResponse {
  embedding: number[];
  dimensions: number;
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

export interface SimilaritySearchRequest {
  queryEmbedding: number[];
  limit?: number;
  threshold?: number;
  filters?: {
    categoryIds?: number[];
    tags?: string[];
    dateRange?: {
      from: string;
      to: string;
    };
    userId?: string;
  };
}

export interface SimilaritySearchResult {
  notes: Array<{
    id: string;
    title: string;
    content: string;
    similarity: number;
    distance: number;
    category?: {
      id: number;
      name: string;
      color: string;
    };
    tags: Array<{
      id: number;
      name: string;
      color: string;
    }>;
    createdAt: Date;
  }>;
  totalFound: number;
  searchTime: number;
  queryInfo: {
    dimensions: number;
    threshold: number;
    limit: number;
  };
}

/**
 * 向量嵌入服务类
 */
export class VectorEmbeddingService {
  private providers: Map<string, BaseAIProvider> = new Map();
  private defaultProvider: string;
  private defaultDimensions: number;

  constructor() {
    this.defaultProvider = process.env.AI_PRIMARY_PROVIDER || 'openai';
    this.defaultDimensions = 1536; // OpenAI text-embedding-ada-002 的维度
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // 初始化OpenAI提供商
    if (process.env.OPENAI_API_KEY) {
      const openaiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY);
      this.providers.set('openai', openaiProvider);
    }

    // 初始化智谱AI提供商
    if (process.env.ZHIPU_API_KEY) {
      const zhipuProvider = new ZhipuProvider(process.env.ZHIPU_API_KEY);
      this.providers.set('zhipu', zhipuProvider);
    }

    // TODO: 添加其他提供商
  }

  /**
   * 生成向量嵌入
   */
  async generateEmbedding(
    request: VectorEmbeddingRequest,
  ): Promise<VectorEmbeddingResponse> {
    const startTime = Date.now();
    const providerName = request.provider || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      return {
        embedding: [],
        dimensions: 0,
        provider: providerName,
        model: request.model || 'unknown',
        tokensUsed: 0,
        cost: 0,
        responseTime: 0,
        success: false,
        error: `Provider ${providerName} not available`,
      };
    }

    try {
      // 根据提供商生成嵌入
      const embedding = await this.generateEmbeddingWithProvider(
        provider,
        request,
      );

      const responseTime = Date.now() - startTime;

      return {
        embedding,
        dimensions: embedding.length,
        provider: providerName,
        model: request.model || this.getDefaultModel(providerName),
        tokensUsed: this.estimateTokens(request.content),
        cost: this.calculateEmbeddingCost(providerName, embedding.length),
        responseTime,
        success: true,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        embedding: [],
        dimensions: 0,
        provider: providerName,
        model: request.model || 'unknown',
        tokensUsed: 0,
        cost: 0,
        responseTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 批量生成向量嵌入
   */
  async generateBatchEmbeddings(
    requests: VectorEmbeddingRequest[],
  ): Promise<VectorEmbeddingResponse[]> {
    const results: VectorEmbeddingResponse[] = [];

    // 分批处理，避免并发过多
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      const batchPromises = batch.map(request =>
        this.generateEmbedding(request),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 添加延迟以避免速率限制
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * 计算余弦相似度
   */
  calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 计算欧几里得距离
   */
  calculateEuclideanDistance(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let sumSquaredDifferences = 0;
    for (let i = 0; i < vec1.length; i++) {
      const diff = vec1[i] - vec2[i];
      sumSquaredDifferences += diff * diff;
    }

    return Math.sqrt(sumSquaredDifferences);
  }

  /**
   * 根据提供商生成嵌入
   */
  private async generateEmbeddingWithProvider(
    provider: BaseAIProvider,
    request: VectorEmbeddingRequest,
  ): Promise<number[]> {
    const providerName = provider.constructor.name.toLowerCase();

    switch (providerName) {
    case 'openaiprovider':
      return this.generateOpenAIEmbedding(request);
    case 'zhipuprovder':
      return this.generateZhipuEmbedding(request);
    default:
      throw new Error(
        `Embedding generation not supported for provider: ${providerName}`,
      );
    }
  }

  /**
   * 使用OpenAI生成嵌入
   */
  private async generateOpenAIEmbedding(
    request: VectorEmbeddingRequest,
  ): Promise<number[]> {
    // 这里应该调用OpenAI的嵌入API
    // 由于我们还没有完全实现OpenAI嵌入API调用，这里返回模拟数据
    const dimensions = request.dimensions || this.defaultDimensions;
    return this.generateMockEmbedding(dimensions);
  }

  /**
   * 使用智谱AI生成嵌入
   */
  private async generateZhipuEmbedding(
    request: VectorEmbeddingRequest,
  ): Promise<number[]> {
    // 这里应该调用智谱AI的嵌入API
    // 由于我们还没有完全实现智谱AI嵌入API调用，这里返回模拟数据
    const dimensions = request.dimensions || this.defaultDimensions;
    return this.generateMockEmbedding(dimensions);
  }

  /**
   * 生成模拟嵌入（用于测试）
   */
  private generateMockEmbedding(dimensions: number): number[] {
    const embedding: number[] = [];
    for (let i = 0; i < dimensions; i++) {
      embedding.push(Math.random() * 2 - 1); // -1 到 1 之间的随机数
    }
    return embedding;
  }

  /**
   * 估算token数量
   */
  private estimateTokens(text: string): number {
    // 简单的token估算：大约4个字符=1个token
    return Math.ceil(text.length / 4);
  }

  /**
   * 计算嵌入成本
   */
  private calculateEmbeddingCost(provider: string, dimensions: number): number {
    // 简化的成本计算
    const costPer1KTokens = {
      openai: 0.0001, // $0.0001 per 1K tokens for embeddings
      zhipu: 0.0005, // ¥0.0005 per 1K tokens for embeddings
    };

    const baseCost =
      costPer1KTokens[provider as keyof typeof costPer1KTokens] || 0.0001;
    return baseCost * (dimensions / 1000);
  }

  /**
   * 获取默认模型
   */
  private getDefaultModel(provider: string): string {
    const models = {
      openai: 'text-embedding-ada-002',
      zhipu: 'embedding-2',
    };
    return models[provider as keyof typeof models] || 'unknown';
  }

  /**
   * 标准化向量
   */
  normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) {
      return vector;
    }
    return vector.map(val => val / norm);
  }

  /**
   * 降低向量维度（PCA简单实现）
   */
  reduceDimensions(vector: number[], targetDimensions: number): number[] {
    if (vector.length <= targetDimensions) {
      return vector;
    }

    // 简化的降维：等间隔采样
    const step = vector.length / targetDimensions;
    const reduced: number[] = [];

    for (let i = 0; i < targetDimensions; i++) {
      const index = Math.floor(i * step);
      reduced.push(vector[index]);
    }

    return reduced;
  }

  /**
   * 验证向量格式
   */
  validateVector(vector: number[]): boolean {
    if (!Array.isArray(vector)) {
      return false;
    }
    if (vector.length === 0) {
      return false;
    }

    return vector.every(
      val => typeof val === 'number' && !isNaN(val) && isFinite(val),
    );
  }

  /**
   * 获取向量统计信息
   */
  getVectorStats(vector: number[]): {
    dimensions: number;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    sparsity: number;
  } {
    if (vector.length === 0) {
      return {
        dimensions: 0,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        sparsity: 0,
      };
    }

    const mean = vector.reduce((sum, val) => sum + val, 0) / vector.length;
    const variance =
      vector.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      vector.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...vector);
    const max = Math.max(...vector);
    const sparsity = vector.filter(val => val === 0).length / vector.length;

    return {
      dimensions: vector.length,
      mean,
      stdDev,
      min,
      max,
      sparsity,
    };
  }
}
