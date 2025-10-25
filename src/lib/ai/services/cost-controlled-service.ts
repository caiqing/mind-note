/**
 * 成本控制服务包装器 - T103.8
 * 为AI服务添加成本控制和速率限制功能
 */

import { CostController, createCostController, CostControlConfig } from '../cost-control';
import {
  createSummaryService,
  SummaryRequest,
  SummaryResult
} from './summary-service';
import {
  createKeywordService,
  KeywordRequest,
  KeywordResult
} from './keyword-service';
import {
  createSentimentService,
  SentimentRequest,
  SentimentResult
} from './sentiment-service';
import {
  createConceptService,
  ConceptRequest,
  ConceptResult
} from './concept-service';

export interface CostControlledServiceConfig extends CostControlConfig {
  // 服务配置
  enableUsageLogging?: boolean;
  enableDetailedTracking?: boolean;
  logStoragePath?: string;

  // 行为配置
  blockOnBudgetExceeded?: boolean;
  autoSelectCheapestProvider?: boolean;
}

export interface ServiceUsageContext {
  userId: string;
  operation: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface CostControlledResult<T> {
  result?: T;
  allowed: boolean;
  reason?: string;
  estimatedCost?: number;
  actualCost?: number;
  warnings?: string[];
  suggestedAlternatives?: string[];
}

/**
 * 成本控制的服务包装器基类
 */
abstract class CostControlledService {
  protected costController: CostController;
  protected config: CostControlledServiceConfig;

  constructor(config: CostControlledServiceConfig = {}) {
    this.config = {
      enableUsageLogging: true,
      enableDetailedTracking: true,
      blockOnBudgetExceeded: true,
      autoSelectCheapestProvider: true,
      ...config
    };

    this.costController = createCostController(this.config);
  }

  /**
   * 执行成本检查
   */
  protected async checkCostControl(
    context: ServiceUsageContext,
    estimatedTokens: { input: number; output: number },
    provider?: string
  ) {
    const checkResult = await this.costController.checkRequestAllowed(
      context.userId,
      context.operation,
      estimatedTokens,
      provider
    );

    // 如果不允许执行且配置为阻塞模式
    if (!checkResult.allowed && this.config.blockOnBudgetExceeded) {
      return {
        allowed: false,
        reason: checkResult.reason,
        estimatedCost: checkResult.estimatedCost,
        warnings: checkResult.warnings,
        suggestedAlternatives: checkResult.suggestedAlternatives
      };
    }

    return checkResult;
  }

  /**
   * 记录使用量
   */
  protected recordUsage(
    context: ServiceUsageContext,
    provider: string,
    actualCost: number,
    actualTokens: number
  ): void {
    if (!this.config.enableUsageLogging) return;

    this.costController.recordUsage(
      context.userId,
      context.operation,
      provider,
      actualCost,
      actualTokens,
      {
        sessionId: context.sessionId,
        ...context.metadata
      }
    );
  }

  /**
   * 包装服务执行结果
   */
  protected wrapResult<T>(
    result: T,
    allowed: boolean,
    cost?: number,
    warnings?: string[],
    reason?: string
  ): CostControlledResult<T> {
    return {
      result,
      allowed,
      actualCost: cost,
      warnings,
      reason
    };
  }
}

/**
 * 成本控制的摘要服务
 */
export class CostControlledSummaryService extends CostControlledService {
  private summaryService: ReturnType<typeof createSummaryService>;

  constructor(config: CostControlledServiceConfig = {}) {
    super(config);
    this.summaryService = createSummaryService();
  }

