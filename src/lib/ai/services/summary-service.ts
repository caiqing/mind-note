/**
 * 内容摘要生成服务 - T103.3
 * 统一的摘要生成服务，支持多AI提供商
 */

import { AnalysisProvider } from '@/types/ai-analysis';
import { createOpenAIProviderV2 } from '../providers/openai-provider-v2';
import { createClaudeProvider } from '../providers/claude-provider';
import { aiConfig } from '../ai-config';

export interface SummaryRequest {
  content: string;
  maxLength?: number;
  style?: 'paragraph' | 'bullet' | 'key-points';
  language?: 'zh' | 'en';
  focus?: string[];
  preferredProvider?: string;
  userId: string;
}

export interface SummaryResult {
  summary: string;
  provider: string;
  model: string;
  processingTime: number;
  cost: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  quality: {
    score: number; // 0-1
    length: number;
    adherence: number; // 是否遵守长度限制
  };
  metadata: {
    requestId: string;
    processedAt: Date;
    version: string;
  };
}

export class SummaryService {
  private providers: Map<string, AnalysisProvider> = new Map();
  private fallbackOrder: string[];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // 初始化可用的提供商
    try {
      const openaiProvider = createOpenAIProviderV2();
      this.providers.set('openai', openaiProvider);
      console.log('✅ OpenAI provider initialized');
    } catch (error) {
      console.warn('⚠️ OpenAI provider not available:', error);
    }

    try {
      const claudeProvider = createClaudeProvider();
      this.providers.set('anthropic', claudeProvider);
      console.log('✅ Claude provider initialized');
    } catch (error) {
      console.warn('⚠️ Claude provider not available:', error);
    }

    // 设置fallback顺序
    this.fallbackOrder = aiConfig.getFallbackOrder().filter(provider =>
      this.providers.has(provider)
    );

    if (this.fallbackOrder.length === 0) {
      throw new Error('No AI providers available for summary generation');
    }

