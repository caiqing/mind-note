/**
 * 智能标签生成系统类型定义 - T105
 * 定义标签生成、管理和权重系统的数据结构和接口
 */

export interface ContentTag {
  id: string;
  name: string;
  type: TagType;
  category: TagCategory;
  relevanceScore: number; // 相关性评分 0-1
  weight: number; // 标签权重 0-1
  source: TagSource; // 标签来源
  confidence: number; // 置信度 0-1
  count: number; // 使用次数
  lastUsed: Date;
  createdBy: 'ai' | 'user';
  parentId?: string; // 支持标签层级
  children?: string[]; // 子标签ID列表
  metadata?: TagMetadata;
}

export enum TagType {
  CORE = 'core', // 核心标签 - 内容最主要的概念
  RELATED = 'related', // 相关标签 - 相关概念和术语
  EMOTIONAL = 'emotional', // 情感标签 - 情感色彩和态度
  ACTIONABLE = 'actionable', // 行动标签 - 可执行的任务或建议
  REFERENCE = 'reference', // 参考标签 - 引用和参考信息
  TEMPORAL = 'temporal', // 时间标签 - 时间相关
  LOCATION = 'location', // 位置标签 - 地理位置相关
  PERSON = 'person', // 人物标签 - 人物相关
  ORGANIZATION = 'organization', // 组织标签 - 组织机构相关
  CUSTOM = 'custom' // 自定义标签
}

export enum TagCategory {
  CONTENT = 'content', // 内容相关
  DOMAIN = 'domain', // 领域相关
  SKILL = 'skill', // 技能相关
  TOOL = 'tool', // 工具相关
  CONCEPT = 'concept', // 概念相关
  TASK = 'task', // 任务相关
  RESOURCE = 'resource', // 资源相关
  REFERENCE = 'reference', // 参考相关
  PERSONAL = 'personal', // 个人相关
  SYSTEM = 'system' // 系统标签
}

export enum TagSource {
  AI_GENERATED = 'ai_generated', // AI自动生成
  KEYWORD_EXTRACTION = 'keyword_extraction', // 关键词提取
  CONCEPT_ANALYSIS = 'concept_analysis', // 概念分析
  SENTIMENT_ANALYSIS = 'sentiment_analysis', // 情感分析
  CLASSIFICATION_BASED = 'classification_based', // 基于分类结果
  USER_DEFINED = 'user_defined', // 用户定义
  IMPORTED = 'imported', // 导入的标签
  INHERITED = 'inherited' // 继承的标签
}

export interface TagMetadata {
  color?: string; // 标签颜色
  icon?: string; // 标签图标
  description?: string; // 标签描述
  aliases?: string[]; // 别名
  synonyms?: string[]; // 同义词
  relatedTags?: string[]; // 相关标签ID
  difficulty?: 'beginner' | 'intermediate' | 'advanced'; // 难度级别
  priority?: 'low' | 'medium' | 'high' | 'critical'; // 优先级
  expirationDate?: Date; // 过期时间
  isActive: boolean; // 是否激活
}

export interface TagGenerationRequest {
  content: string;
  userId: string;
  options?: TagGenerationOptions;
  existingTags?: string[]; // 已有标签ID列表
  context?: TagGenerationContext;
}

export interface TagGenerationOptions {
  maxTags?: number; // 最大标签数量，默认5
  minRelevance?: number; // 最小相关性评分，默认0.3
  includeTypes?: TagType[]; // 包含的标签类型
  excludeTypes?: TagType[]; // 排除的标签类型
  includeCategories?: TagCategory[]; // 包含的标签类别
  excludeCategories?: TagCategory[]; // 排除的标签类别
  language?: 'zh' | 'en' | 'auto'; // 语言设置，默认auto
  customTagLibrary?: string[]; // 自定义标签库
  enableHierarchical?: boolean; // 是否启用层级标签，默认true
  enableWeightOptimization?: boolean; // 是否启用权重优化，默认true
  preferUserTags?: boolean; // 是否偏好用户历史标签，默认true
}

export interface TagGenerationContext {
  documentType?: 'note' | 'article' | 'task' | 'diary' | 'meeting' | 'research';
  domain?: string; // 领域上下文
  previousTags?: string[]; // 之前的标签
  userPreferences?: UserTagPreferences;
  sessionTags?: string[]; // 当前会话的标签
}

