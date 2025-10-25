/**
 * Comprehensive Performance Monitoring System
 *
 * Provides real-time monitoring and alerting for application performance
 */

import logger from '@/lib/utils/logger'

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: Date
  tags?: Record<string, string>
}

export interface PerformanceAlert {
  id: string
  type: 'threshold' | 'trend' | 'anomaly'
  severity: 'info' | 'warning' | 'error' | 'critical'
  metric: string
  value: number
  threshold?: number
  message: string
  timestamp: Date
  acknowledged: boolean
  resolved: boolean
}

export interface PerformanceThreshold {
  metric: string
  warning: number
  error: number
  critical: number
  unit: string
  enabled: boolean
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  responseTime: number
  errorRate: number
  throughput: number
  memoryUsage: number
  cpuUsage: number
  lastUpdated: Date
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private thresholds: Map<string, PerformanceThreshold> = new Map()
  private alerts: PerformanceAlert[] = []
  private subscribers: Set<(alert: PerformanceAlert) => void> = new Set()
  private startTime: Date = new Date()
  private healthCheckInterval?: NodeJS.Timeout

  constructor() {
    this.initializeDefaultThresholds()
    this.startHealthChecks()
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeDefaultThresholds(): void {
    const defaultThresholds: PerformanceThreshold[] = [
      {
        metric: 'response_time',
        warning: 500,
        error: 1000,
        critical: 2000,
        unit: 'ms',
        enabled: true
      },
      {
        metric: 'error_rate',
        warning: 0.05,
        error: 0.1,
        critical: 0.2,
        unit: '%',
        enabled: true
      },
      {
        metric: 'memory_usage',
        warning: 0.7,
        error: 0.85,
        critical: 0.95,
        unit: '%',
        enabled: true
      },
      {
        metric: 'cpu_usage',
        warning: 0.7,
        error: 0.85,
        critical: 0.95,
        unit: '%',
        enabled: true
      },
      {
        metric: 'search_query_time',
        warning: 300,
        error: 800,
        critical: 1500,
        unit: 'ms',
        enabled: true
      },
      {
        metric: 'ai_processing_time',
        warning: 2000,
        error: 5000,
        critical: 10000,
        unit: 'ms',
        enabled: true
      },
      {
        metric: 'database_query_time',
        warning: 100,
        error: 300,
        critical: 500,
        unit: 'ms',
        enabled: true
      },
      {
        metric: 'cache_hit_rate',
        warning: 0.5,
        error: 0.3,
        critical: 0.1,
        unit: '%',
        enabled: true
      }
    ]

    defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.metric, threshold)
    })
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const metricHistory = this.metrics.get(name)!
    metricHistory.push(metric)

    // Keep only last 1000 metrics per type
    if (metricHistory.length > 1000) {
      metricHistory.splice(0, metricHistory.length - 1000)
    }

    // Check against thresholds
    this.checkThresholds(metric)

    logger.debug('Performance metric recorded', {
      metric: name,
      value,
      unit,
      tags
    })
  }

  /**
   * Check metric against thresholds and generate alerts
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name)
    if (!threshold || !threshold.enabled) return

    let severity: PerformanceAlert['severity'] | null = null
    let thresholdValue: number | undefined

    if (metric.value >= threshold.critical) {
      severity = 'critical'
      thresholdValue = threshold.critical
    } else if (metric.value >= threshold.error) {
      severity = 'error'
      thresholdValue = threshold.error
    } else if (metric.value >= threshold.warning) {
      severity = 'warning'
      thresholdValue = threshold.warning
    }

    if (severity) {
      this.createAlert({
        type: 'threshold',
        severity,
        metric: metric.name,
        value: metric.value,
        threshold: thresholdValue,
        message: `${metric.name} exceeded ${severity} threshold: ${metric.value}${metric.unit} (threshold: ${thresholdValue}${metric.unit})`,
        timestamp: metric.timestamp,
        acknowledged: false,
        resolved: false
      })
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id'>): PerformanceAlert {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alertData
    }

    this.alerts.push(alert)

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.splice(0, this.alerts.length - 1000)
    }

    // Notify subscribers
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(alert)
      } catch (error) {
        logger.error('Error notifying alert subscriber:', error)
      }
    })

    // Log critical alerts
    if (alert.severity === 'critical' || alert.severity === 'error') {
      logger.error('Performance alert triggered', alert)
    }

    return alert
  }

  /**
   * Subscribe to performance alerts
   */
  subscribe(callback: (alert: PerformanceAlert) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  /**
   * Get metrics for a specific metric
   */
  getMetrics(
    name: string,
    timeRange?: { start: Date; end: Date }
  ): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || []

    if (!timeRange) return metrics

    return metrics.filter(metric =>
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    )
  }

  /**
   * Get performance statistics for a metric
   */
  getMetricStats(name: string, timeRange?: { start: Date; end: Date }): {
    count: number
    min: number
    max: number
    avg: number
    p50: number
    p95: number
    p99: number
    trend: 'up' | 'down' | 'stable'
  } | null {
    const metrics = this.getMetrics(name, timeRange)
    if (metrics.length === 0) return null

    const values = metrics.map(m => m.value).sort((a, b) => a - b)
    const count = values.length
    const min = values[0]
    const max = values[count - 1]
    const avg = values.reduce((sum, val) => sum + val, 0) / count

    const p50 = values[Math.floor(count * 0.5)]
    const p95 = values[Math.floor(count * 0.95)]
    const p99 = values[Math.floor(count * 0.99)]

    // Calculate trend (simple implementation)
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (count >= 10) {
      const firstHalf = values.slice(0, Math.floor(count / 2))
      const secondHalf = values.slice(Math.floor(count / 2))
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
      const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100

      if (changePercent > 10) trend = 'up'
      else if (changePercent < -10) trend = 'down'
    }

    return { count, min, max, avg, p50, p95, p99, trend }
  }

  /**
   * Get recent alerts
   */
  getAlerts(options: {
    severity?: PerformanceAlert['severity']
    acknowledged?: boolean
    resolved?: boolean
    limit?: number
    timeRange?: { start: Date; end: Date }
  } = {}): PerformanceAlert[] {
    let alerts = [...this.alerts]

    if (options.severity) {
      alerts = alerts.filter(alert => alert.severity === options.severity)
    }

    if (options.acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === options.acknowledged)
    }

    if (options.resolved !== undefined) {
      alerts = alerts.filter(alert => alert.resolved === options.resolved)
    }

    if (options.timeRange) {
      alerts = alerts.filter(alert =>
        alert.timestamp >= options.timeRange!.start && alert.timestamp <= options.timeRange!.end
      )
    }

    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    if (options.limit) {
      alerts = alerts.slice(0, options.limit)
    }

    return alerts
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      logger.info('Alert acknowledged', { alertId })
      return true
    }
    return false
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      logger.info('Alert resolved', { alertId })
      return true
    }
    return false
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealth {
    const now = new Date()
    const uptime = now.getTime() - this.startTime.getTime()

    // Get recent metrics
    const recentTime = new Date(now.getTime() - 5 * 60 * 1000) // Last 5 minutes
    const responseTimeStats = this.getMetricStats('response_time', { start: recentTime, end: now })
    const errorRateStats = this.getMetricStats('error_rate', { start: recentTime, end: now })
    const memoryStats = this.getMetricStats('memory_usage', { start: recentTime, end: now })
    const cpuStats = this.getMetricStats('cpu_usage', { start: recentTime, end: now })

    // Calculate system status
    const criticalAlerts = this.getAlerts({
      severity: 'critical',
      resolved: false,
      timeRange: { start: recentTime, end: now }
    })

    const errorAlerts = this.getAlerts({
      severity: 'error',
      resolved: false,
      timeRange: { start: recentTime, end: now }
    })

    let status: SystemHealth['status'] = 'healthy'
    if (criticalAlerts.length > 0) {
      status = 'critical'
    } else if (errorAlerts.length > 0 || (errorRateStats && errorRateStats.avg > 0.05)) {
      status = 'warning'
    }

    return {
      status,
      uptime,
      responseTime: responseTimeStats?.avg || 0,
      errorRate: errorRateStats?.avg || 0,
      throughput: this.calculateThroughput(recentTime, now),
      memoryUsage: memoryStats?.avg || 0,
      cpuUsage: cpuStats?.avg || 0,
      lastUpdated: now
    }
  }

  /**
   * Calculate throughput (requests per second)
   */
  private calculateThroughput(startTime: Date, endTime: Date): number {
    const duration = (endTime.getTime() - startTime.getTime()) / 1000 // seconds
    if (duration === 0) return 0

    // Count total requests in the time window
    const requestMetrics = this.getMetrics('request_count', { start: startTime, end: endTime })
    return requestMetrics.length / duration
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 60000) // Every minute
  }

  /**
   * Perform system health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const now = new Date()
      const health = this.getSystemHealth()

      // Check for unhealthy conditions
      if (health.status === 'critical') {
        this.createAlert({
          type: 'anomaly',
          severity: 'critical',
          metric: 'system_health',
          value: 0,
          message: 'System health is critical',
          timestamp: now,
          acknowledged: false,
          resolved: false
        })
      }

      logger.debug('Health check completed', { health })

    } catch (error) {
      logger.error('Health check failed:', error)
    }
  }

  /**
   * Update performance thresholds
   */
  updateThreshold(metric: string, threshold: Partial<PerformanceThreshold>): void {
    const existing = this.thresholds.get(metric)
    if (existing) {
      this.thresholds.set(metric, { ...existing, ...threshold })
      logger.info('Performance threshold updated', { metric, threshold })
    }
  }

  /**
   * Get all configured thresholds
   */
  getThresholds(): PerformanceThreshold[] {
    return Array.from(this.thresholds.values())
  }

  /**
   * Export monitoring data
   */
  exportData(): {
    metrics: Record<string, PerformanceMetric[]>
    alerts: PerformanceAlert[]
    thresholds: PerformanceThreshold[]
    health: SystemHealth
    exportTime: Date
  } {
    const metrics: Record<string, PerformanceMetric[]> = {}
    this.metrics.forEach((metricList, name) => {
      metrics[name] = [...metricList]
    })

    return {
      metrics,
      alerts: [...this.alerts],
      thresholds: this.getThresholds(),
      health: this.getSystemHealth(),
      exportTime: new Date()
    }
  }

  /**
   * Cleanup monitoring data
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    this.metrics.clear()
    this.alerts = []
    this.subscribers.clear()
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => performanceMonitor.cleanup())
  process.on('SIGTERM', () => performanceMonitor.cleanup())
}

export default performanceMonitor