/**
 * CDN Management API Route
 *
 * Provides comprehensive CDN management endpoints for configuration and optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { getCDNManager, DEFAULT_CDN_CONFIGS } from '@/lib/cdn/cdn-manager'
import logger from '@/lib/utils/logger'

export interface CDNManagementRequest {
  action?: 'config' | 'stats' | 'rules' | 'purge' | 'optimize' | 'test'
  provider?: string
  config?: any
  rule?: any
  purgeOptions?: any
}

export interface CDNConfigResponse {
  success: boolean
  data?: {
    config: any
    rules: any[]
    providers: string[]
  }
  error?: string
}

export interface CDNStatsResponse {
  success: boolean
  data?: {
    stats: any
    recommendations: string[]
  }
  error?: string
}

export interface CDNOperationResponse {
  success: boolean
  data?: {
    operation: string
    result: any
    duration: number
  }
  error?: string
}

/**
 * GET - Retrieve CDN configuration and statistics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify authentication
    const session = await authOptions.adapter?.getSession?.(request)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'config'
    const provider = searchParams.get('provider')

    const cdnManager = getCDNManager()

    switch (action) {
      case 'config':
        return handleGetConfig(cdnManager, provider)

      case 'stats':
        return handleGetStats(cdnManager)

      case 'rules':
        return handleGetRules(cdnManager)

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    logger.error('CDN management GET error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST - Perform CDN management operations
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify authentication
    const session = await authOptions.adapter?.getSession?.(request)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: CDNManagementRequest = await request.json()
    const { action = 'config', provider, config, rule, purgeOptions } = body

    const cdnManager = getCDNManager()
    let response: CDNOperationResponse = { success: true }

    switch (action) {
      case 'config':
        return handleUpdateConfig(cdnManager, config)

      case 'rules':
        if (rule && rule.action === 'add') {
          return handleAddRule(cdnManager, rule)
        } else if (rule && rule.action === 'remove') {
          return handleRemoveRule(cdnManager, rule.id)
        } else if (rule && rule.action === 'update') {
          return handleUpdateRule(cdnManager, rule.id, rule.updates)
        } else if (rule && rule.action === 'toggle') {
          return handleToggleRule(cdnManager, rule.id, rule.enabled)
        }
        break

      case 'purge':
        return handlePurgeCache(cdnManager, purgeOptions)

      case 'optimize':
        return handleOptimizeCDN(cdnManager)

      case 'test':
        return handleTestConnectivity(cdnManager)

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    const duration = Date.now() - startTime
    logger.info('CDN operation completed', {
      userId: session.user.id,
      action,
      duration,
      success: response.success
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('CDN management POST error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle get configuration request
 */
async function handleGetConfig(cdnManager: any, provider?: string): Promise<NextResponse> {
  const config = provider ? DEFAULT_CDN_CONFIGS[provider] : cdnManager.getConfig()
  const rules = cdnManager.getRules()
  const providers = Object.keys(DEFAULT_CDN_CONFIGS)

  const response: CDNConfigResponse = {
    success: true,
    data: {
      config,
      rules,
      providers
    }
  }

  return NextResponse.json(response)
}

/**
 * Handle get statistics request
 */
async function handleGetStats(cdnManager: any): Promise<NextResponse> {
  const stats = await cdnManager.getStats()
  const recommendations = generateRecommendations(stats)

  const response: CDNStatsResponse = {
    success: true,
    data: {
      stats,
      recommendations
    }
  }

  return NextResponse.json(response)
}

/**
 * Handle get rules request
 */
async function handleGetRules(cdnManager: any): Promise<NextResponse> {
  const rules = cdnManager.getRules()

  return NextResponse.json({
    success: true,
    data: { rules }
  })
}

/**
 * Handle update configuration request
 */
async function handleUpdateConfig(cdnManager: any, config: any): Promise<NextResponse> {
  cdnManager.updateConfig(config)

  return NextResponse.json({
    success: true,
    data: {
      operation: 'update-config',
      result: { updated: true },
      duration: 0
    }
  })
}