export interface UserTagPreferences {
  preferredTypes: TagType[];
  preferredCategories: TagCategory[];
  frequentlyUsed: string[]; // 频繁使用的标签ID
  tagWeights: Record<string, number>; // 自定义标签权重
  disabledTags: string[]; // 禁用的标签ID
}

export interface TagGenerationResult {
  content: string;
  userId: string;
  timestamp: Date;
  tags: GeneratedTag[];
  metadata: TagGenerationMetadata;
  suggestions?: TagSuggestion[];
}

export interface GeneratedTag {
  tag: ContentTag;
  score: number; // 生成评分
  reasoning: string; // 生成理由
  position?: TextPosition; // 在原文中的位置
  context?: string; // 上下文片段
}

export interface TextPosition {
  start: number;
  end: number;
  snippet: string;
}

export interface TagGenerationMetadata {
  provider: string;
  algorithm: string;
  processingTime: number;
  cost: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  version: string;
  confidence: number;
  coverage: number; // 内容覆盖率
}

export interface TagSuggestion {
  tag: ContentTag;
  reason: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high'; // 添加此标签的影响
}

export interface TagLibrary {
  id: string;
  name: string;
  description: string;
  tags: ContentTag[];
  isDefault: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tagsCount: number;
  usageCount: number;
}

export interface TagStats {
  tagId: string;
  tagName: string;
  usageCount: number;
  averageRelevance: number;
  averageWeight: number;
  lastUsed: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
  userCount: number; // 使用该标签的用户数
  categoryDistribution: Record<TagCategory, number>;
}

export interface TagAnalytics {
  totalTags: number;
  activeTags: number;
  tagDistribution: Record<TagType, number>;
  categoryDistribution: Record<TagCategory, number>;
  sourceDistribution: Record<TagSource, number>;
  usageTrends: {
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
  topTags: TagStats[];
  userEngagement: {
    averageTagsPerContent: number;
    userRetentionRate: number;
    tagCreationRate: number;
  };
}

export interface TagWeightOptimization {
  tagId: string;
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
  confidence: number;
  impact: {
    relevanceImprovement: number;
    userSatisfaction: number;
    systemPerformance: number;
  };
}

export interface TagValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'format' | 'length' | 'content' | 'semantic' | 'duplicate';
  pattern?: string; // 正则表达式
  minLength?: number;
  maxLength?: number;
  forbiddenWords?: string[];
  requiredWords?: string[];
  isActive: boolean;
  severity: 'error' | 'warning' | 'info';
}

