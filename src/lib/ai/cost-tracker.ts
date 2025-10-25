/**
 * AI服务成本追踪器
 * 提供详细的成本分析、预算控制和成本优化建议
 */

export interface CostRecord {
  id: string
  timestamp: Date
  provider: string
  model: string
  userId: string
  requestId: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  currency: string
  responseTime: number
  success: boolean
  metadata?: Record<string, any>
}

export interface CostSummary {
  period: {
    start: Date
    end: Date
  }
  totalCost: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageCostPerRequest: number
  averageTokensPerRequest: number
  costByProvider: Record<string, number>
  costByModel: Record<string, number>
  costByUser: Record<string, number>
  trends: {
    daily: Array<{ date: string; cost: number; requests: number }>
    hourly?: Array<{ hour: string; cost: number; requests: number }>
  }
}

export interface BudgetAlert {
  id: string
  type: 'warning' | 'critical'
  threshold: number
  current: number
  percentage: number
  message: string
  timestamp: Date
  acknowledged: boolean
}

export interface CostOptimization {
  suggestions: Array<{
    type: 'model' | 'provider' | 'usage' | 'caching'
    priority: 'high' | 'medium' | 'low'
    description: string
    estimatedSavings: number
    action: string
  }>
  potentialSavings: number
  implementationCost: 'low' | 'medium' | 'high'
}

export class AICostTracker {
  private static instance: AICostTracker
  private costRecords: CostRecord[] = []
  private budgetLimits: {
    daily: number
    weekly: number
    monthly: number
  } = {
    daily: 10,
    weekly: 50,
    monthly: 200
  }
  private alerts: BudgetAlert[] = []
  private maxRecords = 10000 // 保留最近10000条记录

  private constructor() {
    this.loadPersistedData()
    this.startPeriodicCleanup()
  }

  static getInstance(): AICostTracker {
    if (!AICostTracker.instance) {
      AICostTracker.instance = new AICostTracker()
    }
    return AICostTracker.instance
  }

  /**
   * 记录成本
   */
  recordCost(record: Omit<CostRecord, 'id' | 'timestamp'>): void {
    const costRecord: CostRecord = {
      ...record,
      id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    this.costRecords.push(costRecord)
    this.persistData()

    // 检查预算限制
    this.checkBudgetLimits()

    // 清理旧记录
    this.cleanupOldRecords()
  }

  /**
   * 获取成本汇总
   */
  getCostSummary(period: 'day' | 'week' | 'month' | 'all'): CostSummary {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'all':
        startDate = new Date(0) // 从最开始
        break
    }

    const filteredRecords = this.costRecords.filter(
      record => record.timestamp >= startDate && record.timestamp <= now
    )

    const totalCost = filteredRecords.reduce((sum, record) => sum + record.cost, 0)
    const successfulRequests = filteredRecords.filter(r => r.success).length
    const totalRequests = filteredRecords.length

    const costByProvider: Record<string, number> = {}
    const costByModel: Record<string, number> = {}
    const costByUser: Record<string, number> = {}

    filteredRecords.forEach(record => {
      costByProvider[record.provider] = (costByProvider[record.provider] || 0) + record.cost
      costByModel[record.model] = (costByModel[record.model] || 0) + record.cost
      costByUser[record.userId] = (costByUser[record.userId] || 0) + record.cost
    })

    // 生成趋势数据
    const trends = this.generateTrends(filteredRecords, period)

    return {
      period: {
        start: startDate,
        end: now
      },
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      averageCostPerRequest: totalRequests > 0 ? Math.round((totalCost / totalRequests) * 10000) / 10000 : 0,
      averageTokensPerRequest: totalRequests > 0
        ? Math.round(filteredRecords.reduce((sum, r) => sum + r.totalTokens, 0) / totalRequests)
        : 0,
      costByProvider,
      costByModel,
      costByUser,
      trends
    }
  }

  /**
   * 获取实时成本状态
   */
  getCurrentStatus(): {
    currentDay: number
    currentWeek: number
    currentMonth: number
    budgetUsage: {
      daily: number
      weekly: number
      monthly: number
    }
    alerts: BudgetAlert[]
    recentCosts: CostRecord[]
  } {
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const currentDay = this.calculateTotalCost(dayStart, now)
    const currentWeek = this.calculateTotalCost(weekStart, now)
    const currentMonth = this.calculateTotalCost(monthStart, now)

    const budgetUsage = {
      daily: Math.round((currentDay / this.budgetLimits.daily) * 100),
      weekly: Math.round((currentWeek / this.budgetLimits.weekly) * 100),
      monthly: Math.round((currentMonth / this.budgetLimits.monthly) * 100)
    }

    const recentCosts = this.costRecords
      .filter(r => r.timestamp >= new Date(now.getTime() - 60 * 60 * 1000)) // 最近1小时
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)

