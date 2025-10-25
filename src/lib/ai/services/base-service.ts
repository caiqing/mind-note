// AI服务基类

import { AnalysisOptions, AnalysisResult, AnalysisStatus } from '@/lib/ai/types'
import { aiConfig } from '@/lib/ai/config'

export abstract class BaseAIService {
  protected providerId: string
  protected modelName: string
  protected maxRetries: number
  protected timeout: number

  constructor(providerId: string, modelName: string) {
    this.providerId = providerId
    this.modelName = modelName
    this.maxRetries = 3
    this.timeout = aiConfig.settings.analysisTimeout
  }

  /**
   * 执行AI分析
   */
  abstract analyze(content: string, options: AnalysisOptions): Promise<AnalysisResult>

  /**
   * 验证输入内容
   */
  protected validateInput(content: string, options: AnalysisOptions): void {
    if (!content || typeof content !== 'string') {
      throw new Error('Content must be a non-empty string')
    }

    if (content.length < aiConfig.settings.minContentLength) {
      throw new Error(`Content too short, minimum ${aiConfig.settings.minContentLength} characters required`)
    }

    if (content.length > aiConfig.settings.maxContentLength) {
      throw new Error(`Content too long, maximum ${aiConfig.settings.maxContentLength} characters allowed`)
    }

    if (!options.type) {
      throw new Error('Analysis type is required')
    }
  }

  /**
   * 带重试的请求执行
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 ${operationName} - 尝试 ${attempt}/${this.maxRetries}`)
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
          )
        ])

        if (attempt > 1) {
          console.log(`✅ ${operationName} - 在第${attempt}次尝试后成功`)
        }
        return result
      } catch (error) {
        lastError = error as Error
        console.warn(`⚠️ ${operationName} - 第${attempt}次尝试失败:`, error.message)

        // 如果是最后一次尝试，直接抛出错误
        if (attempt === this.maxRetries) {
          break
        }

        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.log(`⏳ ${operationName} - 等待 ${delay}ms 后重试...`)
        await this.sleep(delay)
      }
    }

    throw new Error(`${operationName} failed after ${this.maxRetries} attempts: ${lastError.message}`)
  }

  /**
   * 记录分析日志
   */
  protected async logAnalysis(
    userId: string,
    noteId: string,
    requestType: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    responseTime: number,
    success: boolean,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.prisma.analysisLog.create({
        data: {
          noteId,
          userId,
          aiProviderId: this.providerId,
          modelVersion: this.modelName,
          requestType,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
          currency: 'USD',
          responseTime,
          success,
          errorCode,
          errorMessage
        }
      })
    } catch (error) {
      console.error('Failed to log analysis:', error)
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 计算token成本
   */
  protected calculateCost(inputTokens: number, outputTokens: number): number {
    // 简化的成本计算，实际应该根据不同模型的定价
    const inputCostPerToken = 0.000005 // $0.005 per 1K input tokens
    const outputCostPerToken = 0.000015 // $0.015 per 1K output tokens

    return (inputTokens * inputCostPerToken / 1000) + (outputTokens * outputCostPerToken / 1000)
  }

  /**
   * 检查用户预算
   */
  protected async checkUserBudget(userId: string, estimatedCost: number): Promise<boolean> {
    try {
      // 获取用户今日已使用的成本
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayUsage = await this.prisma.analysisLog.aggregate({
        where: {
          userId,
          createdAt: {
            gte: today
          },
          success: true
        },
        _sum: {
          cost: true
        }
      })

      const todayTotal = Number(todayUsage._sum.cost || 0)
      const dailyBudget = aiConfig.settings.userDailyBudget

      if (todayTotal + estimatedCost > dailyBudget) {
        console.warn(`用户 ${userId} 预算超限: 今日已用 $${todayTotal.toFixed(6)}, 预算 $${dailyBudget}`)
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking user budget:', error)
      // 出错时默认允许执行
      return true
    }
  }

  /**
   * 工具方法：睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 懒加载Prisma客户端
  private _prisma: any = null
  protected get prisma() {
    if (!this._prisma) {
      this._prisma = require('@prisma/client').PrismaClient
      return new this._prisma()
    }
    return this._prisma
  }

  /**
   * 获取提供商信息
   */
  getProviderInfo(): { id: string; model: string } {
    return {
      id: this.providerId,
      model: this.modelName
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number }> {
    const startTime = Date.now()

    try {
      // 执行简单的测试请求
      await this.analyze('Test', { type: 'summary' })
      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        responseTime
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      return {
        status: 'unhealthy',
        responseTime
      }
    }
  }
}