/**
 * Handle add rule request
 */
async function handleAddRule(cdnManager: any, rule: any): Promise<NextResponse> {
  const newRule = cdnManager.addRule(rule)

  return NextResponse.json({
    success: true,
    data: {
      operation: 'add-rule',
      result: { rule: newRule },
      duration: 0
    }
  })
}

/**
 * Handle remove rule request
 */
async function handleRemoveRule(cdnManager: any, ruleId: string): Promise<NextResponse> {
  const success = cdnManager.removeRule(ruleId)

  return NextResponse.json({
    success,
    data: success ? {
      operation: 'remove-rule',
      result: { ruleId },
      duration: 0
    } : undefined
  })
}

/**
 * Handle update rule request
 */
async function handleUpdateRule(cdnManager: any, ruleId: string, updates: any): Promise<NextResponse> {
  const updatedRule = cdnManager.updateRule(ruleId, updates)

  return NextResponse.json({
    success: !!updatedRule,
    data: updatedRule ? {
      operation: 'update-rule',
      result: { rule: updatedRule },
      duration: 0
    } : undefined
  })
}

/**
 * Handle toggle rule request
 */
async function handleToggleRule(cdnManager: any, ruleId: string, enabled: boolean): Promise<NextResponse> {
  const success = cdnManager.toggleRule(ruleId, enabled)

  return NextResponse.json({
    success,
    data: success ? {
      operation: 'toggle-rule',
      result: { ruleId, enabled },
      duration: 0
    } : undefined
  })
}

/**
 * Handle purge cache request
 */
async function handlePurgeCache(cdnManager: any, purgeOptions: any): Promise<NextResponse> {
  const startTime = Date.now()
  const success = await cdnManager.purgeCache(purgeOptions || { everything: true })
  const duration = Date.now() - startTime

  return NextResponse.json({
    success,
    data: success ? {
      operation: 'purge-cache',
      result: { purged: true },
      duration
    } : undefined
  })
}

/**
 * Handle optimize CDN request
 */
async function handleOptimizeCDN(cdnManager: any): Promise<NextResponse> {
  const startTime = Date.now()
  await cdnManager.optimizeConfiguration()
  const duration = Date.now() - startTime

  return NextResponse.json({
    success: true,
    data: {
      operation: 'optimize-cdn',
      result: { optimized: true },
      duration
    }
  })
}

/**
 * Handle test connectivity request
 */
async function handleTestConnectivity(cdnManager: any): Promise<NextResponse> {
  const startTime = Date.now()
  const isConnected = await cdnManager.testConnectivity()
  const duration = Date.now() - startTime

  return NextResponse.json({
    success: true,
    data: {
      operation: 'test-connectivity',
      result: { connected: isConnected },
      duration
    }
  })
}

/**
 * Generate optimization recommendations based on stats
 */
function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = []

  if (!stats) {
    return ['无法获取CDN统计数据，请检查配置']
  }

  // Hit rate recommendations
  if (stats.hitRate < 0.8) {
    recommendations.push('缓存命中率较低，建议增加TTL时间或优化缓存规则')
  }

  // Response time recommendations
  if (stats.avgResponseTime > 1000) {
    recommendations.push('响应时间较长，建议启用压缩或优化边缘节点位置')
  }

  // Error rate recommendations
  if (stats.errorRate > 0.01) {
    recommendations.push('错误率较高，请检查源服务器健康状况')
  }

  // Bandwidth recommendations
  if (stats.bandwidth > 0) {
    const bandwidthGB = stats.bandwidth / (1024 * 1024 * 1024)
    if (bandwidthGB > 100) {
      recommendations.push('带宽使用量较高，建议启用图片优化或压缩')
    }
  }

  // Generic recommendations
  if (recommendations.length === 0) {
    recommendations.push('CDN配置良好，性能指标正常')
  }

  return recommendations
}