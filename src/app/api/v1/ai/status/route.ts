/**
 * AI服务状态API路由
 *
 * GET /api/v1/ai/status - 获取AI服务提供商状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIServiceOrchestrator } from '@/lib/ai/orchestrator';

// 创建AI服务编排器
const aiOrchestrator = new AIServiceOrchestrator({
  primaryProvider: process.env.AI_PRIMARY_PROVIDER || 'openai',
  fallbackProviders: (
    process.env.AI_FALLBACK_PROVIDERS || 'zhipu,deepseek'
  ).split(','),
  maxRetries: 3,
  timeoutMs: 30000,
  enableLoadBalancing: true,
  costOptimization: true,
  qualityThreshold: 0.8,
});

/**
 * 获取AI服务提供商状态
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 },
      );
    }

    // 2. 获取提供商状态
    const providerStatus = await aiOrchestrator.getProviderStatus();

    // 3. 获取使用统计
    const period =
      (new URL(request.url).searchParams.get('period') as
        | 'day'
        | 'week'
        | 'month') || 'day';
    const usageStats = aiOrchestrator.getUsageStats(period);

    // 4. 测试所有提供商
    const testResults = await aiOrchestrator.testProviders();

    // 5. 获取推荐提供商
    const recommendedProvider = aiOrchestrator.getRecommendedProvider();

    // 6. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        providers: providerStatus,
        usage: usageStats,
        testResults,
        recommendedProvider,
        timestamp: new Date().toISOString(),
      },
      message: 'AI service status retrieved successfully',
    });
  } catch (error) {
    console.error('Error getting AI service status:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'An unexpected error occurred while retrieving AI service status',
        },
      },
      { status: 500 },
    );
  }
}

/**
 * 重置AI服务统计
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 },
      );
    }

    // 2. 重置统计
    aiOrchestrator.resetStats();

    // 3. 返回成功响应
    return NextResponse.json({
      success: true,
      data: { message: 'AI service statistics reset successfully' },
      message: 'Statistics reset successfully',
    });
  } catch (error) {
    console.error('Error resetting AI service statistics:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while resetting statistics',
        },
      },
      { status: 500 },
    );
  }
}