    return {
      currentDay: Math.round(currentDay * 10000) / 10000,
      currentWeek: Math.round(currentWeek * 10000) / 10000,
      currentMonth: Math.round(currentMonth * 10000) / 10000,
      budgetUsage,
      alerts: this.alerts.filter(a => !a.acknowledged),
      recentCosts
    }
  }

  /**
   * 设置预算限制
   */
  setBudgetLimits(limits: Partial<typeof this.budgetLimits>): void {
    this.budgetLimits = { ...this.budgetLimits, ...limits }
    this.persistData()
    this.checkBudgetLimits()
  }

  /**
   * 获取成本优化建议
   */
  getCostOptimization(): CostOptimization {
    const summary = this.getCostSummary('month')
    const suggestions = []
    let potentialSavings = 0

    // 分析模型使用情况
    const modelCosts = Object.entries(summary.costByModel)
      .sort(([, a], [, b]) => b - a)

    if (modelCosts.length > 1) {
      const mostExpensiveModel = modelCosts[0]
      const cheaperAlternatives = modelCosts.slice(1)

      if (mostExpensiveModel[1] > summary.totalCost * 0.6) {
        potentialSavings += mostExpensiveModel[1] * 0.3
        suggestions.push({
          type: 'model' as const,
          priority: 'high' as const,
          description: `${mostExpensiveModel[0]} 占用了 ${(mostExpensiveModel[1] / summary.totalCost * 100).toFixed(1)}% 的成本`,
          estimatedSavings: Math.round(mostExpensiveModel[1] * 0.3 * 10000) / 10000,
          action: '考虑为非关键任务切换到更经济的模型'
        })
      }
    }

    // 分析提供商使用情况
    const providerCosts = Object.entries(summary.costByProvider)
    if (providerCosts.length > 1) {
      const expensiveProvider = providerCosts.find(([_, cost]) => cost > summary.totalCost * 0.7)
      if (expensiveProvider) {
        potentialSavings += expensiveProvider[1] * 0.2
        suggestions.push({
          type: 'provider' as const,
          priority: 'medium' as const,
          description: `${expensiveProvider[0]} 成本较高`,
          estimatedSavings: Math.round(expensiveProvider[1] * 0.2 * 10000) / 10000,
          action: '探索使用其他提供商或本地模型'
        })
      }
    }

    // 检查缓存机会
    const recentRequests = this.costRecords.slice(-100)
    const duplicatePatterns = this.findDuplicatePatterns(recentRequests)

    if (duplicatePatterns.length > 0) {
      const cacheSavings = duplicatePatterns.reduce((sum, pattern) => sum + pattern.savings, 0)
      potentialSavings += cacheSavings

      suggestions.push({
        type: 'caching' as const,
        priority: 'high' as const,
        description: `发现 ${duplicatePatterns.length} 个可缓存的重复请求模式`,
        estimatedSavings: Math.round(cacheSavings * 10000) / 10000,
        action: '实施智能缓存以减少重复API调用'
      })
    }

    // 使用模式分析
    if (summary.averageTokensPerRequest > 2000) {
      suggestions.push({
        type: 'usage' as const,
        priority: 'medium' as const,
        description: `平均令牌使用量较高 (${summary.averageTokensPerRequest})`,
        estimatedSavings: Math.round(summary.totalCost * 0.15 * 10000) / 10000,
        action: '优化提示词长度和令牌使用效率'
      })
      potentialSavings += summary.totalCost * 0.15
    }

    return {
      suggestions,
      potentialSavings: Math.round(potentialSavings * 10000) / 10000,
      implementationCost: suggestions.some(s => s.priority === 'high') ? 'low' : 'medium'
    }
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      this.persistData()
    }
  }

  /**
   * 导出成本数据
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'provider', 'model', 'userId', 'cost', 'tokens', 'success']
      const rows = this.costRecords.map(record => [
        record.timestamp.toISOString(),
        record.provider,
        record.model,
        record.userId,
        record.cost.toString(),
        record.totalTokens.toString(),
        record.success.toString()
      ])

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    }

    return JSON.stringify({
      exportTime: new Date().toISOString(),
      records: this.costRecords,
      summary: this.getCostSummary('all'),
      alerts: this.alerts
    }, null, 2)
  }

  /**
   * 清除数据
   */
  clearData(olderThan?: Date): void {
    if (olderThan) {
      this.costRecords = this.costRecords.filter(record => record.timestamp >= olderThan)
    } else {
      this.costRecords = []
      this.alerts = []
    }
    this.persistData()
  }

  // 私有方法

  private calculateTotalCost(startDate: Date, endDate: Date): number {
    return this.costRecords
      .filter(record => record.timestamp >= startDate && record.timestamp <= endDate)
      .reduce((sum, record) => sum + record.cost, 0)
  }

  private generateTrends(records: CostRecord[], period: string): CostSummary['trends'] {
    const daily: Array<{ date: string; cost: number; requests: number }> = []

    // 按天分组
    const dailyGroups = records.reduce((groups, record) => {
      const date = record.timestamp.toISOString().split('T')[0]
      if (!groups[date]) {
        groups[date] = { cost: 0, requests: 0 }
      }
      groups[date].cost += record.cost
      groups[date].requests += 1
      return groups
    }, {} as Record<string, { cost: number; requests: number }>)

    // 转换为数组并排序
    Object.entries(dailyGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        daily.push({
          date,
          cost: Math.round(data.cost * 10000) / 10000,
          requests: data.requests
        })
      })

    const trends: CostSummary['trends'] = { daily }

    // 如果是当天数据，添加小时趋势
    if (period === 'day') {
      const hourly: Array<{ hour: string; cost: number; requests: number }> = []

      const hourlyGroups = records.reduce((groups, record) => {
        const hour = record.timestamp.getHours().toString().padStart(2, '0')
        if (!groups[hour]) {
          groups[hour] = { cost: 0, requests: 0 }
        }
        groups[hour].cost += record.cost
        groups[hour].requests += 1
        return groups
      }, {} as Record<string, { cost: number; requests: number }>)

      Object.entries(hourlyGroups)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([hour, data]) => {
          hourly.push({
            hour: `${hour}:00`,
            cost: Math.round(data.cost * 10000) / 10000,
            requests: data.requests
          })
        })

      trends.hourly = hourly
    }

    return trends
  }

  private findDuplicatePatterns(records: CostRecord[]): Array<{ pattern: string; count: number; savings: number }> {
    // 简化的重复模式检测
    const patterns = records.reduce((groups, record) => {
      // 使用模型和令牌数作为简单的模式标识
      const pattern = `${record.model}-${Math.floor(record.inputTokens / 100) * 100}`
      if (!groups[pattern]) {
        groups[pattern] = { count: 0, totalCost: 0 }
      }
      groups[pattern].count += 1
      groups[pattern].totalCost += record.cost
      return groups
    }, {} as Record<string, { count: number; totalCost: number }>)

    return Object.entries(patterns)
      .filter(([_, data]) => data.count > 2) // 出现超过2次的模式
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        savings: data.totalCost * 0.8 // 假设缓存可以节省80%的成本
      }))
  }

  private checkBudgetLimits(): void {
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const currentDay = this.calculateTotalCost(dayStart, now)
    const currentWeek = this.calculateTotalCost(weekStart, now)
    const currentMonth = this.calculateTotalCost(monthStart, now)

    // 检查各周期预算
    this.checkBudgetThreshold('daily', currentDay, this.budgetLimits.daily)
    this.checkBudgetThreshold('weekly', currentWeek, this.budgetLimits.weekly)
    this.checkBudgetThreshold('monthly', currentMonth, this.budgetLimits.monthly)
  }

  private checkBudgetThreshold(period: string, current: number, limit: number): void {
    const percentage = (current / limit) * 100

    let alertType: 'warning' | 'critical' | null = null
    let threshold = 0

    if (percentage >= 100) {
      alertType = 'critical'
      threshold = 100
    } else if (percentage >= 80) {
      alertType = 'warning'
      threshold = 80
    }

    if (alertType && !this.alerts.some(a =>
      a.type === alertType &&
      a.percentage === threshold &&
      !a.acknowledged
    )) {
      const alert: BudgetAlert = {
        id: `budget-${period}-${Date.now()}`,
        type: alertType,
        threshold,
        current,
        percentage,
        message: `${period} 预算使用已达到 ${percentage.toFixed(1)}% ($${current.toFixed(4)} / $${limit.toFixed(4)})`,
        timestamp: new Date(),
        acknowledged: false
      }

      this.alerts.push(alert)
    }
  }

  private cleanupOldRecords(): void {
    if (this.costRecords.length > this.maxRecords) {
      this.costRecords = this.costRecords.slice(-this.maxRecords)
    }

    // 清理30天前的告警
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    this.alerts = this.alerts.filter(alert => alert.timestamp > thirtyDaysAgo)
  }

  private startPeriodicCleanup(): void {
    // 每小时清理一次旧数据
    setInterval(() => {
      this.cleanupOldRecords()
      this.persistData()
    }, 60 * 60 * 1000)
  }

  private persistData(): void {
    // 这里应该实现数据持久化
    // 为了简化，这里只是一个占位符
    try {
      localStorage.setItem('ai-cost-tracker-data', JSON.stringify({
        costRecords: this.costRecords,
        budgetLimits: this.budgetLimits,
        alerts: this.alerts
      }))
    } catch (error) {
      console.warn('Failed to persist cost tracker data:', error)
    }
  }

  private loadPersistedData(): void {
    try {
      const data = localStorage.getItem('ai-cost-tracker-data')
      if (data) {
        const parsed = JSON.parse(data)
        this.costRecords = parsed.costRecords?.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp)
        })) || []
        this.budgetLimits = parsed.budgetLimits || this.budgetLimits
        this.alerts = parsed.alerts?.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        })) || []
      }
    } catch (error) {
      console.warn('Failed to load persisted cost tracker data:', error)
    }
  }
}