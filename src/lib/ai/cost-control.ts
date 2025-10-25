/**
 * 成本控制和速率限制模块 - T103.8
 * 实现AI服务成本控制、预算管理和速率限制功能
 */

export interface CostControlConfig {
  // 用户级别限制
  userDailyLimit?: number;      // 每日限额（美元）
  userMonthlyLimit?: number;    // 每月限额（美元）

  // 操作级别限制
  operationCostLimit?: number;  // 单次操作限额（美元）

  // 速率限制
  requestsPerMinute?: number;   // 每分钟请求数
  requestsPerHour?: number;     // 每小时请求数

  // 预警阈值
  warningThreshold?: number;    // 预警阈值（百分比，默认80%）
  criticalThreshold?: number;   // 严重阈值（百分比，默认95%）

  // 成本优化
  enableCostOptimization?: boolean;  // 启用成本优化
  preferredProvider?: string;        // 首选提供商（基于成本）
  maxTokensPerRequest?: number;      // 单次请求最大Token数
}

export interface UsageRecord {
  userId: string;
  operation: string;
  provider: string;
  cost: number;
  tokens: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UserUsageStats {
  userId: string;

  // 当前周期使用量
  dailyUsage: {
    cost: number;
    requests: number;
    tokens: number;
    lastReset: Date;
  };

  monthlyUsage: {
    cost: number;
    requests: number;
    tokens: number;
    lastReset: Date;
  };

  // 速率限制
  rateLimit: {
    requestsThisMinute: number;
    requestsThisHour: number;
    lastMinuteReset: Date;
    lastHourReset: Date;
  };

  // 预算状态
  budgetStatus: 'healthy' | 'warning' | 'critical' | 'exceeded';
  warnings: string[];
}

export interface CostControlResult {
  allowed: boolean;
  reason?: string;
  estimatedCost?: number;
  warnings?: string[];
  suggestedAlternatives?: string[];
}

export interface ProviderCostInfo {
  provider: string;
  costPer1KInputTokens: number;
  costPer1KOutputTokens: number;
  model: string;
  currency: string;
  lastUpdated: Date;
}

/**
 * 成本控制器类
 */
export class CostController {
  private config: CostControlConfig;
  private userUsageStats: Map<string, UserUsageStats> = new Map();
  private providerCosts: Map<string, ProviderCostInfo> = new Map();
  private usageHistory: UsageRecord[] = [];

  constructor(config: CostControlConfig = {}) {
    this.config = {
      userDailyLimit: 10.0,         // $10/天
      userMonthlyLimit: 200.0,      // $200/月
      operationCostLimit: 1.0,      // $1/次
      requestsPerMinute: 60,        // 60/分钟
      requestsPerHour: 1000,        // 1000/小时
      warningThreshold: 80,         // 80%预警
      criticalThreshold: 95,        // 95%严重
      enableCostOptimization: true,
      maxTokensPerRequest: 4000,    // 4000 tokens
      ...config
    };

    this.initializeProviderCosts();
  }

  /**
   * 初始化提供商成本信息
   */
  private initializeProviderCosts(): void {
    // OpenAI GPT-4 Turbo
    this.providerCosts.set('openai:gpt-4-turbo', {
      provider: 'openai',
      costPer1KInputTokens: 0.01,
      costPer1KOutputTokens: 0.03,
      model: 'gpt-4-turbo-preview',
      currency: 'USD',
      lastUpdated: new Date()
    });

    // OpenAI GPT-3.5 Turbo
    this.providerCosts.set('openai:gpt-3.5-turbo', {
      provider: 'openai',
      costPer1KInputTokens: 0.0005,
      costPer1KOutputTokens: 0.0015,
      model: 'gpt-3.5-turbo',
      currency: 'USD',
      lastUpdated: new Date()
    });

    // Claude 3 Sonnet
    this.providerCosts.set('anthropic:claude-3-sonnet', {
      provider: 'anthropic',
      costPer1KInputTokens: 0.003,
      costPer1KOutputTokens: 0.015,
      model: 'claude-3-sonnet-20240229',
      currency: 'USD',
      lastUpdated: new Date()
    });

    // Claude 3 Haiku
    this.providerCosts.set('anthropic:claude-3-haiku', {
      provider: 'anthropic',
      costPer1KInputTokens: 0.00025,
      costPer1KOutputTokens: 0.00125,
      model: 'claude-3-haiku-20240307',
      currency: 'USD',
      lastUpdated: new Date()
    });
  }

