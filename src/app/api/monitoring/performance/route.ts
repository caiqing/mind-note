/**
 * Performance Monitoring API Route
 *
 * Provides real-time performance monitoring and alerting
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authOptions } from '@/lib/auth/auth'
import { performanceMonitor } from '@/lib/monitoring/performance-monitor'
import logger from '@/lib/utils/logger'

export interface MonitoringRequest {
  action?: 'record' | 'acknowledge' | 'resolve' | 'export' | 'health'
  metric?: {
    name: string
    value: number
    unit: string
    tags?: Record<string, string>
  }
  alertId?: string
  timeRange?: {
    start: string
    end: string
  }
  options?: {
    severity?: 'info' | 'warning' | 'error' | 'critical'
    acknowledged?: boolean
    resolved?: boolean
    limit?: number
  }
}

export interface MonitoringResponse {
  success: boolean
  data?: {
    health?: any
    metrics?: any
    alerts?: any
    thresholds?: any
    stats?: any
    exportData?: any
    operationResult?: {
      success: boolean
      message?: string
    }
  }
  error?: string
}

export async function POST(request: NextRequest) {
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
    const body: MonitoringRequest = await request.json()
    const { action, metric, alertId, timeRange, options = {} } = body

    let response: MonitoringResponse = { success: true }

    switch (action) {
      case 'record':
        if (!metric) {
          return NextResponse.json(
            { success: false, error: 'Metric data is required for record action' },
            { status: 400 }
          )
        }

        performanceMonitor.recordMetric(
          metric.name,
          metric.value,
          metric.unit,
          metric.tags
        )

        response.data = {
          operationResult: {
            success: true,
            message: `Metric ${metric.name} recorded successfully`
          }
        }
        break

      case 'acknowledge':
        if (!alertId) {
          return NextResponse.json(
            { success: false, error: 'Alert ID is required for acknowledge action' },
            { status: 400 }
          )
        }

        const acknowledged = performanceMonitor.acknowledgeAlert(alertId)
        response.data = {
          operationResult: {
            success: acknowledged,
            message: acknowledged ? 'Alert acknowledged' : 'Alert not found'
          }
        }
        break

      case 'resolve':
        if (!alertId) {
          return NextResponse.json(
            { success: false, error: 'Alert ID is required for resolve action' },
            { status: 400 }
          )
        }

        const resolved = performanceMonitor.resolveAlert(alertId)
        response.data = {
          operationResult: {
            success: resolved,
            message: resolved ? 'Alert resolved' : 'Alert not found'
          }
        }
        break

      case 'health':
        const health = performanceMonitor.getSystemHealth()
        response.data = { health }
        break

      case 'export':
        const exportData = performanceMonitor.exportData()
        response.data = { exportData }
        break

      default:
        // If no action specified, return general monitoring data
        const systemHealth = performanceMonitor.getSystemHealth()
        const recentAlerts = performanceMonitor.getAlerts({
          limit: 10,
          resolved: false
        })
        const thresholds = performanceMonitor.getThresholds()

        response.data = {
          health: systemHealth,
          alerts: recentAlerts,
          thresholds
        }
    }

    // Handle specific data requests
    if (!action && !response.data?.health) {
      const { timeRange: range, options: opts } = body

      if (range?.start && range?.end) {
        const startDate = new Date(range.start)
        const endDate = new Date(range.end)

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          // Get metrics for the specified time range
          const allMetrics = {}
          const metricNames = ['response_time', 'error_rate', 'memory_usage', 'cpu_usage', 'search_query_time']

          metricNames.forEach(name => {
            const metrics = performanceMonitor.getMetrics(name, {
              start: startDate,
              end: endDate
            })
            if (metrics.length > 0) {
              allMetrics[name] = {
                data: metrics,
                stats: performanceMonitor.getMetricStats(name, {
                  start: startDate,
                  end: endDate
                })
              }
            }
          })

          response.data.metrics = allMetrics

          // Get alerts for the time range
          const timeRangeAlerts = performanceMonitor.getAlerts({
            timeRange: { start: startDate, end: endDate },
            ...opts
          })

          response.data.alerts = timeRangeAlerts
        }
      }
    }

    logger.info('Performance monitoring API request completed', {
      userId: session.user.id,
      action,
      success: response.success
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Performance monitoring API error:', error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get basic health and monitoring data
    const health = performanceMonitor.getSystemHealth()
    const recentAlerts = performanceMonitor.getAlerts({
      limit: 5,
      resolved: false
    })
    const thresholds = performanceMonitor.getThresholds()

    const response: MonitoringResponse = {
      success: true,
      data: {
        health,
        alerts: recentAlerts,
        thresholds
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Performance monitoring GET error:', error)

    return NextResponse.json(
      { success: false, error: 'Failed to fetch monitoring data' },
      { status: 500 }
    )
  }
}