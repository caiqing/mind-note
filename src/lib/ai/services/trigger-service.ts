// AI智能触发服务
// 实现智能的AI分析触发机制

import { BaseAIService } from './base-service'
import { Logger } from './logger'
import { AIProvider, AnalysisOptions } from '@/lib/ai/types'
import { aiConfig } from '@/lib/ai/config'

export interface TriggerRule {
  id: string
  name: string
  description: string
  enabled: boolean
  priority: number // 1-10, 数字越小优先级越高
  conditions: TriggerCondition[]
  actions: TriggerAction[]
  metadata: {
    createdAt: Date
    updatedAt: Date
    lastTriggered?: Date
    triggerCount: number
  }
}

export interface TriggerCondition {
  type: ConditionType
  operator: ConditionOperator
  value: any
  weight?: number // 权重，用于多条件组合
}

export interface TriggerAction {
  type: ActionType
  parameters: Record<string, any>
  delay?: number // 延迟执行（毫秒）
}

export type ConditionType =
  | 'content_length' | 'content_change' | 'time_interval' | 'user_activity'
  | 'sentiment_threshold' | 'concept_count' | 'keyword_presence' | 'category_match'
  | 'batch_size' | 'cost_threshold' | 'error_rate' | 'success_rate'

export type ConditionOperator =
  | 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal'
  | 'contains' | 'not_contains' | 'in' | 'not_in' | 'between' | 'regex'

export type ActionType =
  | 'analyze_note' | 'batch_analyze' | 'update_priority' | 'send_notification'
  | 'log_event' | 'trigger_webhook' | 'update_tags' | 'schedule_analysis'

export interface TriggerContext {
  noteId?: string
  userId: string
  noteContent?: string
  noteTitle?: string
  previousContent?: string
  changeType?: 'create' | 'update' | 'delete'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface TriggerResult {
  triggered: boolean
  matchedRules: Array<{
    rule: TriggerRule
    matchedConditions: TriggerCondition[]
    confidence: number
    actions: TriggerAction[]
  }>
  executedActions: Array<{
    action: TriggerAction
    ruleId: string
    success: boolean
    result?: any
    error?: string
  }>
  processingTime: number
  context: TriggerContext
}

export class TriggerService extends BaseAIService {
  private logger = Logger.getInstance()
  private rules: Map<string, TriggerRule> = new Map()
  private ruleQueue: Array<{ rule: TriggerRule; context: TriggerContext; priority: number }> = []

  constructor() {
    super('TriggerService')
    this.initializeDefaultRules()
  }

  /**
   * 初始化默认触发规则
   */
  private initializeDefaultRules(): void {
    // 规则1: 内容长度触发
    this.addRule({
      id: 'content_length_trigger',
      name: '内容长度触发规则',
      description: '当笔记内容达到一定长度时自动触发分析',
      enabled: true,
      priority: 1,
      conditions: [
        {
          type: 'content_length',
          operator: 'greater_than',
          value: 500,
          weight: 1.0
        }
      ],
      actions: [
        {
          type: 'analyze_note',
          parameters: {
            analysisTypes: ['summary', 'sentiment'],
            priority: 'normal'
          }
        }
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        triggerCount: 0
      }
    })

    // 规则2: 情感阈值触发
    this.addRule({
      id: 'sentiment_threshold_trigger',
      name: '情感阈值触发规则',
      description: '当内容包含强烈情感时触发深度分析',
      enabled: true,
      priority: 2,
      conditions: [
        {
          type: 'sentiment_threshold',
          operator: 'greater_than',
          value: 0.8,
          weight: 1.0
        }
      ],
      actions: [
        {
          type: 'analyze_note',
          parameters: {
            analysisTypes: ['sentiment', 'concepts'],
            priority: 'high',
            includeEmotions: true
          }
        }
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        triggerCount: 0
      }
    })

    // 规则3: 批量处理触发
    this.addRule({
      id: 'batch_processing_trigger',
      name: '批量处理触发规则',
      description: '当待分析笔记达到批量处理阈值时触发',
      enabled: true,
      priority: 3,
      conditions: [
        {
          type: 'batch_size',
          operator: 'greater_equal',
          value: 5,
          weight: 1.0
        }
      ],
      actions: [
        {
          type: 'batch_analyze',
          parameters: {
            maxConcurrency: 3,
            analysisTypes: ['summary', 'sentiment']
          }
        }
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        triggerCount: 0
      }
    })

    // 规则4: 关键词触发
    this.addRule({
      id: 'keyword_trigger',
      name: '关键词触发规则',
      description: '当内容包含特定关键词时触发专门分析',
      enabled: true,
      priority: 4,
      conditions: [
        {
          type: 'keyword_presence',
          operator: 'contains',
          value: ['重要', '紧急', '关键', '优先', 'urgent', 'important', 'critical'],
          weight: 1.0
        }
      ],
      actions: [
        {
          type: 'analyze_note',
          parameters: {
            analysisTypes: ['summary', 'concepts'],
            priority: 'high'
          }
        },
        {
          type: 'send_notification',
          parameters: {
            type: 'priority_content',
            message: '检测到高优先级内容，已自动分析'
          }
        }
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        triggerCount: 0
      }
    })

    // 规则5: 时间间隔触发
    this.addRule({
      id: 'time_interval_trigger',
      name: '时间间隔触发规则',
      description: '定期处理未分析的笔记',
      enabled: true,
      priority: 5,
      conditions: [
        {
          type: 'time_interval',
          operator: 'greater_than',
          value: 3600000, // 1小时（毫秒）
          weight: 0.8
        }
      ],
      actions: [
        {
          type: 'schedule_analysis',
          parameters: {
            analysisType: 'cleanup',
            priority: 'low'
          }
        }
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        triggerCount: 0
      }
    })

    this.logger.info('初始化默认触发规则', { ruleCount: this.rules.size })
  }