  /**
   * 检查请求是否被允许
   */
  async checkRequestAllowed(
    userId: string,
    operation: string,
    estimatedTokens: { input: number; output: number },
    provider?: string
  ): Promise<CostControlResult> {
    const now = new Date();
    const userStats = this.getOrCreateUserStats(userId, now);

    // 重置过期统计
    this.resetExpiredStats(userStats, now);

    // 计算预估成本
    const estimatedCost = this.calculateEstimatedCost(provider, estimatedTokens);

    // 检查各种限制
    const result: CostControlResult = {
      allowed: true,
      estimatedCost,
      warnings: []
    };

    // 1. 检查单次操作限额
    if (this.config.operationCostLimit && estimatedCost > this.config.operationCostLimit) {
      result.allowed = false;
      result.reason = `单次操作成本 $${estimatedCost.toFixed(4)} 超过限额 $${this.config.operationCostLimit}`;
      result.suggestedAlternatives = this.suggestAlternatives(estimatedTokens, provider);
      return result;
    }

    // 2. 检查每日限额
    if (this.config.userDailyLimit &&
        userStats.dailyUsage.cost + estimatedCost > this.config.userDailyLimit) {
      result.allowed = false;
      result.reason = `每日成本 $${userStats.dailyUsage.cost.toFixed(2)} + $${estimatedCost.toFixed(4)} 将超过限额 $${this.config.userDailyLimit}`;
      return result;
    }

    // 3. 检查每月限额
    if (this.config.userMonthlyLimit &&
        userStats.monthlyUsage.cost + estimatedCost > this.config.userMonthlyLimit) {
      result.allowed = false;
      result.reason = `每月成本 $${userStats.monthlyUsage.cost.toFixed(2)} + $${estimatedCost.toFixed(4)} 将超过限额 $${this.config.userMonthlyLimit}`;
      return result;
    }

    // 4. 检查速率限制
    if (this.config.requestsPerMinute &&
        userStats.rateLimit.requestsThisMinute >= this.config.requestsPerMinute) {
      result.allowed = false;
      result.reason = '每分钟请求数已达上限，请稍后重试';
      return result;
    }

    if (this.config.requestsPerHour &&
        userStats.rateLimit.requestsThisHour >= this.config.requestsPerHour) {
      result.allowed = false;
      result.reason = '每小时请求数已达上限，请稍后重试';
      return result;
    }

    // 5. 检查预警阈值
    this.checkBudgetWarnings(userStats, estimatedCost, result.warnings);

    // 6. 成本优化建议
    if (this.config.enableCostOptimization) {
      const optimizations = this.suggestOptimizations(provider, estimatedTokens);
      result.warnings?.push(...optimizations);
    }

    return result;
  }

  /**
   * 记录实际使用量
   */
  recordUsage(
    userId: string,
    operation: string,
    provider: string,
    actualCost: number,
    actualTokens: number,
    metadata?: Record<string, any>
  ): void {
    const now = new Date();
    const userStats = this.getOrCreateUserStats(userId, now);

    // 更新用户统计
    userStats.dailyUsage.cost += actualCost;
    userStats.dailyUsage.requests += 1;
    userStats.dailyUsage.tokens += actualTokens;

    userStats.monthlyUsage.cost += actualCost;
    userStats.monthlyUsage.requests += 1;
    userStats.monthlyUsage.tokens += actualTokens;

    userStats.rateLimit.requestsThisMinute += 1;
    userStats.rateLimit.requestsThisHour += 1;

    // 更新预算状态
    this.updateBudgetStatus(userStats);

    // 记录历史
    const record: UsageRecord = {
      userId,
      operation,
      provider,
      cost: actualCost,
      tokens: actualTokens,
      timestamp: now,
      metadata
    };

    this.usageHistory.push(record);

    // 限制历史记录数量
    if (this.usageHistory.length > 10000) {
      this.usageHistory = this.usageHistory.slice(-5000);
    }
  }

  /**
   * 获取用户使用统计
   */
  getUserUsageStats(userId: string): UserUsageStats | null {
    return this.userUsageStats.get(userId) || null;
  }

  /**
   * 获取提供商成本信息
   */
  getProviderCostInfo(provider?: string): ProviderCostInfo[] {
    if (provider) {
      const info = this.providerCosts.get(provider);
      return info ? [info] : [];
    }
    return Array.from(this.providerCosts.values());
  }

