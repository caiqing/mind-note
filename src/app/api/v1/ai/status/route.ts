/**
 * AI服务状态检查API
 *
 * GET /api/v1/ai/status - 检查AI服务配置和可用性
 */

import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai/ai-service';
import { AI_CONFIG, AI_FEATURES } from '@/lib/ai/ai-config';

export async function GET(request: NextRequest) {
  try {
    // 验证AI服务配置
    const configValidation = aiService.validateConfig();

    // 获取服务统计
    const stats = aiService.getStats();

    // 检查各AI提供商的可用性
    const providers = {
      openai: {
        available: !!process.env.OPENAI_API_KEY,
        model: AI_CONFIG.models.openai.chat,
        embeddingModel: AI_CONFIG.models.openai.embedding,
        features: ['text-generation', 'embedding'],
      },
      anthropic: {
        available: !!process.env.ANTHROPIC_API_KEY,
        model: AI_CONFIG.models.anthropic.chat,
        embeddingModel: null, // Anthropic不提供嵌入服务
        features: ['text-generation'],
      },
      ollama: {
        available: true, // Ollama总是可用的（如果本地运行）
        model: AI_CONFIG.models.ollama.chat,
        embeddingModel: AI_CONFIG.models.ollama.embedding,
        features: ['text-generation', 'embedding'],
        local: true,
      },
    };

    // 计算配置健康度
    const healthScore = calculateHealthScore(configValidation, providers, stats);

    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      config: {
        enabled: AI_CONFIG.enabled,
        primaryProvider: AI_CONFIG.primaryProvider,
        fallbackProvider: AI_CONFIG.fallbackProvider,
        validation: configValidation,
        healthScore,
      },
      features: AI_FEATURES,
      providers,
      stats: {
        ...stats,
        successRate: stats.totalRequests > 0
          ? (stats.successfulRequests / stats.totalRequests * 100).toFixed(2) + '%'
          : '0%',
        averageCost: stats.successfulRequests > 0
          ? '$' + (stats.totalCost / stats.successfulRequests).toFixed(6)
          : '$0',
      },
      limits: {
        maxTokens: AI_CONFIG.maxTokens,
        timeout: AI_CONFIG.timeout + 'ms',
        dailyBudget: '$' + AI_CONFIG.dailyBudgetUSD,
        costPerNote: '$' + AI_CONFIG.costPerNoteLimit,
        rateLimit: AI_CONFIG.rateLimitRPM + '/min',
      },
    };

    // 如果配置无效，标记为不健康
    if (!configValidation.isValid) {
      status.status = 'unhealthy';
    }

    // 如果没有可用的提供商，标记为降级
    const availableProviders = Object.values(providers).filter(p => p.available);
    if (availableProviders.length === 0) {
      status.status = 'degraded';
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error('AI status check failed:', error);

    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        enabled: AI_CONFIG.enabled,
        primaryProvider: AI_CONFIG.primaryProvider,
      },
    }, { status: 500 });
  }
}

/**
 * 计算配置健康度分数
 */
function calculateHealthScore(
  validation: { isValid: boolean; errors: string[] },
  providers: any,
  stats: any
): number {
  let score = 100;

  // 配置验证扣分
  if (!validation.isValid) {
    score -= validation.errors.length * 10;
  }

  // 提供商可用性扣分
  const availableProviders = Object.values(providers).filter((p: any) => p.available);
  score -= (3 - availableProviders.length) * 15;

  // 成功率扣分
  if (stats.totalRequests > 0) {
    const successRate = stats.successfulRequests / stats.totalRequests;
    score -= (1 - successRate) * 20;
  }

  // 成本控制检查
  if (stats.dailyCost > AI_CONFIG.dailyBudgetUSD * 0.8) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}
