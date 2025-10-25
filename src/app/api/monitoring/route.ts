/**
 * AI服务监控API路由
 * 提供AI服务的实时监控、性能指标和健康状态检查
 */

import { NextRequest, NextResponse } from 'next/server'
import { AIServiceRouter } from '@/../../ai-services/routing/ai-service-router'

// 单例实例
const aiRouter = new AIServiceRouter()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const service = searchParams.get('service')

    switch (action) {
      case 'overview':
        return await getMonitoringOverview()
      case 'performance':
        return await getPerformanceMetrics(service)
      case 'health':
        return await getHealthStatus(service)
      case 'alerts':
        return await getAlerts()
      case 'metrics':
        return await getDetailedMetrics(service)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('AI Monitoring API Error:', error)
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
    const { action, ...data } = body

    switch (action) {
      case 'register-alert':
        return await registerAlert(data)
      case 'acknowledge-alert':
        return await acknowledgeAlert(data)
      case 'test-performance':
        return await testPerformance(data)
      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('AI Monitoring API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getMonitoringOverview(): Promise<NextResponse> {
  const healthStatus = aiRouter.getServiceHealth()
  const costs = aiRouter.getCostStatistics()

  const totalServices = Array.from(healthStatus.values()).length
  const healthyServices = Array.from(healthStatus.values()).filter(h => h.available).length
  const totalCost = Object.values(costs).reduce((sum, cost) => sum + cost, 0)

  // 计算平均响应时间
  const responseTimes = Array.from(healthStatus.values()).map(h => h.responseTime).filter(t => t > 0)
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0

  // 计算错误率
  const errorRates = Array.from(healthStatus.values()).map(h => h.errorRate)
  const avgErrorRate = errorRates.length > 0
    ? errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length
    : 0

  const overview = {
    timestamp: new Date().toISOString(),
    summary: {
      totalServices,
      healthyServices,
      unhealthyServices: totalServices - healthyServices,
      overallHealth: healthyServices === totalServices ? 'healthy' : 'degraded'
    },
    performance: {
      avgResponseTime: Math.round(avgResponseTime),
      avgErrorRate: Math.round(avgErrorRate * 100) / 100
    },
    costs: {
      totalCost: Math.round(totalCost * 10000) / 10000,
      currency: 'USD'
    },
    alerts: {
      critical: 0, // 这里应该从实际的告警系统获取
      warning: 0,
      info: 0
    }
  }

  return NextResponse.json(overview)
}

async function getPerformanceMetrics(service?: string | null): Promise<NextResponse> {
  const healthStatus = aiRouter.getServiceHealth()
  const costs = aiRouter.getCostStatistics()

  let metrics: any[] = []

  if (service) {
    // 返回特定服务的指标
    const health = healthStatus.get(service)
    const cost = costs[service] || 0

    if (health) {
      metrics = [{
        service,
        provider: health.provider,
        model: health.model,
        responseTime: health.responseTime,
        errorRate: health.errorRate,
        availability: health.available ? 1 : 0,
        cost,
        lastCheck: health.lastCheck,
        performanceHistory: aiRouter.getServicePerformanceHistory(service)
      }]
    }
  } else {
    // 返回所有服务的指标
    for (const [serviceKey, health] of healthStatus.entries()) {
      metrics.push({
        service: serviceKey,
        provider: health.provider,
        model: health.model,
        responseTime: health.responseTime,
        errorRate: health.errorRate,
        availability: health.available ? 1 : 0,
        cost: costs[serviceKey] || 0,
        lastCheck: health.lastCheck,
        performanceHistory: aiRouter.getServicePerformanceHistory(serviceKey)
      })
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    metrics,
    summary: {
      count: metrics.length,
      avgResponseTime: metrics.length > 0
        ? Math.round(metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length)
        : 0,
      avgErrorRate: metrics.length > 0
        ? Math.round(metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length * 100) / 100
        : 0,
      totalCost: Math.round(metrics.reduce((sum, m) => sum + m.cost, 0) * 10000) / 10000
    }
  })
}

async function getHealthStatus(service?: string | null): Promise<NextResponse> {
  const healthStatus = aiRouter.getServiceHealth()

  let healthData: any[]

  if (service) {
    const health = healthStatus.get(service)
    healthData = health ? [{
      service,
      ...health,
      status: health.available ? 'healthy' : 'unhealthy',
      issues: health.available ? [] : ['Service unavailable']
    }] : []
  } else {
    healthData = Array.from(healthStatus.entries()).map(([serviceKey, health]) => ({
      service: serviceKey,
      ...health,
      status: health.available ? 'healthy' : 'unhealthy',
      issues: health.available ? [] : ['Service unavailable']
    }))
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    services: healthData,
    summary: {
      total: healthData.length,
      healthy: healthData.filter(h => h.status === 'healthy').length,
      unhealthy: healthData.filter(h => h.status === 'unhealthy').length
    }
  })
}

async function getAlerts(): Promise<NextResponse> {
  // 模拟告警数据
  const alerts = [
    {
      id: 'alert-001',
      type: 'warning',
      service: 'openai-gpt-4',
      message: 'Response time elevated',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      acknowledged: false
    },
    {
      id: 'alert-002',
      type: 'info',
      service: 'anthropic-claude',
      message: 'Service operating normally',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      acknowledged: true
    }
  ]

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    alerts,
    summary: {
      critical: alerts.filter(a => a.type === 'critical').length,
      warning: alerts.filter(a => a.type === 'warning').length,
      info: alerts.filter(a => a.type === 'info').length,
      total: alerts.length
    }
  })
}