  async generateSummary(
    request: SummaryRequest,
    context: ServiceUsageContext
  ): Promise<CostControlledResult<SummaryResult>> {
    try {
      // 估算Token数（简单估算：字符数/4）
      const estimatedInputTokens = Math.ceil(request.content.length / 4);
      const estimatedOutputTokens = 150; // 摘要通常150 tokens

      // 成本检查
      const costCheck = await this.checkCostControl(
        context,
        { input: estimatedInputTokens, output: estimatedOutputTokens }
      );

      if (!costCheck.allowed && this.config.blockOnBudgetExceeded) {
        return this.wrapResult(
          undefined,
          false,
          costCheck.estimatedCost,
          costCheck.warnings,
          costCheck.reason
        );
      }

      // 执行摘要生成
      const result = await this.summaryService.generateSummary(request);

      // 记录使用量
      this.recordUsage(
        context,
        result.provider,
        result.cost,
        result.tokens.total
      );

      // 合并警告信息
      const allWarnings = [
        ...(costCheck.warnings || []),
        ...(result.cost > 0.01 ? [`💰 本次操作成本: $${result.cost.toFixed(4)}`] : [])
      ];

      return this.wrapResult(
        result,
        true,
        result.cost,
        allWarnings
      );

    } catch (error) {
      return this.wrapResult(
        undefined,
        false,
        undefined,
        [`❌ 摘要生成失败: ${error instanceof Error ? error.message : '未知错误'}`]
      );
    }
  }
}

/**
 * 成本控制的关键词服务
 */
export class CostControlledKeywordService extends CostControlledService {
  private keywordService: ReturnType<typeof createKeywordService>;

  constructor(config: CostControlledServiceConfig = {}) {
    super(config);
    this.keywordService = createKeywordService();
  }

  async extractKeywords(
    request: KeywordRequest,
    context: ServiceUsageContext
  ): Promise<CostControlledResult<KeywordResult>> {
    try {
      // 估算Token数
      const estimatedInputTokens = Math.ceil(request.content.length / 4);
      const estimatedOutputTokens = request.options?.maxKeywords ? request.options.maxKeywords * 2 : 20;

      // 成本检查
      const costCheck = await this.checkCostControl(
        context,
        { input: estimatedInputTokens, output: estimatedOutputTokens }
      );

      if (!costCheck.allowed && this.config.blockOnBudgetExceeded) {
        return this.wrapResult(
          undefined,
          false,
          costCheck.estimatedCost,
          costCheck.warnings,
          costCheck.reason
        );
      }

      // 执行关键词提取
      const result = await this.keywordService.extractKeywords(request);

      // 记录使用量
      this.recordUsage(
        context,
        result.provider,
        result.cost,
        result.tokens.total
      );

      // 合并警告信息
      const allWarnings = [
        ...(costCheck.warnings || []),
        ...(result.cost > 0.005 ? [`💰 本次操作成本: $${result.cost.toFixed(4)}`] : [])
      ];

      return this.wrapResult(
        result,
        true,
        result.cost,
        allWarnings
      );

    } catch (error) {
      return this.wrapResult(
        undefined,
        false,
        undefined,
        [`❌ 关键词提取失败: ${error instanceof Error ? error.message : '未知错误'}`]
      );
    }
  }
}

/**
 * 成本控制的情感分析服务
 */
export class CostControlledSentimentService extends CostControlledService {
  private sentimentService: ReturnType<typeof createSentimentService>;

  constructor(config: CostControlledServiceConfig = {}) {
    super(config);
    this.sentimentService = createSentimentService();
  }

  async analyzeSentiment(
    request: SentimentRequest,
    context: ServiceUsageContext
  ): Promise<CostControlledResult<SentimentResult>> {
    try {
      // 估算Token数
      const estimatedInputTokens = Math.ceil(request.content.length / 4);
      const estimatedOutputTokens = 50; // 情感分析通常较短

      // 成本检查
      const costCheck = await this.checkCostControl(
        context,
        { input: estimatedInputTokens, output: estimatedOutputTokens }
      );

      if (!costCheck.allowed && this.config.blockOnBudgetExceeded) {
        return this.wrapResult(
          undefined,
          false,
          costCheck.estimatedCost,
          costCheck.warnings,
          costCheck.reason
        );
      }

      // 执行情感分析
      const result = await this.sentimentService.analyzeSentiment(request);

      // 记录使用量
      this.recordUsage(
        context,
        result.provider,
        result.cost,
        result.tokens.total
      );

      // 合并警告信息
      const allWarnings = [
        ...(costCheck.warnings || []),
        ...(result.cost > 0.003 ? [`💰 本次操作成本: $${result.cost.toFixed(4)}`] : [])
      ];

      return this.wrapResult(
        result,
        true,
        result.cost,
        allWarnings
      );

    } catch (error) {
      return this.wrapResult(
        undefined,
        false,
        undefined,
        [`❌ 情感分析失败: ${error instanceof Error ? error.message : '未知错误'}`]
      );
    }
  }
}

/**
 * 成本控制的概念识别服务
 */
export class CostControlledConceptService extends CostControlledService {
  private conceptService: ReturnType<typeof createConceptService>;