  /**
   * 获取使用历史
   */
  getUsageHistory(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): UsageRecord[] {
    let history = [...this.usageHistory];

    if (userId) {
      history = history.filter(record => record.userId === userId);
    }

    if (startDate) {
      history = history.filter(record => record.timestamp >= startDate);
    }

    if (endDate) {
      history = history.filter(record => record.timestamp <= endDate);
    }

    // 按时间倒序排列
    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return history.slice(0, limit);
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CostControlConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 重置用户统计
   */
  resetUserStats(userId: string): void {
    this.userUsageStats.delete(userId);
  }

  /**
   * 获取成本分析报告
   */
  getCostAnalysisReport(userId?: string): {
    totalCost: number;
    totalRequests: number;
    totalTokens: number;
    averageCostPerRequest: number;
    averageCostPerToken: number;
    providerBreakdown: Record<string, { cost: number; requests: number; tokens: number }>;
    operationBreakdown: Record<string, { cost: number; requests: number; tokens: number }>;
  } {
    const history = userId ?
      this.usageHistory.filter(record => record.userId === userId) :
      this.usageHistory;

    const totalCost = history.reduce((sum, record) => sum + record.cost, 0);
    const totalRequests = history.length;
    const totalTokens = history.reduce((sum, record) => sum + record.tokens, 0);

    const providerBreakdown: Record<string, { cost: number; requests: number; tokens: number }> = {};
    const operationBreakdown: Record<string, { cost: number; requests: number; tokens: number }> = {};

    history.forEach(record => {
      // 提供商统计
      if (!providerBreakdown[record.provider]) {
        providerBreakdown[record.provider] = { cost: 0, requests: 0, tokens: 0 };
      }
      providerBreakdown[record.provider].cost += record.cost;
      providerBreakdown[record.provider].requests += 1;
      providerBreakdown[record.provider].tokens += record.tokens;

      // 操作统计
      if (!operationBreakdown[record.operation]) {
        operationBreakdown[record.operation] = { cost: 0, requests: 0, tokens: 0 };
      }
      operationBreakdown[record.operation].cost += record.cost;
      operationBreakdown[record.operation].requests += 1;
      operationBreakdown[record.operation].tokens += record.tokens;
    });

    return {
      totalCost,
      totalRequests,
      totalTokens,
      averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      averageCostPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
      providerBreakdown,
      operationBreakdown
    };
  }

  /**
   * 获取或创建用户统计
   */
  private getOrCreateUserStats(userId: string, now: Date): UserUsageStats {
    let stats = this.userUsageStats.get(userId);

    if (!stats) {
      stats = {
        userId,
        dailyUsage: {
          cost: 0,
          requests: 0,
          tokens: 0,
          lastReset: now
        },
        monthlyUsage: {
          cost: 0,
          requests: 0,
          tokens: 0,
          lastReset: now
        },
        rateLimit: {
          requestsThisMinute: 0,
          requestsThisHour: 0,
          lastMinuteReset: now,
          lastHourReset: now
        },
        budgetStatus: 'healthy',
        warnings: []
      };

      this.userUsageStats.set(userId, stats);
    }

    return stats;
  }

  /**
   * 重置过期统计
   */
  private resetExpiredStats(userStats: UserUsageStats, now: Date): void {
    // 重置每日统计
    if (this.isNewDay(now, userStats.dailyUsage.lastReset)) {
      userStats.dailyUsage = {
        cost: 0,
        requests: 0,
        tokens: 0,
        lastReset: now
      };
    }

    // 重置每月统计
    if (this.isNewMonth(now, userStats.monthlyUsage.lastReset)) {
      userStats.monthlyUsage = {
        cost: 0,
        requests: 0,
        tokens: 0,
        lastReset: now
      };
    }

    // 重置分钟统计
    if (this.isNewMinute(now, userStats.rateLimit.lastMinuteReset)) {
      userStats.rateLimit.requestsThisMinute = 0;
      userStats.rateLimit.lastMinuteReset = now;
    }

    // 重置小时统计
    if (this.isNewHour(now, userStats.rateLimit.lastHourReset)) {
      userStats.rateLimit.requestsThisHour = 0;
      userStats.rateLimit.lastHourReset = now;
    }
  }

  /**
   * 计算预估成本
   */
  private calculateEstimatedCost(
    provider: string | undefined,
    tokens: { input: number; output: number }
  ): number {
    if (!provider || !this.providerCosts.has(provider)) {
      // 使用默认成本估算
      return (tokens.input + tokens.output) * 0.00001; // $0.01 per 1K tokens
    }

    const costInfo = this.providerCosts.get(provider)!;
    const inputCost = (tokens.input / 1000) * costInfo.costPer1KInputTokens;
    const outputCost = (tokens.output / 1000) * costInfo.costPer1KOutputTokens;

    return inputCost + outputCost;
  }

  /**
   * 检查预算警告
   */
  private checkBudgetWarnings(
    userStats: UserUsageStats,
    estimatedCost: number,
    warnings: string[]
  ): void {
    const warningThreshold = this.config.warningThreshold || 80;
    const criticalThreshold = this.config.criticalThreshold || 95;

    if (this.config.userDailyLimit) {
      const dailyPercent = ((userStats.dailyUsage.cost + estimatedCost) / this.config.userDailyLimit) * 100;

      if (dailyPercent >= criticalThreshold) {
        warnings.push(`🚨 严重：每日成本已达 ${dailyPercent.toFixed(1)}%`);
      } else if (dailyPercent >= warningThreshold) {
        warnings.push(`⚠️ 警告：每日成本已达 ${dailyPercent.toFixed(1)}%`);
      }
    }

    if (this.config.userMonthlyLimit) {
      const monthlyPercent = ((userStats.monthlyUsage.cost + estimatedCost) / this.config.userMonthlyLimit) * 100;

      if (monthlyPercent >= criticalThreshold) {
        warnings.push(`🚨 严重：每月成本已达 ${monthlyPercent.toFixed(1)}%`);
      } else if (monthlyPercent >= warningThreshold) {
        warnings.push(`⚠️ 警告：每月成本已达 ${monthlyPercent.toFixed(1)}%`);
      }
    }
  }

  /**
   * 建议替代方案
   */
  private suggestAlternatives(
    tokens: { input: number; output: number },
    currentProvider?: string
  ): string[] {
    const alternatives: string[] = [];

    // 建议更便宜的提供商
    const cheaperProviders = Array.from(this.providerCosts.values())
      .filter(info => !currentProvider || info.provider !== currentProvider)
      .sort((a, b) => {
        const costA = this.calculateEstimatedCost(a.provider, tokens);
        const costB = this.calculateEstimatedCost(b.provider, tokens);
        return costA - costB;
      });

    cheaperProviders.slice(0, 3).forEach(provider => {
      const cost = this.calculateEstimatedCost(provider.provider, tokens);
      alternatives.push(`${provider.provider} (${provider.model}): $${cost.toFixed(4)}`);
    });

    // 建议减少Token数
    if (tokens.input + tokens.output > 2000) {
      alternatives.push(`减少输入文本长度至2000 tokens以内`);
    }

    return alternatives;
  }

  /**
   * 建议成本优化
   */
  private suggestOptimizations(
    provider: string | undefined,
    tokens: { input: number; output: number }
  ): string[] {
    const suggestions: string[] = [];

    if (tokens.input > 3000) {
      suggestions.push(`💡 成本优化：输入文本较长(${tokens.input} tokens)，考虑精简内容`);
    }

    if (provider === 'openai:gpt-4-turbo') {
      suggestions.push(`💡 成本优化：GPT-4 Turbo成本较高，考虑使用GPT-3.5 Turbo或Claude 3 Haiku`);
    }

    return suggestions;
  }

  /**
   * 更新预算状态
   */
  private updateBudgetStatus(userStats: UserUsageStats): void {
    const warningThreshold = this.config.warningThreshold || 80;
    const criticalThreshold = this.config.criticalThreshold || 95;

    userStats.warnings = [];

    if (this.config.userDailyLimit) {
      const dailyPercent = (userStats.dailyUsage.cost / this.config.userDailyLimit) * 100;

      if (dailyPercent >= 100) {
        userStats.budgetStatus = 'exceeded';
        userStats.warnings.push('每日成本已超出限额');
      } else if (dailyPercent >= criticalThreshold) {
        userStats.budgetStatus = 'critical';
        userStats.warnings.push(`每日成本已达严重阈值 (${dailyPercent.toFixed(1)}%)`);
      } else if (dailyPercent >= warningThreshold) {
        userStats.budgetStatus = 'warning';
        userStats.warnings.push(`每日成本已达警告阈值 (${dailyPercent.toFixed(1)}%)`);
      } else {
        userStats.budgetStatus = 'healthy';
      }
    }
  }

  // 时间辅助函数
  private isNewDay(now: Date, lastReset: Date): boolean {
    return now.toDateString() !== lastReset.toDateString();
  }

  private isNewMonth(now: Date, lastReset: Date): boolean {
    return now.getFullYear() !== lastReset.getFullYear() ||
           now.getMonth() !== lastReset.getMonth();
  }

  private isNewMinute(now: Date, lastReset: Date): boolean {
    return now.getTime() - lastReset.getTime() >= 60000; // 1分钟
  }

  private isNewHour(now: Date, lastReset: Date): boolean {
    return now.getTime() - lastReset.getTime() >= 3600000; // 1小时
  }
}

/**
 * 创建成本控制器实例
 */
export function createCostController(config?: CostControlConfig): CostController {
  return new CostController(config);
}

/**
 * 默认成本控制器实例
 */
export const defaultCostController = createCostController();