  /**
   * 添加触发规则
   */
  addRule(rule: TriggerRule): void {
    this.rules.set(rule.id, rule)
    this.logger.info('添加触发规则', { ruleId: rule.id, name: rule.name })
  }

  /**
   * 移除触发规则
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId)
    if (removed) {
      this.logger.info('移除触发规则', { ruleId })
    }
    return removed
  }

  /**
   * 更新触发规则
   */
  updateRule(ruleId: string, updates: Partial<TriggerRule>): boolean {
    const rule = this.rules.get(ruleId)
    if (!rule) {
      return false
    }

    const updatedRule = {
      ...rule,
      ...updates,
      metadata: {
        ...rule.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    }

    this.rules.set(ruleId, updatedRule)
    this.logger.info('更新触发规则', { ruleId, updates: Object.keys(updates) })
    return true
  }

  /**
   * 获取所有规则
   */
  getRules(): TriggerRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * 获取启用的规则
   */
  getEnabledRules(): TriggerRule[] {
    return this.getRules().filter(rule => rule.enabled)
  }

  /**
   * 评估触发条件
   */
  async evaluateTriggers(context: TriggerContext): Promise<TriggerResult> {
    const startTime = Date.now()
    this.logger.info('开始评估触发条件', {
      userId: context.userId,
      noteId: context.noteId,
      changeType: context.changeType
    })

    try {
      const enabledRules = this.getEnabledRules()
      const matchedRules: TriggerResult['matchedRules'] = []
      const executedActions: TriggerResult['executedActions'] = []

      // 评估每个规则
      for (const rule of enabledRules) {
        const evaluation = await this.evaluateRule(rule, context)
        if (evaluation.matched) {
          matchedRules.push({
            rule,
            matchedConditions: evaluation.matchedConditions,
            confidence: evaluation.confidence,
            actions: rule.actions
          })

          // 更新规则统计
          rule.metadata.lastTriggered = new Date()
          rule.metadata.triggerCount++

          // 执行动作
          const actionResults = await this.executeActions(rule.actions, context, rule.id)
          executedActions.push(...actionResults)
        }
      }

      // 按优先级和置信度排序
      matchedRules.sort((a, b) => {
        if (a.rule.priority !== b.rule.priority) {
          return a.rule.priority - b.rule.priority
        }
        return b.confidence - a.confidence
      })

      const result: TriggerResult = {
        triggered: matchedRules.length > 0,
        matchedRules,
        executedActions,
        processingTime: Date.now() - startTime,
        context
      }

      this.logger.info('触发条件评估完成', {
        triggered: result.triggered,
        matchedRulesCount: matchedRules.length,
        executedActionsCount: executedActions.length,
        processingTime: result.processingTime
      })

      return result

    } catch (error) {
      this.logger.error('触发条件评估失败', {
        error: error.message,
        context,
        processingTime: Date.now() - startTime
      })

      return {
        triggered: false,
        matchedRules: [],
        executedActions: [],
        processingTime: Date.now() - startTime,
        context
      }
    }
  }

  /**
   * 评估单个规则
   */
  private async evaluateRule(
    rule: TriggerRule,
    context: TriggerContext
  ): Promise<{
    matched: boolean
    matchedConditions: TriggerCondition[]
    confidence: number
  }> {
    const matchedConditions: TriggerCondition[] = []
    let totalWeight = 0
    let matchedWeight = 0

    for (const condition of rule.conditions) {
      totalWeight += condition.weight || 1.0

      const isMatch = await this.evaluateCondition(condition, context)
      if (isMatch) {
        matchedConditions.push(condition)
        matchedWeight += condition.weight || 1.0
      }
    }

    const confidence = totalWeight > 0 ? matchedWeight / totalWeight : 0
    const matched = matchedConditions.length === rule.conditions.length

    return { matched, matchedConditions, confidence }
  }

  /**
   * 评估单个条件
   */
  private async evaluateCondition(
    condition: TriggerCondition,
    context: TriggerContext
  ): Promise<boolean> {
    const { type, operator, value } = condition

    switch (type) {
      case 'content_length':
        return this.evaluateNumericCondition(
          context.noteContent?.length || 0,
          operator,
          value
        )

      case 'content_change':
        return this.evaluateContentChange(context, operator, value)

      case 'time_interval':
        return this.evaluateNumericCondition(
          Date.now() - context.timestamp.getTime(),
          operator,
          value
        )

      case 'sentiment_threshold':
        return await this.evaluateSentimentCondition(context, operator, value)

      case 'concept_count':
        return await this.evaluateConceptCountCondition(context, operator, value)

      case 'keyword_presence':
        return this.evaluateKeywordCondition(context, operator, value)

      case 'batch_size':
        return this.evaluateNumericCondition(
          await this.getPendingAnalysisCount(context.userId),
          operator,
          value
        )

      case 'cost_threshold':
        return this.evaluateNumericCondition(
          await this.getCurrentDayCost(context.userId),
          operator,
          value
        )

      default:
        this.logger.warn('未知的条件类型', { type })
        return false
    }
  }

  /**
   * 评估数值条件
   */
  private evaluateNumericCondition(
    actual: number,
    operator: ConditionOperator,
    expected: number | [number, number]
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'not_equals':
        return actual !== expected
      case 'greater_than':
        return actual > (expected as number)
      case 'less_than':
        return actual < (expected as number)
      case 'greater_equal':
        return actual >= (expected as number)
      case 'less_equal':
        return actual <= (expected as number)
      case 'between':
        const [min, max] = expected as [number, number]
        return actual >= min && actual <= max
      default:
        return false
    }
  }