  constructor(config: CostControlledServiceConfig = {}) {
    super(config);
    this.conceptService = createConceptService();
  }

  async extractConcepts(
    request: ConceptRequest,
    context: ServiceUsageContext
  ): Promise<CostControlledResult<ConceptResult>> {
    try {
      // 估算Token数
      const estimatedInputTokens = Math.ceil(request.content.length / 4);
      const estimatedOutputTokens = request.options?.maxConcepts ? request.options.maxConcepts * 10 : 60;

      // 成本检查
      const costCheck = await this.checkCostControl(
        context,
        { input: estimatedInputTokens, output: estimatedOutputTokens }
      );

      if (!costCheck.allowed && this.config.blockOnBudgetExceeded) {
        return this.wrapResult(
          undefined,
          false,
          costCheck.estimatedCost,
          costCheck.warnings,
          costCheck.reason
        );
      }

      // 执行概念识别
      const result = await this.conceptService.extractConcepts(request);

      // 记录使用量
      this.recordUsage(
        context,
        result.provider,
        result.cost,
        result.tokens.total
      );

      // 合并警告信息
      const allWarnings = [
        ...(costCheck.warnings || []),
        ...(result.cost > 0.008 ? [`💰 本次操作成本: $${result.cost.toFixed(4)}`] : [])
      ];

      return this.wrapResult(
        result,
        true,
        result.cost,
        allWarnings
      );

    } catch (error) {
      return this.wrapResult(
        undefined,
        false,
        undefined,
        [`❌ 概念识别失败: ${error instanceof Error ? error.message : '未知错误'}`]
      );
    }
  }
}

/**
 * 服务工厂函数
 */
export function createCostControlledServices(
  config?: CostControlledServiceConfig
) {
  return {
    summary: new CostControlledSummaryService(config),
    keywords: new CostControlledKeywordService(config),
    sentiment: new CostControlledSentimentService(config),
    concepts: new CostControlledConceptService(config),
    costController: new CostController(config)
  };
}

/**
 * 使用统计服务
 */
export class UsageAnalyticsService {
  private costController: CostController;

  constructor(costController: CostController) {
    this.costController = costController;
  }

  /**
   * 获取用户使用报告
   */
  getUserUsageReport(userId: string) {
    const stats = this.costController.getUserUsageStats(userId);
    const analysis = this.costController.getCostAnalysisReport(userId);
    const history = this.costController.getUsageHistory(userId, undefined, undefined, 50);

    if (!stats) {
      return {
        userId,
        status: 'no_data',
        message: '该用户暂无使用记录'
      };
    }

    return {
      userId,
      status: stats.budgetStatus,
      warnings: stats.warnings,
      currentUsage: {
        daily: stats.dailyUsage,
        monthly: stats.monthlyUsage,
        rateLimit: stats.rateLimit
      },
      analytics: analysis,
      recentHistory: history.slice(0, 10)
    };
  }

  /**
   * 获取全局使用报告
   */
  getGlobalUsageReport() {
    const analysis = this.costController.getCostAnalysisReport();
    const providerCosts = this.costController.getProviderCostInfo();
    const recentHistory = this.costController.getUsageHistory(undefined, undefined, undefined, 100);

    return {
      totalStats: analysis,
      providerCosts,
      recentActivity: recentHistory.slice(0, 20),
      timestamp: new Date()
    };
  }
}

/**
 * 创建使用分析服务
 */
export function createUsageAnalyticsService(costController?: CostController): UsageAnalyticsService {
  const controller = costController || createCostController();
  return new UsageAnalyticsService(controller);
}