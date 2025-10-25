/**
 * 自动分类系统类型定义 - T104
 * 定义内容分类的数据结构和接口
 */

export interface ContentCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string; // 支持多级分类
  level: number; // 分类层级
  keywords: string[]; // 关键词列表
  confidence: number; // 置信度
  color?: string; // 显示颜色
  icon?: string; // 图标
}

export interface ClassificationRequest {
  content: string;
  userId: string;
  options?: ClassificationOptions;
}

export interface ClassificationOptions {
  maxCategories?: number; // 最大分类数量
  minConfidence?: number; // 最小置信度阈值
  includeSubcategories?: boolean; // 是否包含子分类
  customCategories?: ContentCategory[]; // 自定义分类
  language?: 'zh' | 'en' | 'auto'; // 语言设置
  detailed?: boolean; // 是否返回详细信息
}

export interface ClassificationResult {
  content: string;
  userId: string;
  timestamp: Date;
  categories: ClassifiedCategory[];
  metadata: ClassificationMetadata;
}

export interface ClassifiedCategory {
  category: ContentCategory;
  confidence: number;
  matchedKeywords: string[];
  reasoning: string; // 分类推理
  subcategories?: ClassifiedCategory[]; // 子分类
}

export interface ClassificationMetadata {
  provider: string;
  processingTime: number;
  cost: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  algorithm: string;
  version: string;
}

export interface ClassificationTrainingData {
  id: string;
  content: string;
  categories: string[];
  userId?: string;
  timestamp: Date;
  isValidated: boolean;
}

export interface CategoryStats {
  categoryId: string;
  name: string;
  usageCount: number;
  averageConfidence: number;
  lastUsed: Date;
  accuracy?: number; // 准确率（如果有人工验证）
}

export interface ClassificationAnalytics {
  totalClassifications: number;
  categoryDistribution: CategoryStats[];
  accuracyMetrics: {
    overallAccuracy: number;
    categoryAccuracy: Record<string, number>;
    confidenceDistribution: Record<string, number>;
  };
  usageTrends: {
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };
}

export interface ClassificationProvider {
  name: string;
  classify: (request: ClassificationRequest) => Promise<ClassificationResult>;
  getCategories: () => Promise<ContentCategory[]>;
  updateCategories: (categories: ContentCategory[]) => Promise<void>;
  healthCheck: () => Promise<{ status: 'healthy' | 'unhealthy'; message?: string }>;
}