  /**
   * 评估内容变化条件
   */
  private evaluateContentChange(
    context: TriggerContext,
    operator: ConditionOperator,
    value: any
  ): boolean {
    if (!context.noteContent || !context.previousContent) {
      return false
    }

    const changeRatio = Math.abs(
      context.noteContent.length - context.previousContent.length
    ) / Math.max(context.previousContent.length, 1)

    return this.evaluateNumericCondition(changeRatio, operator, value)
  }

  /**
   * 评估情感条件
   */
  private async evaluateSentimentCondition(
    context: TriggerContext,
    operator: ConditionOperator,
    value: number
  ): Promise<boolean> {
    // 这里应该调用情感分析服务
    // 简化实现，返回false
    return false
  }

  /**
   * 评估概念数量条件
   */
  private async evaluateConceptCountCondition(
    context: TriggerContext,
    operator: ConditionOperator,
    value: number
  ): Promise<boolean> {
    // 这里应该调用概念提取服务
    // 简化实现，基于内容长度估算
    const estimatedConceptCount = Math.floor((context.noteContent?.length || 0) / 20)
    return this.evaluateNumericCondition(estimatedConceptCount, operator, value)
  }

  /**
   * 评估关键词条件
   */
  private evaluateKeywordCondition(
    context: TriggerContext,
    operator: ConditionOperator,
    value: string | string[]
  ): boolean {
    if (!context.noteContent) {
      return false
    }

    const keywords = Array.isArray(value) ? value : [value]
    const content = context.noteContent.toLowerCase()

    switch (operator) {
      case 'contains':
        return keywords.some(keyword => content.includes(keyword.toLowerCase()))
      case 'not_contains':
        return !keywords.some(keyword => content.includes(keyword.toLowerCase()))
      case 'regex':
        return new RegExp(value as string).test(content)
      default:
        return false
    }
  }

