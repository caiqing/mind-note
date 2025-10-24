/**
 * AI分析服务
 */

// 类型定义
export interface AIAnalysisRequest {
  noteId: string;
  title: string;
  content: string;
  operations: AIAnalysisOperation[];
  options?: AIAnalysisOptions;
}

export interface AIAnalysisOptions {
  language?: 'zh' | 'en';
  quality?: 'fast' | 'balanced' | 'thorough';
  provider?: string;
  maxTokens?: number;
  temperature?: number;
}

export type AIAnalysisOperation =
  | 'categorize'
  | 'tag'
  | 'summarize'
  | 'keywords'
  | 'sentiment';

export interface AIAnalysisResult {
  success: boolean;
  results: {
    category?: string;
    tags?: string[];
    summary?: string;
    keywords?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
    confidence?: number;
  };
  error?: string;
  processingTime: number;
  tokensUsed?: number;
}

export interface AIAnalysisProgress {
  operation: AIAnalysisOperation;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
  error?: string;
}

export interface AIOperation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  estimatedTime: number;
}

// AI分析服务主类
export class AIAnalysisService {
  private supportedOperations: AIOperation[] = [
    {
      id: 'categorize',
      name: '分类识别',
      description: '自动识别笔记的类别',
      enabled: true,
      estimatedTime: 2000,
    },
    {
      id: 'tag',
      name: '标签提取',
      description: '从内容中提取相关标签',
      enabled: true,
      estimatedTime: 1500,
    },
    {
      id: 'summarize',
      name: '内容摘要',
      description: '生成内容摘要',
      enabled: true,
      estimatedTime: 3000,
    },
    {
      id: 'keywords',
      name: '关键词提取',
      description: '提取关键词',
      enabled: true,
      estimatedTime: 1000,
    },
    {
      id: 'sentiment',
      name: '情感分析',
      description: '分析内容的情感倾向',
      enabled: true,
      estimatedTime: 1500,
    },
  ];

  constructor() {}

  /**
   * 分析笔记
   */
  async analyzeNote(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    try {
      // 验证输入
      this.validateRequest(request);

      const results: any = {};

      // 按顺序执行每个操作
      for (const operation of request.operations) {
        const operationResult = await this.performOperation(
          operation,
          request,
          request.options,
        );
        Object.assign(results, operationResult);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        results,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        results: {},
        error: error instanceof Error ? error.message : '未知错误',
        processingTime,
      };
    }
  }