// 预定义的分类体系
export const DEFAULT_CATEGORIES: ContentCategory[] = [
  // 一级分类
  {
    id: 'technology',
    name: '科技',
    description: '与科技、计算机、互联网相关的内容',
    level: 1,
    keywords: ['科技', '技术', '计算机', '互联网', '软件', '硬件', '人工智能', 'AI', '编程', '开发'],
    confidence: 0.9,
    color: '#3B82F6',
    icon: '💻'
  },
  {
    id: 'business',
    name: '商业',
    description: '与商业、经济、金融、投资相关的内容',
    level: 1,
    keywords: ['商业', '经济', '金融', '投资', '市场', '创业', '管理', '营销', '销售', '财务'],
    confidence: 0.9,
    color: '#10B981',
    icon: '💼'
  },
  {
    id: 'education',
    name: '教育',
    description: '与学习、教育、培训相关的内容',
    level: 1,
    keywords: ['教育', '学习', '培训', '课程', '学校', '大学', '知识', '技能', '教学', '研究'],
    confidence: 0.9,
    color: '#F59E0B',
    icon: '📚'
  },
  {
    id: 'health',
    name: '健康',
    description: '与健康、医疗、养生相关的内容',
    level: 1,
    keywords: ['健康', '医疗', '养生', '运动', '健身', '疾病', '治疗', '营养', '心理', '医院'],
    confidence: 0.9,
    color: '#EF4444',
    icon: '🏥'
  },
  {
    id: 'lifestyle',
    name: '生活方式',
    description: '与日常生活、娱乐、旅行相关的内容',
    level: 1,
    keywords: ['生活', '娱乐', '旅行', '美食', '电影', '音乐', '游戏', '购物', '时尚', '家居'],
    confidence: 0.9,
    color: '#8B5CF6',
    icon: '🎨'
  },
  {
    id: 'news',
    name: '新闻资讯',
    description: '与时事、新闻、资讯相关的内容',
    level: 1,
    keywords: ['新闻', '时事', '资讯', '报道', '政策', '社会', '国际', '政治', '热点', '事件'],
    confidence: 0.9,
    color: '#6B7280',
    icon: '📰'
  },
  {
    id: 'science',
    name: '科学',
    description: '与科学研究、发现、理论相关的内容',
    level: 1,
    keywords: ['科学', '研究', '实验', '发现', '理论', '数据', '分析', '学术', '论文', '期刊'],
    confidence: 0.9,
    color: '#06B6D4',
    icon: '🔬'
  },
  {
    id: 'arts',
    name: '艺术',
    description: '与艺术、创作、文化相关的内容',
    level: 1,
    keywords: ['艺术', '创作', '文化', '设计', '绘画', '音乐', '文学', '诗歌', '摄影', '雕塑'],
    confidence: 0.9,
    color: '#EC4899',
    icon: '🎭'
  },
  {
    id: 'sports',
    name: '体育',
    description: '与体育运动、健身相关的内容',
    level: 1,
    keywords: ['体育', '运动', '比赛', '健身', '锻炼', '球队', '运动员', '赛事', '世界杯', '奥运会'],
    confidence: 0.9,
    color: '#F97316',
    icon: '⚽'
  },
  {
    id: 'personal',
    name: '个人',
    description: '与个人思考、感悟、日记相关的内容',
    level: 1,
    keywords: ['个人', '感悟', '思考', '日记', '心得', '体会', '反思', '成长', '经历', '故事'],
    confidence: 0.9,
    color: '#84CC16',
    icon: '👤'
  },

  // 二级分类 - 科技子分类
  {
    id: 'ai-ml',
    name: '人工智能与机器学习',
    description: '人工智能、机器学习、深度学习相关',
    parentId: 'technology',
    level: 2,
    keywords: ['人工智能', '机器学习', '深度学习', '神经网络', '算法', '模型', '训练', '预测', '分类'],
    confidence: 0.85,
    color: '#1D4ED8',
    icon: '🤖'
  },
  {
    id: 'web-dev',
    name: 'Web开发',
    description: '前端、后端、全栈Web开发相关',
    parentId: 'technology',
    level: 2,
    keywords: ['Web开发', '前端', '后端', 'JavaScript', 'React', 'Vue', 'Node.js', '数据库', 'API'],
    confidence: 0.85,
    color: '#1D4ED8',
    icon: '🌐'
  },
  {
    id: 'mobile-dev',
    name: '移动开发',
    description: 'iOS、Android、移动应用开发相关',
    parentId: 'technology',
    level: 2,
    keywords: ['移动开发', 'iOS', 'Android', 'Swift', 'Kotlin', 'React Native', 'Flutter', 'App开发'],
    confidence: 0.85,
    color: '#1D4ED8',
    icon: '📱'
  },

  // 二级分类 - 商业子分类
  {
    id: 'startup',
    name: '创业',
    description: '创业、创新、风险投资相关',
    parentId: 'business',
    level: 2,
    keywords: ['创业', '创新', '风险投资', '融资', '初创公司', '商业模式', '产品', '市场'],
    confidence: 0.85,
    color: '#059669',
    icon: '🚀'
  },
  {
    id: 'marketing',
    name: '市场营销',
    description: '营销、推广、品牌相关',
    parentId: 'business',
    level: 2,
    keywords: ['营销', '推广', '品牌', '广告', 'SEO', '社交媒体', '内容营销', '客户'],
    confidence: 0.85,
    color: '#059669',
    icon: '📢'
  },

  // 二级分类 - 教育子分类
  {
    id: 'programming',
    name: '编程学习',
    description: '编程语言、编程技能学习相关',
    parentId: 'education',
    level: 2,
    keywords: ['编程', '代码', '算法', '数据结构', '编程语言', 'Python', 'Java', 'JavaScript'],
    confidence: 0.85,
    color: '#D97706',
    icon: '💻'
  },
  {
    id: 'language',
    name: '语言学习',
    description: '外语学习、语言技能相关',
    parentId: 'education',
    level: 2,
    keywords: ['英语', '日语', '法语', '德语', '语言学习', '口语', '听力', '阅读', '写作'],
    confidence: 0.85,
    color: '#D97706',
    icon: '🗣️'
  }
];

// 分类错误类型
export class ClassificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ClassificationError';
  }
}

// 分类事件类型
export interface ClassificationEvent {
  type: 'classification_completed' | 'classification_failed' | 'category_updated';
  data: {
    userId: string;
    content: string;
    categories?: ClassifiedCategory[];
    error?: string;
    timestamp: Date;
  };
}

// 分类配置
export interface ClassificationConfig {
  algorithm: 'keyword-based' | 'ml-based' | 'hybrid';
  confidenceThreshold: number;
  maxCategories: number;
  enableSubcategories: boolean;
  enableUserCategories: boolean;
  cacheEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}