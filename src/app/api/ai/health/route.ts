/**
 * AI Service Health Check API
 *
 * 检查所有AI服务提供商的健康状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiManager } from '@/lib/ai/ai-manager'

export async function GET(request: NextRequest) {
  try {
    // 执行健康检查
    const healthResults = await aiManager.healthCheck()

    // 获取配置信息
    const config = aiManager.getConfig()

    // 计算整体健康状态
    const healthyProviders = healthResults.filter(r => r.healthy)
    const overallHealth = healthyProviders.length > 0

    const response = {
      status: overallHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      summary: {
        totalProviders: healthResults.length,
        healthyProviders: healthyProviders.length,
        unhealthyProviders: healthResults.length - healthyProviders.length
      },
      config: {
        primaryProvider: config.primaryProvider,
        fallbackProviders: config.fallbackProviders,
        availableProviders: config.availableProviders
      },
      providers: healthResults,
      recommendations: generateRecommendations(healthResults)
    }

    // 设置适当的HTTP状态码
    const statusCode = overallHealth ? 200 : 503

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('AI health check error:', error)

    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: [
        '检查AI服务配置',
        '验证API密钥是否正确',
        '确认网络连接正常'
      ]
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

function generateRecommendations(healthResults: Array<{
  provider: string
  healthy: boolean
  error?: string
}>): string[] {
  const recommendations: string[] = []

  const unhealthyProviders = healthResults.filter(r => !r.healthy)

  if (unhealthyProviders.length === 0) {
    recommendations.push('所有AI服务提供商运行正常')
    return recommendations
  }

  if (unhealthyProviders.some(p => p.provider === 'ollama')) {
    recommendations.push('确保Ollama服务正在运行: docker run -d -p 11434:11434 ollama/ollama')
    recommendations.push('或者下载并安装Ollama本地版本')
  }

  if (unhealthyProviders.some(p => p.provider === 'openai')) {
    recommendations.push('检查OpenAI API密钥是否正确配置')
    recommendations.push('验证OpenAI API配额是否充足')
  }

  if (unhealthyProviders.some(p => p.provider === 'anthropic')) {
    recommendations.push('检查Anthropic API密钥是否正确配置')
    recommendations.push('验证Anthropic API访问权限')
  }

  if (unhealthyProviders.some(p => p.provider === 'zhipu')) {
    recommendations.push('检查智谱AI API密钥是否正确配置')
    recommendations.push('验证智谱AI API配额和权限')
  }

  if (unhealthyProviders.some(p => p.provider === 'deepseek')) {
    recommendations.push('检查DeepSeek API密钥是否正确配置')
    recommendations.push('验证DeepSeek API访问权限')
  }

  // 通用建议
  recommendations.push('检查网络连接和防火墙设置')
  recommendations.push('查看AI服务提供商的服务状态页面')
  recommendations.push('考虑配置更多的fallback提供商以提高可用性')

  return recommendations
}

// 支持POST请求进行详细的健康检查
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { providers, forceCheck } = body

    // 如果指定了特定提供商，只检查这些提供商
    if (providers && Array.isArray(providers)) {
      // 这里可以实现特定提供商的详细检查
      return NextResponse.json({
        status: 'not_implemented',
        message: 'Detailed provider-specific health check not implemented yet'
      }, { status: 501 })
    }

    // 强制重新检查
    if (forceCheck) {
      // 可以清除缓存并重新检查
      return NextResponse.json({
        status: 'not_implemented',
        message: 'Force health check not implemented yet'
      }, { status: 501 })
    }

    // 默认返回GET请求的结果
    return GET(request)

  } catch (error) {
    console.error('AI health check POST error:', error)

    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 })
  }
}