// AI服务健康检查API

import { NextRequest, NextResponse } from 'next/server'
import { aiConfig } from '@/lib/ai/config'
import { validateAIConfig } from '@/lib/ai/config'
import { logger } from '@/lib/ai/services'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    logger.info('AI健康检查请求开始')

    // 验证配置
    const configValidation = validateAIConfig()

    // 检查AI服务提供商状态
    const providerStatuses = await Promise.allSettled([
      checkOpenAIHealth(),
      checkAnthropicHealth()
    ])

    const overallHealth = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: Date.now() - startTime,
      config: {
        isValid: configValidation.isValid,
        errors: configValidation.errors,
        settings: {
          defaultProvider: aiConfig.settings.defaultProvider,
          defaultModel: aiConfig.settings.defaultModel,
          fallbackEnabled: aiConfig.settings.fallbackEnabled,
          embeddingModel: aiConfig.settings.embeddingModel
        }
      },
      providers: {
        openai: getProviderStatus(providerStatuses[0]),
        anthropic: getProviderStatus(providerStatuses[1])
      },
      metrics: {
        requestsPerSecond: 0, // 需要从实际监控系统获取
        averageResponseTime: 0,
        errorRate: 0,
        activeAnalyses: 0
      }
    }

    // 确定整体健康状态
    if (!configValidation.isValid) {
      overallHealth.status = 'unhealthy'
    } else if (providerStatuses.some(result => result.status === 'rejected')) {
      overallHealth.status = 'degraded'
    }

    logger.info('AI健康检查完成', {
      status: overallHealth.status,
      responseTime: overallHealth.responseTime,
      configValid: configValidation.isValid
    })

    return NextResponse.json(overallHealth)

  } catch (error) {
    const responseTime = Date.now() - startTime

    logger.error('AI健康检查失败', {
      error: error.message,
      responseTime
    })

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime
    }, { status: 500 })
  }
}

async function checkOpenAIHealth(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number; error?: string }> {
  const startTime = Date.now()

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      signal: AbortSignal.timeout(5000)
    })

    const responseTime = Date.now() - startTime

    if (response.ok) {
      return { status: 'healthy', responseTime }
    } else {
      return {
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    }
  }
}

async function checkAnthropicHealth(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number; error?: string }> {
  const startTime = Date.now()

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      }),
      signal: AbortSignal.timeout(5000)
    })

    const responseTime = Date.now() - startTime

    if (response.ok || response.status === 400) { // 400也算健康，说明API可达
      return { status: 'healthy', responseTime }
    } else {
      return {
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message
    }
  }
}

function getProviderStatus(result: PromiseSettledResult<{ status: 'healthy' | 'unhealthy'; responseTime: number; error?: string }>) {
  if (result.status === 'fulfilled') {
    return {
      status: result.value.status,
      responseTime: result.value.responseTime,
      error: result.value.error,
      lastCheck: new Date().toISOString()
    }
  } else {
    return {
      status: 'unhealthy' as const,
      responseTime: 0,
      error: result.reason?.message || 'Unknown error',
      lastCheck: new Date().toISOString()
    }
  }
}