    console.log(`📋 Available providers: ${this.fallbackOrder.join(', ')}`);
  }

  async generateSummary(request: SummaryRequest): Promise<SummaryResult> {
    const requestId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`🎯 Generating summary (Request: ${requestId})`);
    console.log(`Content length: ${request.content.length} characters`);
    console.log(`Preferred provider: ${request.preferredProvider || 'auto'}`);

    let lastError: Error | null = null;

    // 尝试按优先级顺序使用提供商
    const providersToTry = request.preferredProvider && this.providers.has(request.preferredProvider)
      ? [request.preferredProvider, ...this.fallbackOrder.filter(p => p !== request.preferredProvider)]
      : this.fallbackOrder;

    for (const providerName of providersToTry) {
      try {
        console.log(`🔄 Trying provider: ${providerName}`);

        const provider = this.providers.get(providerName)!;
        const result = await this.generateSummaryWithProvider(provider, request, requestId);

        console.log(`✅ Summary generated successfully with ${providerName}`);
        return result;

      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Provider ${providerName} failed:`, error);

        // 如果不是最后一个提供商，继续尝试下一个
        if (providersToTry.indexOf(providerName) < providersToTry.length - 1) {
          console.log(`🔄 Falling back to next provider...`);
          continue;
        }
      }
    }

    // 所有提供商都失败了
    throw new Error(`All providers failed to generate summary. Last error: ${lastError?.message}`);
  }

  private async generateSummaryWithProvider(
    provider: AnalysisProvider,
    request: SummaryRequest,
    requestId: string
  ): Promise<SummaryResult> {
    const startTime = Date.now();

    // 构建提示模板
    const prompt = this.buildPrompt(request);

    // 生成摘要
    const summary = await provider.generateSummary(prompt);

    const processingTime = Date.now() - startTime;

    // 计算质量指标
    const quality = this.calculateQuality(summary, request);

    // 估算成本
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = this.estimateTokens(summary);
    const cost = aiConfig.calculateCost(provider.name, 'default-model', inputTokens, outputTokens);

    return {
      summary: summary.trim(),
      provider: provider.name,
      model: 'default-model', // 实际应该从provider获取
      processingTime,
      cost,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      quality,
      metadata: {
        requestId,
        processedAt: new Date(),
        version: '1.0.0',
      },
    };
  }

  private buildPrompt(request: SummaryRequest): string {
    const {
      content,
      maxLength = 100,
      style = 'paragraph',
      language = 'zh',
      focus = [],
    } = request;

    let prompt = `请为以下内容生成一个简洁的摘要：\n\n`;

    // 添加内容
    prompt += `${content}\n\n`;

    // 添加摘要要求
    prompt += `摘要要求：\n`;
    prompt += `1. 长度控制在${maxLength}字以内\n`;
    prompt += `2. 概括主要内容，突出关键信息\n`;
    prompt += `3. 保持客观准确，语言简洁明了\n`;
    prompt += `4. 使用${language === 'zh' ? '中文' : '英文'}\n`;

    // 添加特定风格要求
    switch (style) {
      case 'bullet':
        prompt += `5. 使用要点形式（• 项目符号）\n`;
        break;
      case 'key-points':
        prompt += `5. 提取关键要点，每点一行\n`;
        break;
      default:
        prompt += `5. 使用段落形式\n`;
    }

    // 添加重点要求
    if (focus.length > 0) {
      prompt += `6. 特别关注以下方面：${focus.join('、')}\n`;
    }

    prompt += `\n摘要：`;

    return prompt;
  }

  private calculateQuality(summary: string, request: SummaryRequest): SummaryResult['quality'] {
    const maxLength = request.maxLength || 100;
    const actualLength = summary.length;

    // 长度评分 (0-1)
    let lengthScore = 1.0;
    if (actualLength > maxLength) {
      const excess = actualLength - maxLength;
      lengthScore = Math.max(0, 1 - (excess / maxLength));
    } else if (actualLength < maxLength * 0.3) {
      // 太短的摘要质量较低
      lengthScore = actualLength / (maxLength * 0.3);
    }

    // 遵守度评分 (0-1)
    const adherenceScore = actualLength <= maxLength ? 1.0 : lengthScore;

    // 综合质量评分
    const score = (lengthScore * 0.4 + adherenceScore * 0.6);

    return {
      score: Math.round(score * 100) / 100, // 保留两位小数
      length: actualLength,
      adherence: adherenceScore,
    };
  }

  private estimateTokens(text: string): number {
    // 简化的token估算
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  // 批量摘要生成
  async generateBatchSummaries(requests: SummaryRequest[]): Promise<SummaryResult[]> {
    console.log(`📦 Processing ${requests.length} summary requests...`);

    const results: SummaryResult[] = [];
    const batchSize = 3; // 控制并发数

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);

      const batchPromises = batch.map(request =>
        this.generateSummary(request).catch(error => {
          console.error(`❌ Failed to generate summary for content:`, error);
          return null;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null) as SummaryResult[]);
    }

    console.log(`✅ Batch processing completed. ${results.length}/${requests.length} summaries generated.`);
    return results;
  }

  // 获取可用的提供商列表
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // 检查服务健康状态
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; providers: string[]; details: any }> {
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      return {
        status: 'unhealthy',
        providers: [],
        details: { error: 'No providers available' }
      };
    }

    if (availableProviders.length === 1) {
      return {
        status: 'degraded',
        providers: availableProviders,
        details: { warning: 'Only one provider available' }
      };
    }

    return {
      status: 'healthy',
      providers: availableProviders,
      details: { fallbackOrder: this.fallbackOrder }
    };
  }

  // 获取服务统计信息
  getStats(): {
    totalProviders: number;
    availableProviders: number;
    fallbackOrder: string[];
    supportedLanguages: string[];
    supportedStyles: string[];
  } {
    return {
      totalProviders: this.providers.size,
      availableProviders: this.getAvailableProviders().length,
      fallbackOrder: this.fallbackOrder,
      supportedLanguages: ['zh', 'en'],
      supportedStyles: ['paragraph', 'bullet', 'key-points'],
    };
  }
}

// 单例实例
export const summaryService = new SummaryService();

// 工厂函数
export function createSummaryService(): SummaryService {
  return new SummaryService();
}