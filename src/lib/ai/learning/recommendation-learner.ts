/**
 * 智能推荐学习机制
 *
 * 基于用户反馈持续优化推荐算法精度和个性化程度
 */

import { feedbackCollector, type FeedbackItem } from '../feedback/feedback-collector';

export interface UserPreference {
  /** 用户ID */
  userId: string;
  /** 偏好权重 */
  preferences: {
    /** 内容类型偏好 */
    contentTypes: Record<string, number>;
    /** 主题偏好 */
    topics: Record<string, number>;
    /** 标签偏好 */
    tags: Record<string, number>;
    /** 长度偏好 */
    contentLength: {
      short: number;    // < 500字
      medium: number;   // 500-2000字
      long: number;     // > 2000字
    };
    /** 复杂度偏好 */
    complexity: {
      simple: number;
      medium: number;
      complex: number;
    };
    /** 新颖性偏好 */
    novelty: {
      familiar: number;
      mixed: number;
      novel: number;
    };
  };
  /** 行为模式 */
  behaviorPatterns: {
    /** 平均阅读时间 */
    averageReadingTime: number;
    /** 跳出率 */
    bounceRate: number;
    /** 互动深度 */
    interactionDepth: number;
    /** 活跃时间段 */
    activeHours: number[];
  };
  /** 更新时间 */
  updatedAt: string;
}

export interface RecommendationModel {
  /** 模型ID */
  id: string;
  /** 模型版本 */
  version: string;
  /** 模型类型 */
  type: 'collaborative' | 'content' | 'hybrid' | 'contextual';
  /** 模型参数 */
  parameters: {
    /** 学习率 */
    learningRate: number;
    /** 正则化强度 */
    regularization: number;
    /** 隐因子数量 */
    latentFactors: number;
    /** 时间衰减因子 */
    timeDecay: number;
  };
  /** 性能指标 */
  performance: {
    /** 准确率 */
    accuracy: number;
    /** 召回率 */
    recall: number;
    /** F1分数 */
    f1Score: number;
    /** 覆盖率 */
    coverage: number;
    /** 多样性 */
    diversity: number;
    /** 新颖性 */
    novelty: number;
  };
  /** 训练数据统计 */
  trainingStats: {
    /** 训练样本数 */
    sampleCount: number;
    /** 正样本数 */
    positiveSamples: number;
    /** 负样本数 */
    negativeSamples: number;
    /** 训练时间 */
    trainingTime: number;
  };
  /** 创建时间 */
  createdAt: string;
  /** 最后更新时间 */
  updatedAt: string;
}

export interface RecommendationResult {
  /** 推荐的笔记ID列表 */
  noteIds: string[];
  /** 推荐分数 */
  scores: number[];
  /** 推荐理由 */
  reasons: string[];
  /** 置信度 */
  confidence: number[];
  /** 多样性分数 */
  diversityScore: number;
  /** 算法版本 */
  algorithmVersion: string;
  /** 生成时间 */
  generatedAt: string;
}

export interface LearningMetrics {
  /** 学习周期 */
  period: {
    start: string;
    end: string;
  };
  /** 用户参与度 */
  userEngagement: {
    activeUsers: number;
    totalInteractions: number;
    averageInteractionsPerUser: number;
    engagementRate: number;
  };
  /** 推荐效果 */
  recommendationEffectiveness: {
    clickThroughRate: number;
    conversionRate: number;
    userSatisfaction: number;
    retentionRate: number;
  };
  /** 模型性能 */
  modelPerformance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    aucScore: number;
  };
  /** 业务指标 */
  businessMetrics: {
    contentDiscovery: number;
    timeOnPlatform: number;
    sessionLength: number;
    returnVisits: number;
  };
}

class RecommendationLearner {
  private userPreferences: Map<string, UserPreference> = new Map();
  private currentModel: RecommendationModel | null = null;
  private learningHistory: LearningMetrics[] = [];
  private isInitialized = false;