async function getDetailedMetrics(service?: string | null): Promise<NextResponse> {
  const healthStatus = aiRouter.getServiceHealth()
  const costs = aiRouter.getCostStatistics()

  const detailedMetrics = {
    timestamp: new Date().toISOString(),
    services: {}
  }

  for (const [serviceKey, health] of healthStatus.entries()) {
    if (!service || serviceKey === service) {
      const performanceHistory = aiRouter.getServicePerformanceHistory(serviceKey)

      detailedMetrics.services[serviceKey] = {
        provider: health.provider,
        model: health.model,
        current: {
          responseTime: health.responseTime,
          errorRate: health.errorRate,
          available: health.available,
          lastCheck: health.lastCheck
        },
        history: {
          performance: performanceHistory,
          avgResponseTime: performanceHistory.length > 0
            ? Math.round(performanceHistory.reduce((sum, time) => sum + time, 0) / performanceHistory.length)
            : 0,
          minResponseTime: performanceHistory.length > 0 ? Math.min(...performanceHistory) : 0,
          maxResponseTime: performanceHistory.length > 0 ? Math.max(...performanceHistory) : 0,
          requestCount: performanceHistory.length
        },
        costs: {
          total: costs[serviceKey] || 0,
          currency: 'USD'
        }
      }
    }
  }

  return NextResponse.json(detailedMetrics)
}

async function registerAlert(data: any): Promise<NextResponse> {
  const { type, service, message, threshold } = data

  // 这里应该实现告警注册逻辑
  // 由于没有实际的告警系统，这里返回一个占位响应

  const alertId = `alert-${Date.now()}`

  return NextResponse.json({
    success: true,
    alertId,
    message: 'Alert registered successfully',
    timestamp: new Date().toISOString()
  })
}

async function acknowledgeAlert(data: any): Promise<NextResponse> {
  const { alertId } = data

  // 这里应该实现告警确认逻辑

  return NextResponse.json({
    success: true,
    message: `Alert ${alertId} acknowledged`,
    timestamp: new Date().toISOString()
  })
}

async function testPerformance(data: any): Promise<NextResponse> {
  const { service, iterations = 5 } = data

  try {
    const testRequests = []
    const results = []

    for (let i = 0; i < iterations; i++) {
      const testRequest = {
        requestId: `perf-test-${Date.now()}-${i}`,
        prompt: `Performance test ${i + 1}`,
        userId: 'performance-test',
        maxTokens: 50
      }

      testRequests.push(testRequest)
    }

    const startTime = Date.now()

    for (const request of testRequests) {
      const reqStart = Date.now()
      const response = await aiRouter.routeRequest(request)
      const reqTime = Date.now() - reqStart

      results.push({
        requestId: request.requestId,
        success: response.success,
        provider: response.provider,
        model: response.model,
        responseTime: reqTime,
        cost: response.cost,
        tokens: response.tokens
      })
    }

    const totalTime = Date.now() - startTime
    const successfulRequests = results.filter(r => r.success)
    const avgResponseTime = successfulRequests.length > 0
      ? Math.round(successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length)
      : 0
    const totalCost = successfulRequests.reduce((sum, r) => sum + r.cost, 0)

    return NextResponse.json({
      success: true,
      testResults: {
        iterations,
        successful: successfulRequests.length,
        failed: iterations - successfulRequests.length,
        totalTime,
        avgResponseTime,
        totalCost: Math.round(totalCost * 10000) / 10000,
        results
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Performance test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}