  /**
   * 执行动作
   */
  private async executeActions(
    actions: TriggerAction[],
    context: TriggerContext,
    ruleId: string
  ): Promise<TriggerResult['executedActions']> {
    const results: TriggerResult['executedActions'] = []

    for (const action of actions) {
      if (action.delay && action.delay > 0) {
        await this.delay(action.delay)
      }

      try {
        const result = await this.executeAction(action, context, ruleId)
        results.push({
          action,
          ruleId,
          success: true,
          result
        })

        this.logger.debug('动作执行成功', {
          ruleId,
          actionType: action.type,
          result
        })

      } catch (error) {
        results.push({
          action,
          ruleId,
          success: false,
          error: error.message
        })

        this.logger.error('动作执行失败', {
          ruleId,
          actionType: action.type,
          error: error.message
        })
      }
    }

    return results
  }

  /**
   * 执行单个动作
   */
  private async executeAction(
    action: TriggerAction,
    context: TriggerContext,
    ruleId: string
  ): Promise<any> {
    switch (action.type) {
      case 'analyze_note':
        return await this.executeAnalyzeNote(action, context)

      case 'batch_analyze':
        return await this.executeBatchAnalyze(action, context)

      case 'send_notification':
        return await this.executeSendNotification(action, context)

      case 'log_event':
        return this.executeLogEvent(action, context, ruleId)

      case 'schedule_analysis':
        return await this.executeScheduleAnalysis(action, context)

      case 'update_priority':
        return await this.executeUpdatePriority(action, context)

      case 'trigger_webhook':
        return await this.executeTriggerWebhook(action, context)

      default:
        throw new Error(`未知的动作类型: ${action.type}`)
    }
  }

  /**
   * 执行笔记分析动作
   */
  private async executeAnalyzeNote(action: TriggerAction, context: TriggerContext): Promise<any> {
    if (!context.noteId || !context.noteContent) {
      throw new Error('缺少必要的笔记信息')
    }

    // 这里应该调用分析服务
    // 简化实现，返回模拟结果
    return {
      noteId: context.noteId,
      analysisTypes: action.parameters.analysisTypes,
      status: 'scheduled',
      timestamp: new Date()
    }
  }

  /**
   * 执行批量分析动作
   */
  private async executeBatchAnalyze(action: TriggerAction, context: TriggerContext): Promise<any> {
    // 这里应该调用批量分析服务
    return {
      userId: context.userId,
      maxConcurrency: action.parameters.maxConcurrency,
      status: 'scheduled',
      timestamp: new Date()
    }
  }

  /**
   * 执行发送通知动作
   */
  private async executeSendNotification(action: TriggerAction, context: TriggerContext): Promise<any> {
    this.logger.info('发送触发通知', {
      userId: context.userId,
      type: action.parameters.type,
      message: action.parameters.message
    })

    return {
      type: action.parameters.type,
      message: action.parameters.message,
      sent: true,
      timestamp: new Date()
    }
  }

  /**
   * 执行日志记录动作
   */
  private executeLogEvent(action: TriggerAction, context: TriggerContext, ruleId: string): any {
    this.logger.info('触发规则事件', {
      ruleId,
      userId: context.userId,
      noteId: context.noteId,
      action: action.parameters
    })

    return {
      logged: true,
      timestamp: new Date()
    }
  }

  /**
   * 执行计划分析动作
   */
  private async executeScheduleAnalysis(action: TriggerAction, context: TriggerContext): Promise<any> {
    return {
      analysisType: action.parameters.analysisType,
      priority: action.parameters.priority,
      scheduled: true,
      timestamp: new Date()
    }
  }

  /**
   * 执行更新优先级动作
   */
  private async executeUpdatePriority(action: TriggerAction, context: TriggerContext): Promise<any> {
    return {
      noteId: context.noteId,
      priority: action.parameters.priority,
      updated: true,
      timestamp: new Date()
    }
  }

  /**
   * 执行Webhook触发动作
   */
  private async executeTriggerWebhook(action: TriggerAction, context: TriggerContext): Promise<any> {
    // 这里应该调用Webhook服务
    return {
      url: action.parameters.url,
      payload: {
        context,
        ruleId: action.parameters.ruleId
      },
      triggered: true,
      timestamp: new Date()
    }
  }

  /**
   * 辅助方法
   */
  private async getPendingAnalysisCount(userId: string): Promise<number> {
    // 这里应该查询数据库获取待分析数量
    // 简化实现，返回模拟值
    return Math.floor(Math.random() * 10)
  }

  private async getCurrentDayCost(userId: string): Promise<number> {
    // 这里应该查询数据库获取今日花费
    // 简化实现，返回模拟值
    return Math.random() * 5
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 导出单例实例
export const triggerService = new TriggerService()