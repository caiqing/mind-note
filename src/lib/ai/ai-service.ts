/**
 * AI服务核心模块
 *
 * 提供统一的AI分析服务接口，支持多个AI提供商
 * 包含文本分析、分类、标签生成和向量嵌入功能
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateEmbedding } from 'ai';
import {
  AIProvider,
  AIAnalysisRequest,
  AIAnalysisResult,
  EmbeddingResult,
  AI_CONFIG,
  AI_FEATURES,
  ContentCategory,
  validateAIConfig,
  getTokenCost
} from './ai-config';

// AI服务错误类
export class AIServiceError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// 速率限制错误
export class RateLimitError extends AIServiceError {
  constructor(provider: AIProvider, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 'RATE_LIMIT');
    this.retryAfter = retryAfter;
  }
}

// 配额超限错误
export class QuotaExceededError extends AIServiceError {
  constructor(provider: AIProvider, message?: string) {
    super(message || `Quota exceeded for ${provider}`, provider, 'QUOTA_EXCEEDED');
  }
}

// AI服务统计
export interface AIServiceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  dailyCost: number;
  requestsByProvider: Record<AIProvider, number>;
}

// 全局统计
const stats: AIServiceStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalTokens: 0,
  totalCost: 0,
  dailyCost: 0,
  requestsByProvider: {
    openai: 0,
    anthropic: 0,
    ollama: 0,
  },
};

// AI服务主类
export class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * 验证服务配置
   */
  public validateConfig(): { isValid: boolean; errors: string[] } {
    return validateAIConfig();
  }

  /**
   * 获取服务统计信息
   */
  public getStats(): AIServiceStats {
    return { ...stats };
  }

  /**
   * 重置每日统计
   */
  public resetDailyStats(): void {
    stats.dailyCost = 0;
  }

  /**
   * 执行AI分析
   */
  public async analyzeContent(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    if (!AI_CONFIG.enabled) {
      throw new AIServiceError('AI service is disabled', 'openai');
    }

    stats.totalRequests++;

    try {
      const result = await this.performAnalysis(request);
      stats.successfulRequests++;
      stats.totalTokens += result.tokens;
      stats.totalCost += result.cost;
      stats.dailyCost += result.cost;
      stats.requestsByProvider[result.provider]++;

      // 检查成本限制
      if (result.cost > AI_CONFIG.costPerNoteLimit) {
        console.warn(`Analysis cost $${result.cost.toFixed(4)} exceeds limit $${AI_CONFIG.costPerNoteLimit}`);
      }

      if (stats.dailyCost > AI_CONFIG.dailyBudgetUSD) {
        throw new QuotaExceededError(result.provider, 'Daily budget exceeded');
      }

      return result;
    } catch (error) {
      stats.failedRequests++;
      throw error;
    }
  }

  /**
   * 生成向量嵌入
   */
  public async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!AI_FEATURES.embedding) {
      throw new AIServiceError('Embedding generation is disabled', 'openai');
    }

    const provider = this.getCurrentProvider();
    const startTime = Date.now();

    try {
      let embedding: number[];
      let model: string;

      if (provider === 'openai') {
        const openaiProvider = openai({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const result = await generateEmbedding({
          model: openai.embedding(AI_CONFIG.models.openai.embedding),
          value: text,
        });

        embedding = result.embedding;
        model = AI_CONFIG.models.openai.embedding;
      } else if (provider === 'anthropic') {
        // Anthropic不提供嵌入服务，回退到OpenAI
        throw new AIServiceError('Anthropic does not provide embedding services', provider);
      } else {
        // Ollama嵌入（需要特殊处理）
        embedding = await this.generateOllamaEmbedding(text);
        model = AI_CONFIG.models.ollama.embedding;
      }

      const cost = getTokenCost(provider, model) * (text.length / 1000);

      return {
        noteId: '', // 由调用方设置
        embedding,
        model,
        provider,
        dimensions: embedding.length,
        processedAt: new Date(),
      };
    } catch (error) {
      throw new AIServiceError(
        `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider,
        'EMBEDDING_ERROR'
      );
    }
  }

  /**
   * 执行实际的AI分析
   */
  private async performAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const provider = this.getCurrentProvider();
    const startTime = Date.now();

    try {
      let analysisText: string;
      let model: string;
      let tokens: number;

      // 构建分析提示词
      const prompt = this.buildAnalysisPrompt(request);

      if (provider === 'openai') {
        const result = await generateText({
          model: openai(AI_CONFIG.models.openai.chat),
          prompt,
          maxTokens: AI_CONFIG.maxTokens,
          temperature: 0.3,
        });

        analysisText = result.text;
        model = result.model;
        tokens = result.usage?.totalTokens || 0;
      } else if (provider === 'anthropic') {
        const result = await generateText({
          model: anthropic(AI_CONFIG.models.anthropic.chat),
          prompt,
          maxTokens: AI_CONFIG.maxTokens,
          temperature: 0.3,
        });

        analysisText = result.text;
        model = result.model;
        tokens = result.usage?.totalTokens || 0;
      } else {
        // Ollama
        const result = await this.callOllamaAPI(prompt);
        analysisText = result.text;
        model = AI_CONFIG.models.ollama.chat;
        tokens = this.estimateTokens(prompt + analysisText);
      }

      // 解析AI响应
      const analysis = this.parseAnalysisResponse(analysisText);

      // 计算成本
      const cost = getTokenCost(provider, model) * (tokens / 1000);

      return {
        id: this.generateId(),
        noteId: '', // 由调用方设置
        summary: analysis.summary,
        category: analysis.category,
        tags: analysis.tags,
        keyConcepts: analysis.keyConcepts,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        model,
        provider,
        processedAt: new Date(),
        tokens,
        cost,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          throw new RateLimitError(provider);
        }
        if (error.message.includes('quota') || error.message.includes('billing')) {
          throw new QuotaExceededError(provider);
        }
      }

      throw new AIServiceError(
        `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider
      );
    }
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(request: AIAnalysisRequest): string {
    const { title, content, existingTags = [] } = request;

    return `
请分析以下笔记内容，提供结构化的分析结果。

标题：${title}

内容：
${content}

${existingTags.length > 0 ? `现有标签：${existingTags.join(', ')}` : ''}

请按以下JSON格式返回分析结果：
{
  "summary": "简洁的摘要（不超过100字）",
  "category": "内容分类（${Object.values(ContentCategory).join('、')}之一）",
  "tags": ["标签1", "标签2", "标签3"],
  "keyConcepts": ["关键概念1", "关键概念2"],
  "sentiment": "情感倾向（positive、neutral、negative）",
  "confidence": 0.85
}

要求：
1. 摘要要简洁明了，突出核心内容
2. 选择最合适的内容分类
3. 生成3-5个相关标签
4. 提取2-4个关键概念
5. 评估整体情感倾向
6. 给出分析结果的置信度（0-1）
`;
  }

  /**
   * 解析AI分析响应
   */
  private parseAnalysisResponse(response: string): Omit<AIAnalysisResult, keyof Pick<AIAnalysisResult, 'id' | 'noteId' | 'model' | 'provider' | 'processedAt' | 'tokens' | 'cost'>> {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || '',
        category: this.validateCategory(parsed.category),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
        keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts.slice(0, 4) : [],
        sentiment: this.validateSentiment(parsed.sentiment),
        confidence: Math.min(Math.max(parseFloat(parsed.confidence) || 0.7, 0), 1),
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);

      // 返回默认结果
      return {
        summary: response.slice(0, 100),
        category: ContentCategory.OTHER,
        tags: [],
        keyConcepts: [],
        sentiment: 'neutral',
        confidence: 0.5,
      };
    }
  }

  /**
   * 验证分类
   */
  private validateCategory(category: string): ContentCategory {
    if (Object.values(ContentCategory).includes(category as ContentCategory)) {
      return category as ContentCategory;
    }
    return ContentCategory.OTHER;
  }

  /**
   * 验证情感倾向
   */
  private validateSentiment(sentiment: string): 'positive' | 'neutral' | 'negative' {
    if (['positive', 'neutral', 'negative'].includes(sentiment)) {
      return sentiment as 'positive' | 'neutral' | 'negative';
    }
    return 'neutral';
  }

  /**
   * 获取当前AI提供商
   */
  private getCurrentProvider(): AIProvider {
    return AI_CONFIG.primaryProvider;
  }

  /**
   * 调用Ollama API
   */
  private async callOllamaAPI(prompt: string): Promise<{ text: string }> {
    const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.models.ollama.chat,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { text: data.response };
  }

  /**
   * 生成Ollama嵌入
   */
  private async generateOllamaEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.models.ollama.embedding,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  /**
   * 估算token数量（简化版）
   */
  private estimateTokens(text: string): number {
    // 简单估算：1个token约等于4个字符（中英文混合）
    return Math.ceil(text.length / 4);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例实例
export const aiService = AIService.getInstance();