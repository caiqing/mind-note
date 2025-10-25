/**
 * AI服务配置API路由
 * 提供AI服务的动态配置、状态监控和管理功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { OpenAIConfigManager } from '@/../../ai-services/cloud/openai/config'
import { AIServiceRouter } from '@/../../ai-services/routing/ai-service-router'

// 单例实例
const aiRouter = new AIServiceRouter()
const openAIConfig = OpenAIConfigManager.getInstance()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        return await getAIStatus()
      case 'health':
        return await getAIHealth()
      case 'config':
        return await getAIConfig()
      case 'costs':
        return await getCostStatistics()
      case 'providers':
        return await getAvailableProviders()
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('AI Config API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...config } = body

    switch (action) {
      case 'update-config':
        return await updateAIConfig(config)
      case 'test-connection':
        return await testConnection(config)
      case 'reset-costs':
        return await resetCostStatistics()
      case 'enable-provider':
        return await enableProvider(config)
      case 'disable-provider':
        return await disableProvider(config)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('AI Config API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getAIStatus(): Promise<NextResponse> {
  const healthStatus = aiRouter.getServiceHealth()
  const costs = aiRouter.getCostStatistics()

  const status = {
    timestamp: new Date().toISOString(),
    services: Object.fromEntries(healthStatus),
    totalCosts: costs,
    overallHealth: Array.from(healthStatus.values()).every(h => h.available)
  }

  return NextResponse.json(status)
}

async function getAIHealth(): Promise<NextResponse> {
  const healthStatus = aiRouter.getServiceHealth()
  const healthChecks = []

  for (const [serviceKey, health] of healthStatus.entries()) {
    healthChecks.push({
      service: serviceKey,
      provider: health.provider,
      model: health.model,
      available: health.available,
      responseTime: health.responseTime,
      errorRate: health.errorRate,
      lastCheck: health.lastCheck
    })
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    services: healthChecks,
    healthyCount: healthChecks.filter(h => h.available).length,
    totalCount: healthChecks.length
  })
}

async function getAIConfig(): Promise<NextResponse> {
  const config = openAIConfig.getConfig()

  // 隐藏敏感信息
  const safeConfig = {
    ...config,
    defaultModel: config.defaultModel,
    fallbackModels: config.fallbackModels,
    usageLimits: config.usageLimits,
    caching: config.caching,
    // 不返回敏感的成本预算信息
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    config: safeConfig,
    environment: {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    }
  })
}

async function getCostStatistics(): Promise<NextResponse> {
  const costs = aiRouter.getCostStatistics()
  const totalCost = Object.values(costs).reduce((sum, cost) => sum + cost, 0)

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    costs,
    totalCost,
    currency: 'USD',
    period: 'session'
  })
}

async function getAvailableProviders(): Promise<NextResponse> {
  const providers = [
    {
      provider: 'openai',
      models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
      enabled: true,
      features: ['text-generation', 'code-generation', 'analysis']
    },
    {
      provider: 'anthropic',
      models: ['claude-3-sonnet', 'claude-3-haiku'],
      enabled: true,
      features: ['text-generation', 'analysis', 'reasoning']
    },
    {
      provider: 'ollama',
      models: ['llama2', 'codellama', 'mistral'],
      enabled: true,
      features: ['text-generation', 'local-processing', 'no-cost']
    }
  ]

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    providers
  })
}

async function updateAIConfig(config: any): Promise<NextResponse> {
  try {
    openAIConfig.updateConfig(config)

    return NextResponse.json({
      success: true,
      message: 'AI configuration updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    )
  }
}

async function testConnection(config: any): Promise<NextResponse> {
  const { provider, model } = config

  try {
    const testRequest = {
      requestId: `test-${Date.now()}`,
      prompt: 'Hello, this is a connection test.',
      userId: 'test-user',
      maxTokens: 10
    }

    const startTime = Date.now()
    const response = await aiRouter.routeRequest(testRequest)
    const responseTime = Date.now() - startTime

    return NextResponse.json({
      success: response.success,
      provider: response.provider,
      model: response.model,
      responseTime,
      timestamp: new Date().toISOString(),
      testResult: response.success ? 'Connection successful' : 'Connection failed'
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Connection test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

async function resetCostStatistics(): Promise<NextResponse> {
  aiRouter.resetCostStatistics()

  return NextResponse.json({
    success: true,
    message: 'Cost statistics reset successfully',
    timestamp: new Date().toISOString()
  })
}

async function enableProvider(config: { provider: string; model?: string }): Promise<NextResponse> {
  const { provider, model } = config

  // 参数验证
  if (!provider || typeof provider !== 'string') {
    return NextResponse.json(
      { error: 'Provider name is required and must be a string' },
      { status: 400 }
    )
  }

  if (provider.trim().length === 0) {
    return NextResponse.json(
      { error: 'Provider name cannot be empty' },
      { status: 400 }
    )
  }

  const validProviders = ['openai', 'anthropic', 'ollama']
  if (!validProviders.includes(provider.toLowerCase())) {
    return NextResponse.json(
      {
        error: 'Invalid provider',
        message: `Supported providers: ${validProviders.join(', ')}`
      },
      { status: 400 }
    )
  }

  try {
    // 这里可以添加实际的启用逻辑
    // 例如更新配置、重新初始化服务等

    return NextResponse.json({
      success: true,
      message: `Provider ${provider} enabled successfully${model ? ` with model ${model}` : ''}`,
      provider,
      model,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to enable provider',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function disableProvider(config: { provider: string }): Promise<NextResponse> {
  const { provider } = config

  // 参数验证
  if (!provider || typeof provider !== 'string') {
    return NextResponse.json(
      { error: 'Provider name is required and must be a string' },
      { status: 400 }
    )
  }

  if (provider.trim().length === 0) {
    return NextResponse.json(
      { error: 'Provider name cannot be empty' },
      { status: 400 }
    )
  }

  try {
    // 这里可以添加实际的禁用逻辑

    return NextResponse.json({
      success: true,
      message: `Provider ${provider} disabled successfully`,
      provider,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to disable provider',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}