  /**
   * 带进度的分析笔记
   */
  async analyzeNoteWithProgress(
    request: AIAnalysisRequest,
    progressCallback?: (progress: AIAnalysisProgress) => void,
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    const totalOperations = request.operations.length;
    const results: any = {};

    try {
      // 验证输入
      this.validateRequest(request);

      // 如果没有操作，直接返回
      if (totalOperations === 0) {
        return {
          success: true,
          results: {},
          processingTime: Date.now() - startTime,
        };
      }

      // 按顺序执行每个操作并报告进度
      for (let i = 0; i < totalOperations; i++) {
        const operation = request.operations[i];

        // 报告开始处理
        progressCallback?.({
          operation,
          status: 'processing',
          progress: (i / totalOperations) * 100,
        });

        // 执行操作
        const operationResult = await this.performOperation(
          operation,
          request,
          request.options,
        );
        Object.assign(results, operationResult);

        // 报告完成
        progressCallback?.({
          operation,
          status: 'completed',
          progress: ((i + 1) / totalOperations) * 100,
        });
      }

      // 报告全部完成
      progressCallback?.({
        operation: 'all',
        status: 'completed',
        progress: 100,
      });

      return {
        success: true,
        results,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      progressCallback?.({
        operation: 'error',
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : '未知错误',
      });

      return {
        success: false,
        results: {},
        error: error instanceof Error ? error.message : '未知错误',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 获取支持的操作
   */
  getSupportedOperations(): AIOperation[] {
    return [...this.supportedOperations];
  }

  /**
   * 验证请求参数
   */
  private validateRequest(request: AIAnalysisRequest): void {
    if (!request.noteId) {
      throw new Error('笔记ID不能为空');
    }

    if (!request.title && !request.content) {
      throw new Error('标题和内容不能同时为空');
    }

    if (!request.operations || request.operations.length === 0) {
      throw new Error('至少需要指定一个分析操作');
    }

    // 验证操作是否有效
    const validOperations = this.supportedOperations.map(op => op.id);
    const invalidOperations = request.operations.filter(
      op => !validOperations.includes(op),
    );

    if (invalidOperations.length > 0) {
      throw new Error(`不支持的操作: ${invalidOperations.join(', ')}`);
    }
  }

  /**
   * 执行单个操作
   */
  private async performOperation(
    operation: AIAnalysisOperation,
    request: AIAnalysisRequest,
    options?: AIAnalysisOptions,
  ): Promise<any> {
    // 模拟处理延迟
    const operationInfo = this.supportedOperations.find(
      op => op.id === operation,
    );
    if (operationInfo) {
      await this.delay(operationInfo.estimatedTime);
    }

    switch (operation) {
    case 'categorize':
      return this.categorizeContent(request);
    case 'tag':
      return this.extractTags(request);
    case 'summarize':
      return this.generateSummary(request);
    case 'keywords':
      return this.extractKeywords(request);
    case 'sentiment':
      return this.analyzeSentiment(request);
    default:
      throw new Error(`不支持的操作: ${operation}`);
    }
  }

  /**
   * 分类内容
   */
  private async categorizeContent(
    request: AIAnalysisRequest,
  ): Promise<{ category: string; confidence: number }> {
    const { title, content } = request;
    const fullText = `${title} ${content}`.toLowerCase();

    // 简化的分类逻辑
    const categories = [
      {
        name: '技术',
        keywords: [
          'react',
          'javascript',
          '代码',
          '编程',
          '开发',
          '技术',
          '算法',
          'api',
        ],
      },
      {
        name: '学习',
        keywords: [
          '学习',
          '笔记',
          '教程',
          '课程',
          '知识',
          '教育',
          '培训',
          '理解',
        ],
      },
      {
        name: '工作',
        keywords: [
          '工作',
          '项目',
          '会议',
          '计划',
          '任务',
          '管理',
          '团队',
          '业务',
        ],
      },
      {
        name: '生活',
        keywords: [
          '生活',
          '日常',
          '思考',
          '感悟',
          '日记',
          '个人',
          '健康',
          '旅行',
        ],
      },
      {
        name: '创意',
        keywords: [
          '创意',
          '想法',
          '灵感',
          '设计',
          '艺术',
          '创作',
          '创新',
          '想象',
        ],
      },
    ];

    let bestMatch = { category: '其他', confidence: 0.5 };

    for (const category of categories) {
      const matches = category.keywords.filter(keyword =>
        fullText.includes(keyword),
      ).length;
      const confidence = matches / category.keywords.length;

      if (confidence > bestMatch.confidence) {
        bestMatch = { category: category.name, confidence };
      }
    }

    return {
      category: bestMatch.category,
      confidence: Math.min(bestMatch.confidence + 0.2, 0.95), // 添加基础置信度
    };
  }

  /**
   * 提取标签
   */
  private async extractTags(
    request: AIAnalysisRequest,
  ): Promise<{ tags: string[] }> {
    const { title, content } = request;
    const fullText = `${title} ${content}`;

    // 预定义的标签库
    const tagLibrary = [
      'React',
      'Vue',
      'JavaScript',
      'TypeScript',
      'Node.js',
      '前端',
      '后端',
      '全栈',
      '数据库',
      'API',
      '算法',
      '数据结构',
      '设计模式',
      '架构',
      '性能优化',
      '测试',
      '安全',
      '部署',
      '工具',
      '框架',
      '库',
      '组件',
      '学习',
      '教程',
      '文档',
      '总结',
      '项目',
      '经验',
      '思考',
      '感悟',
    ];

    // 提取匹配的标签
    const tags = tagLibrary
      .filter(tag => fullText.toLowerCase().includes(tag.toLowerCase()))
      .slice(0, 8); // 最多返回8个标签

    return { tags };
  }

  /**
   * 生成摘要
   */
  private async generateSummary(
    request: AIAnalysisRequest,
  ): Promise<{ summary: string }> {
    const { title, content } = request;
    const fullText = `${title}\n\n${content}`;

    // 简化的摘要生成逻辑
    const sentences = fullText
      .split(/[。！？.!?]/)
      .filter(s => s.trim().length > 10);

    if (sentences.length === 0) {
      return { summary: '内容较短，无法生成摘要' };
    }

    // 选择前3个句子作为摘要
    const summarySentences = sentences.slice(0, 3);
    let summary = summarySentences.join('。');

    // 确保摘要以句号结尾
    if (!summary.endsWith('。')) {
      summary += '。';
    }

    // 限制摘要长度
    if (summary.length > 200) {
      summary = summary.substring(0, 200) + '...';
    }

    return { summary };
  }

  /**
   * 提取关键词
   */
  private async extractKeywords(
    request: AIAnalysisRequest,
  ): Promise<{ keywords: string[] }> {
    const { title, content } = request;
    const fullText = `${title} ${content}`.toLowerCase();

    // 简单的关键词提取
    const words = fullText.split(/\s+/);
    const wordCount = new Map<string, number>();

    // 统计词频
    words.forEach(word => {
      // 过滤掉常见的停用词
      const stopWords = [
        '的',
        '了',
        '是',
        '在',
        '有',
        '和',
        '就',
        '不',
        '人',
        '都',
        '一',
        '一个',
        '上',
        '也',
        '很',
        '到',
        '说',
        '要',
        '去',
        '你',
        '会',
        '着',
        '没有',
        '看',
        '好',
        '自己',
        '这',
      ];

      if (word.length > 1 && !stopWords.includes(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    // 获取高频词
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return { keywords: sortedWords };
  }

  /**
   * 分析情感
   */
  private async analyzeSentiment(
    request: AIAnalysisRequest,
  ): Promise<{ sentiment: 'positive' | 'negative' | 'neutral' }> {
    const { title, content } = request;
    const fullText = `${title} ${content}`.toLowerCase();

    // 简化的情感分析
    const positiveWords = [
      '好',
      '棒',
      '优秀',
      '成功',
      '喜欢',
      '爱',
      '快乐',
      '满意',
      '完美',
      '精彩',
      '美好',
      '赞',
      '不错',
      '很棒',
      '太好了',
    ];
    const negativeWords = [
      '坏',
      '糟糕',
      '失败',
      '困难',
      '问题',
      '麻烦',
      '讨厌',
      '不满',
      '失望',
      '难过',
      '悲伤',
      '不好',
      '很糟',
      '糟糕',
    ];

    const positiveCount = positiveWords.filter(word =>
      fullText.includes(word),
    ).length;
    const negativeCount = negativeWords.filter(word =>
      fullText.includes(word),
    ).length;

    if (positiveCount > negativeCount * 1.5) {
      return { sentiment: 'positive' };
    } else if (negativeCount > positiveCount * 1.5) {
      return { sentiment: 'negative' };
    } else {
      return { sentiment: 'neutral' };
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例实例
export const aiAnalysisService = new AIAnalysisService();