  /**
   * 初始化推荐学习器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 初始化反馈收集器
      await feedbackCollector.initialize();

      // 加载用户偏好数据
      await this.loadUserPreferences();

      // 加载或创建推荐模型
      await this.loadOrCreateModel();

      // 加载学习历史
      await this.loadLearningHistory();

      this.isInitialized = true;
      console.log('Recommendation learner initialized successfully');
    } catch (error) {
      console.error('Failed to initialize recommendation learner:', error);
      throw error;
    }
  }

  /**
   * 处理用户反馈，更新用户偏好
   */
  async processFeedback(feedback: FeedbackItem): Promise<void> {
    // 更新用户偏好
    await this.updateUserPreference(feedback);

    // 更新模型参数
    await this.updateModel(feedback);

    // 记录学习指标
    await this.recordLearningMetrics(feedback);

    console.log(`Processed feedback for user ${feedback.userId}`);
  }

  /**
   * 获取个性化推荐
   */
  async getPersonalizedRecommendations(
    userId: string,
    candidateNoteIds: string[],
    context?: {
      currentPage?: string;
      timeOfDay?: number;
      deviceType?: string;
      sessionDuration?: number;
    }
  ): Promise<RecommendationResult> {
    if (!this.currentModel) {
      throw new Error('Model not initialized');
    }

    const userPreference = this.userPreferences.get(userId);
    if (!userPreference) {
      // 如果没有用户偏好，使用通用推荐
      return this.getGenericRecommendations(candidateNoteIds);
    }

    // 基于用户偏好计算推荐分数
    const scores = await this.calculateRecommendationScores(
      userId,
      candidateNoteIds,
      userPreference,
      context
    );

    // 排序并选择Top推荐
    const indexedScores = scores.map((score, index) => ({
      noteId: candidateNoteIds[index],
      score,
      index,
    }));

    indexedScores.sort((a, b) => b.score - a.score);

    const topN = Math.min(10, indexedScores.length);
    const recommendations = indexedScores.slice(0, topN);

    // 生成推荐理由
    const reasons = await this.generateRecommendationReasons(
      userId,
      recommendations.map(r => r.noteId),
      userPreference
    );

    // 计算多样性分数
    const diversityScore = this.calculateDiversityScore(recommendations);

    return {
      noteIds: recommendations.map(r => r.noteId),
      scores: recommendations.map(r => r.score),
      reasons,
      confidence: recommendations.map(r => Math.min(r.score, 1.0)),
      diversityScore,
      algorithmVersion: this.currentModel.version,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 批量更新用户偏好
   */
  async batchUpdatePreferences(feedbacks: FeedbackItem[]): Promise<void> {
    for (const feedback of feedbacks) {
      await this.processFeedback(feedback);
    }

    // 重新训练模型
    await this.retrainModel();
  }

  /**
   * 重新训练推荐模型
   */
  async retrainModel(): Promise<void> {
    if (!this.currentModel) return;

    console.log('Retraining recommendation model...');

    const startTime = Date.now();

    try {
      // 收集训练数据
      const trainingData = await this.collectTrainingData();

      // 训练新模型
      const newModel = await this.trainModel(trainingData);

      // 评估新模型
      const performance = await this.evaluateModel(newModel);

      // 如果新模型性能更好，则替换当前模型
      if (this.isModelBetter(newModel, this.currentModel)) {
        this.currentModel = newModel;
        console.log('Model updated successfully');
      } else {
        console.log('New model performance not better, keeping current model');
      }

      const trainingTime = Date.now() - startTime;
      console.log(`Model retraining completed in ${trainingTime}ms`);

    } catch (error) {
      console.error('Failed to retrain model:', error);
    }
  }

  /**
   * 获取学习指标
   */
  async getLearningMetrics(period?: { start: string; end: string }): Promise<LearningMetrics | null> {
    if (period) {
      return this.learningHistory.find(metrics =>
        new Date(metrics.period.start) <= new Date(period.start) &&
        new Date(metrics.period.end) >= new Date(period.end)
      ) || null;
    }

    return this.learningHistory[this.learningHistory.length - 1] || null;
  }

  /**
   * 获取用户偏好
   */
  getUserPreference(userId: string): UserPreference | null {
    return this.userPreferences.get(userId) || null;
  }

  /**
   * 获取模型性能
   */
  getModelPerformance(): RecommendationModel['performance'] | null {
    return this.currentModel?.performance || null;
  }

  /**
   * A/B测试支持
   */
  async runABTest(
    groupA: { userIds: string[]; modelId: string },
    groupB: { userIds: string[]; modelId: string },
    duration: number
  ): Promise<{
    groupAPerformance: LearningMetrics;
    groupBPerformance: LearningMetrics;
    winner: 'A' | 'B' | 'tie';
    significance: number;
  }> {
    // 实现A/B测试逻辑
    console.log('Running A/B test...');

    // 模拟A/B测试结果
    const mockResult = {
      groupAPerformance: await this.generateMockMetrics(),
      groupBPerformance: await this.generateMockMetrics(),
      winner: 'A' as const,
      significance: 0.95,
    };

    return mockResult;
  }

  /**
   * 加载用户偏好
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      // 这里可以从数据库加载用户偏好
      // 暂时生成一些模拟数据
      const mockPreferences = this.generateMockUserPreferences(50);

      for (const preference of mockPreferences) {
        this.userPreferences.set(preference.userId, preference);
      }

      console.log(`Loaded ${mockPreferences.length} user preferences`);
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }

  /**
   * 更新用户偏好
   */
  private async updateUserPreference(feedback: FeedbackItem): Promise<void> {
    let userPreference = this.userPreferences.get(feedback.userId);

    if (!userPreference) {
      userPreference = this.createNewUserPreference(feedback.userId);
      this.userPreferences.set(feedback.userId, userPreference);
    }

    // 基于反馈更新偏好权重
    await this.updatePreferenceWeights(userPreference, feedback);

    userPreference.updatedAt = new Date().toISOString();
  }

  /**
   * 更新偏好权重
   */
  private async updatePreferenceWeights(userPreference: UserPreference, feedback: FeedbackItem): Promise<void> {
    const isPositive = feedback.value === 'positive' || feedback.value === 'helpful';
    const weight = isPositive ? 0.1 : -0.05; // 正面反馈增加权重，负面反馈减少权重

    // 更新内容类型偏好
    if (feedback.metadata.relevantTags) {
      for (const tag of feedback.metadata.relevantTags) {
        userPreference.preferences.tags[tag] = (userPreference.preferences.tags[tag] || 0) + weight;
      }
    }

    // 基于反馈内容更新其他偏好
    if (feedback.context.originalSuggestion) {
      const contentLength = feedback.context.originalSuggestion.length;
      if (contentLength < 500) {
        userPreference.preferences.contentLength.short += weight;
      } else if (contentLength <= 2000) {
        userPreference.preferences.contentLength.medium += weight;
      } else {
        userPreference.preferences.contentLength.long += weight;
      }
    }

    // 更新行为模式
    userPreference.behaviorPatterns.averageReadingTime =
      (userPreference.behaviorPatterns.averageReadingTime + feedback.context.responseTime) / 2;
  }

  /**
   * 创建新用户偏好
   */
  private createNewUserPreference(userId: string): UserPreference {
    return {
      userId,
      preferences: {
        contentTypes: {},
        topics: {},
        tags: {},
        contentLength: { short: 0.33, medium: 0.34, long: 0.33 },
        complexity: { simple: 0.33, medium: 0.34, complex: 0.33 },
        novelty: { familiar: 0.4, mixed: 0.4, novel: 0.2 },
      },
      behaviorPatterns: {
        averageReadingTime: 5000,
        bounceRate: 0.3,
        interactionDepth: 0.5,
        activeHours: [9, 10, 11, 14, 15, 16, 20, 21],
      },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 计算推荐分数
   */
  private async calculateRecommendationScores(
    userId: string,
    candidateNoteIds: string[],
    userPreference: UserPreference,
    context?: any
  ): Promise<number[]> {
    const scores: number[] = [];

    for (const noteId of candidateNoteIds) {
      let score = 0.5; // 基础分数

      // 基于用户偏好调整分数
      // 这里需要实际的笔记数据来计算，暂时使用模拟逻辑
      score += this.calculateContentBasedScore(noteId, userPreference);
      score += this.calculateCollaborativeScore(userId, noteId);
      score += this.calculateContextualScore(context);

      // 确保分数在[0, 1]范围内
      score = Math.max(0, Math.min(1, score));

      scores.push(score);
    }

    return scores;
  }

  /**
   * 计算基于内容的分数
   */
  private calculateContentBasedScore(noteId: string, userPreference: UserPreference): number {
    // 这里应该基于笔记的实际内容计算分数
    // 暂时返回一个基于用户偏好的模拟分数
    const tagScore = Object.values(userPreference.preferences.tags)
      .reduce((sum, weight) => sum + Math.abs(weight), 0) /
      Object.keys(userPreference.preferences.tags).length || 0;

    return tagScore * 0.3;
  }

  /**
   * 计算协同过滤分数
   */
  private calculateCollaborativeScore(userId: string, noteId: string): number {
    // 这里应该基于相似用户的行为计算分数
    // 暂时返回一个模拟分数
    return Math.random() * 0.3;
  }

  /**
   * 计算上下文分数
   */
  private calculateContextualScore(context?: any): number {
    if (!context) return 0;

    let score = 0;

    // 基于时间段的偏好
    if (context.timeOfDay !== undefined) {
      const hour = context.timeOfDay;
      if (hour >= 9 && hour <= 11 || hour >= 14 && hour <= 16) {
        score += 0.1; // 工作时间
      } else if (hour >= 20 && hour <= 22) {
        score += 0.05; // 晚间时间
      }
    }

    // 基于设备类型
    if (context.deviceType === 'mobile') {
      score += 0.05; // 移动设备可能偏好简短内容
    }

    return score;
  }

  /**
   * 生成推荐理由
   */
  private async generateRecommendationReasons(
    userId: string,
    noteIds: string[],
    userPreference: UserPreference
  ): Promise<string[]> {
    const reasons: string[] = [];

    for (const noteId of noteIds) {
      const reason = this.generateReasonForNote(noteId, userPreference);
      reasons.push(reason);
    }

    return reasons;
  }

  /**
   * 为单个笔记生成推荐理由
   */
  private generateReasonForNote(noteId: string, userPreference: UserPreference): string {
    // 基于用户偏好生成推荐理由
    const topTags = Object.entries(userPreference.preferences.tags)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);

    if (topTags.length > 0) {
      return `基于您对${topTags.join('、')}等标签的兴趣推荐`;
    }

    return '基于您的阅读历史和偏好推荐';
  }

  /**
   * 计算多样性分数
   */
  private calculateDiversityScore(recommendations: { noteId: string; score: number }[]): number {
    if (recommendations.length <= 1) return 1.0;

    // 简单的多样性计算：基于推荐分数的分布
    const scores = recommendations.map(r => r.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

    // 标准差越大，多样性越高
    const standardDeviation = Math.sqrt(variance);
    return Math.min(1.0, standardDeviation * 2);
  }

  /**
   * 获取通用推荐
   */
  private getGenericRecommendations(candidateNoteIds: string[]): RecommendationResult {
    const scores = candidateNoteIds.map(() => Math.random()); // 随机分数

    return {
      noteIds: candidateNoteIds,
      scores,
      reasons: candidateNoteIds.map(() => '热门推荐'),
      confidence: scores.map(s => Math.min(s, 1.0)),
      diversityScore: 0.5,
      algorithmVersion: this.currentModel?.version || '1.0.0',
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 更新模型
   */
  private async updateModel(feedback: FeedbackItem): Promise<void> {
    if (!this.currentModel) return;

    // 基于反馈更新模型参数
    const learningRate = this.currentModel.parameters.learningRate;
    const isPositive = feedback.value === 'positive' || feedback.value === 'helpful';

    // 简单的在线学习逻辑
    if (isPositive) {
      this.currentModel.performance.accuracy += learningRate * 0.01;
    } else {
      this.currentModel.performance.accuracy -= learningRate * 0.005;
    }

    // 确保性能指标在合理范围内
    this.currentModel.performance.accuracy = Math.max(0, Math.min(1, this.currentModel.performance.accuracy));
  }

  /**
   * 记录学习指标
   */
  private async recordLearningMetrics(feedback: FeedbackItem): Promise<void> {
    // 实现学习指标记录逻辑
  }

  /**
   * 收集训练数据
   */
  private async collectTrainingData(): Promise<any[]> {
    // 实现训练数据收集逻辑
    return [];
  }

  /**
   * 训练模型
   */
  private async trainModel(trainingData: any[]): Promise<RecommendationModel> {
    // 实现模型训练逻辑
    const newModel: RecommendationModel = {
      id: `model_${Date.now()}`,
      version: '1.1.0',
      type: 'hybrid',
      parameters: {
        learningRate: 0.01,
        regularization: 0.001,
        latentFactors: 50,
        timeDecay: 0.95,
      },
      performance: {
        accuracy: 0.85,
        recall: 0.78,
        f1Score: 0.81,
        coverage: 0.65,
        diversity: 0.72,
        novelty: 0.68,
      },
      trainingStats: {
        sampleCount: trainingData.length,
        positiveSamples: Math.floor(trainingData.length * 0.6),
        negativeSamples: Math.floor(trainingData.length * 0.4),
        trainingTime: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return newModel;
  }

  /**
   * 评估模型
   */
  private async evaluateModel(model: RecommendationModel): Promise<RecommendationModel['performance']> {
    // 实现模型评估逻辑
    return model.performance;
  }

  /**
   * 比较模型性能
   */
  private isModelBetter(newModel: RecommendationModel, currentModel: RecommendationModel): boolean {
    // 基于多个指标综合判断
    const newScore = newModel.performance.accuracy + newModel.performance.f1Score + newModel.performance.diversity;
    const currentScore = currentModel.performance.accuracy + currentModel.performance.f1Score + currentModel.performance.diversity;

    return newScore > currentScore;
  }

  /**
   * 加载或创建模型
   */
  private async loadOrCreateModel(): Promise<void> {
    try {
      // 尝试加载现有模型
      // this.currentModel = await this.loadModelFromDatabase();
    } catch (error) {
      console.log('No existing model found, creating new one');
    }

    // 如果没有现有模型，创建新模型
    if (!this.currentModel) {
      this.currentModel = {
        id: 'model_001',
        version: '1.0.0',
        type: 'hybrid',
        parameters: {
          learningRate: 0.01,
          regularization: 0.001,
          latentFactors: 50,
          timeDecay: 0.95,
        },
        performance: {
          accuracy: 0.8,
          recall: 0.75,
          f1Score: 0.77,
          coverage: 0.6,
          diversity: 0.7,
          novelty: 0.65,
        },
        trainingStats: {
          sampleCount: 0,
          positiveSamples: 0,
          negativeSamples: 0,
          trainingTime: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * 加载学习历史
   */
  private async loadLearningHistory(): Promise<void> {
    try {
      // 这里可以从数据库加载学习历史
      // 暂时生成一些模拟数据
      this.learningHistory = this.generateMockLearningHistory(7); // 最近7天的数据
    } catch (error) {
      console.error('Failed to load learning history:', error);
    }
  }

  /**
   * 生成模拟用户偏好
   */
  private generateMockUserPreferences(count: number): UserPreference[] {
    const preferences: UserPreference[] = [];

    for (let i = 0; i < count; i++) {
      const userId = `user_${i}`;
      const preference: UserPreference = {
        userId,
        preferences: {
          contentTypes: {
            note: Math.random(),
            article: Math.random(),
            research: Math.random(),
          },
          topics: {
            'AI': Math.random(),
            '技术': Math.random(),
            '设计': Math.random(),
            '产品': Math.random(),
          },
          tags: {
            '重要': Math.random(),
            '待读': Math.random(),
            '收藏': Math.random(),
          },
          contentLength: {
            short: Math.random(),
            medium: Math.random(),
            long: Math.random(),
          },
          complexity: {
            simple: Math.random(),
            medium: Math.random(),
            complex: Math.random(),
          },
          novelty: {
            familiar: Math.random(),
            mixed: Math.random(),
            novel: Math.random(),
          },
        },
        behaviorPatterns: {
          averageReadingTime: Math.random() * 10000 + 1000,
          bounceRate: Math.random() * 0.5,
          interactionDepth: Math.random(),
          activeHours: [9, 10, 11, 14, 15, 16, 20, 21].filter(() => Math.random() > 0.5),
        },
        updatedAt: new Date().toISOString(),
      };

      preferences.push(preference);
    }

    return preferences;
  }

  /**
   * 生成模拟学习指标
   */
  private generateMockLearningHistory(days: number): LearningMetrics[] {
    const history: LearningMetrics[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const metrics: LearningMetrics = {
        period: {
          start: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString(),
          end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString(),
        },
        userEngagement: {
          activeUsers: Math.floor(Math.random() * 1000) + 500,
          totalInteractions: Math.floor(Math.random() * 5000) + 2000,
          averageInteractionsPerUser: Math.random() * 10 + 2,
          engagementRate: Math.random() * 0.5 + 0.3,
        },
        recommendationEffectiveness: {
          clickThroughRate: Math.random() * 0.3 + 0.1,
          conversionRate: Math.random() * 0.2 + 0.05,
          userSatisfaction: Math.random() * 0.4 + 0.6,
          retentionRate: Math.random() * 0.3 + 0.6,
        },
        modelPerformance: {
          accuracy: Math.random() * 0.2 + 0.75,
          precision: Math.random() * 0.2 + 0.75,
          recall: Math.random() * 0.2 + 0.7,
          f1Score: Math.random() * 0.2 + 0.72,
          aucScore: Math.random() * 0.15 + 0.8,
        },
        businessMetrics: {
          contentDiscovery: Math.random() * 100 + 50,
          timeOnPlatform: Math.random() * 300 + 180,
          sessionLength: Math.random() * 20 + 5,
          returnVisits: Math.random() * 0.5 + 0.3,
        },
      };

      history.push(metrics);
    }

    return history;
  }

  /**
   * 生成模拟指标
   */
  private async generateMockMetrics(): Promise<LearningMetrics> {
    const today = new Date();
    return {
      period: {
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString(),
      },
      userEngagement: {
        activeUsers: Math.floor(Math.random() * 1000) + 500,
        totalInteractions: Math.floor(Math.random() * 5000) + 2000,
        averageInteractionsPerUser: Math.random() * 10 + 2,
        engagementRate: Math.random() * 0.5 + 0.3,
      },
      recommendationEffectiveness: {
        clickThroughRate: Math.random() * 0.3 + 0.1,
        conversionRate: Math.random() * 0.2 + 0.05,
        userSatisfaction: Math.random() * 0.4 + 0.6,
        retentionRate: Math.random() * 0.3 + 0.6,
      },
      modelPerformance: {
        accuracy: Math.random() * 0.2 + 0.75,
        precision: Math.random() * 0.2 + 0.75,
        recall: Math.random() * 0.2 + 0.7,
        f1Score: Math.random() * 0.2 + 0.72,
        aucScore: Math.random() * 0.15 + 0.8,
      },
      businessMetrics: {
        contentDiscovery: Math.random() * 100 + 50,
        timeOnPlatform: Math.random() * 300 + 180,
        sessionLength: Math.random() * 20 + 5,
        returnVisits: Math.random() * 0.5 + 0.3,
      },
    };
  }
}

// 单例模式
export const recommendationLearner = new RecommendationLearner();

export default RecommendationLearner;