export interface TagValidationError {
  ruleId: string;
  tagName: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

// 标签配置
export interface TaggingConfig {
  algorithm: 'keyword-based' | 'ml-based' | 'hybrid' | 'ensemble';
  maxTags: number;
  minRelevance: number;
  enableHierarchical: boolean;
  enableWeightOptimization: boolean;
  enableUserLearning: boolean;
  cacheEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  customLibraries: string[];
  validationRules: TagValidationRule[];
}

// 默认标签库
export const DEFAULT_TAG_LIBRARY: ContentTag[] = [
  // 内容核心标签
  {
    id: 'summary',
    name: '摘要',
    type: TagType.CORE,
    category: TagCategory.CONTENT,
    relevanceScore: 0.9,
    weight: 0.8,
    source: TagSource.AI_GENERATED,
    confidence: 0.95,
    count: 0,
    lastUsed: new Date(),
    createdBy: 'ai',
    metadata: {
      color: '#3B82F6',
      icon: '📝',
      description: '内容摘要和概要',
      aliases: ['概要', '总结'],
      isActive: true
    }
  },
  {
    id: 'key-point',
    name: '要点',
    type: TagType.CORE,
    category: TagCategory.CONTENT,
    relevanceScore: 0.85,
    weight: 0.75,
    source: TagSource.AI_GENERATED,
    confidence: 0.9,
    count: 0,
    lastUsed: new Date(),
    createdBy: 'ai',
    metadata: {
      color: '#10B981',
      icon: '🔑',
      description: '关键要点和重点内容',
      aliases: ['重点', '关键'],
      isActive: true
    }
  },
  {
    id: 'question',
    name: '问题',
    type: TagType.CORE,
    category: TagCategory.CONTENT,
    relevanceScore: 0.8,
    weight: 0.7,
    source: TagSource.AI_GENERATED,
    confidence: 0.85,
    count: 0,
    lastUsed: new Date(),
    createdBy: 'ai',
    metadata: {
      color: '#F59E0B',
      icon: '❓',
      description: '问题和疑问',
      aliases: ['疑问', '困惑'],
      isActive: true
    }
  },
  {
    id: 'idea',
    name: '想法',
    type: TagType.CORE,
    category: TagCategory.CONTENT,
    relevanceScore: 0.85,
    weight: 0.75,
    source: TagSource.AI_GENERATED,
    confidence: 0.9,
    count: 0,
    lastUsed: new Date(),
    createdBy: 'ai',
    metadata: {
      color: '#8B5CF6',
      icon: '💡',
      description: '创意和想法',
      aliases: ['创意', '灵感'],
      isActive: true
    }
  },
  {
    id: 'action-item',
    name: '行动项',
    type: TagType.ACTIONABLE,
    category: TagCategory.TASK,
    relevanceScore: 0.9,
    weight: 0.85,
    source: TagSource.AI_GENERATED,
    confidence: 0.95,
    count: 0,
    lastUsed: new Date(),
    createdBy: 'ai',
    metadata: {
      color: '#EF4444',
      icon: '✅',
      description: '需要执行的行动项',
      aliases: ['待办', '任务'],
      priority: 'high',
      isActive: true
    }
  },
  {
    id: 'resource',
    name: '资源',
    type: TagType.REFERENCE,
    category: TagCategory.RESOURCE,
    relevanceScore: 0.8,
    weight: 0.7,
    source: TagSource.AI_GENERATED,
    confidence: 0.85,
    count: 0,
    lastUsed: new Date(),
    createdBy: 'ai',
    metadata: {
      color: '#06B6D4',
      icon: '📚',
      description: '参考资源和链接',
      aliases: ['资料', '参考'],
      isActive: true
    }
  },
  {
    id: 'learning',
    name: '学习',
    type: TagType.CORE,
    category: TagCategory.SKILL,
    relevanceScore: 0.85,
    weight: 0.8,
    source: TagSource.AI_GENERATED,
    confidence: 0.9,
    count: 0,
    lastUsed: new Date(),
    createdBy: 'ai',
    metadata: {
      color: '#22C55E',
      icon: '🎓',
      description: '学习相关内容',
      aliases: ['学到的', '知识'],
      difficulty: 'intermediate',
      isActive: true
    }
  },
  {
    id: 'insight',
    name: '洞见',
    type: TagType.CORE,
    category: TagCategory.CONCEPT,
    relevanceScore: 0.9,
    weight: 0.85,
    source: TagSource.AI_GENERATED,
    confidence: 0.95,
    count: 0,
    lastUsed: new Date(),
    createdBy: 'ai',
    metadata: {
      color: '#F97316',
      icon: '🔍',
      description: '深度洞察和发现',
      aliases: ['发现', '领悟'],
      priority: 'high',
      isActive: true
    }
  },
  {
    id: 'follow-up',
    name: '跟进',
    type: TagType.ACTIONABLE,
    category: TagCategory.TASK,
    relevanceScore: 0.8,
    weight: 0.75,
    source: TagSource.AI_GENERATED,
    confidence: 0.85,
    count: 0,
    lastUsed: new Date(),
    createdBy: 'ai',
    metadata: {
      color: '#EC4899',
      icon: '📞',
      description: '需要跟进的事项',
      aliases: ['后续', '跟踪'],
      priority: 'medium',
      isActive: true
    }
  },
  {
    id: 'reflection',
    name: '反思',
    type: TagType.CORE,
    category: TagCategory.PERSONAL,
    relevanceScore: 0.85,
    weight: 0.8,
    source: TagSource.AI_GENERATED,
    confidence: 0.9,
    count: 0,
    lastUsed: new Date(),
    createdBy: 'ai',
    metadata: {
      color: '#6B7280',
      icon: '🤔',
      description: '个人反思和思考',
      aliases: ['思考', '反省'],
      isActive: true
    }
  }
];

// 标签错误类型
export class TaggingError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TaggingError';
  }
}

// 标签事件类型
export interface TaggingEvent {
  type: 'tag_generated' | 'tag_updated' | 'tag_deleted' | 'tag_library_updated';
  data: {
    userId: string;
    content: string;
    tags?: GeneratedTag[];
    error?: string;
    timestamp: Date;
  };
}