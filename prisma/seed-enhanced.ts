/**
 * 增强版数据库种子数据脚本
 * 提供丰富的开发和测试数据，支持多种场景模拟
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 种子数据配置
interface SeedConfig {
  environment: 'development' | 'test' | 'staging';
  clearExistingData: boolean;
  createSampleNotes: boolean;
  noteCount: number;
  createAIProcessingLogs: boolean;
  createUserFeedback: boolean;
  createNoteRelationships: boolean;
}

// 默认配置
const defaultConfig: SeedConfig = {
  environment: (process.env.NODE_ENV as any) || 'development',
  clearExistingData: true,
  createSampleNotes: true,
  noteCount: 50,
  createAIProcessingLogs: true,
  createUserFeedback: true,
  createNoteRelationships: true,
};

// 示例内容生成器
class ContentGenerator {
  private readonly techTopics = [
    'React组件优化', '数据库性能调优', 'AI模型训练', '微服务架构',
    'TypeScript最佳实践', 'Docker容器化', 'GraphQL API设计', '前端性能监控'
  ];

  private readonly workTopics = [
    '项目规划', '会议纪要', '需求分析', '技术选型', '团队协作',
    '代码审查', '产品路线图', '用户体验设计', '市场调研', '竞品分析'
  ];

  private readonly lifeTopics = [
    '读书笔记', '旅行计划', '美食推荐', '健身记录', '理财规划',
    '学习目标', '人际关系', '时间管理', '兴趣爱好', '生活感悟'
  ];

  private readonly aiPrompts = [
    '请帮我总结这篇文章的核心观点',
    '分析这段代码的性能问题',
    '生成一个项目计划的提纲',
    '优化这个SQL查询语句',
    '创建一个用户故事模板',
    '设计一个数据库模式',
    '写一份技术文档大纲',
    '生成测试用例'
  ];

  generateTitle(category: string): string {
    const topicLists = {
      '技术': this.techTopics,
      '工作': this.workTopics,
      '学习': this.workTopics,
      '生活': this.lifeTopics,
      '创意': [...this.techTopics, ...this.lifeTopics]
    };

    const topics = topicLists[category as keyof typeof topicLists] || this.techTopics;
    const baseTopic = topics[Math.floor(Math.random() * topics.length)];
    const variations = ['', ' - 深入分析', ' - 实践总结', ' - 最佳实践', ' - 经验分享', ' - 问题解决'];

    return baseTopic + variations[Math.floor(Math.random() * variations.length)];
  }

  generateContent(category: string, wordCount: number = 200): string {
    const templates = {
      '技术': [
        `在最近的开发工作中，我遇到了一个关于${this.techTopics[Math.floor(Math.random() * this.techTopics.length)]}的问题。经过深入研究和实践，我发现了一些有效的解决方案。首先，我们需要理解问题的根本原因，然后针对性地制定优化策略。通过实施这些改进，我们不仅解决了当前的问题，还为未来的扩展奠定了基础。`,
        `今天研究了${this.techTopics[Math.floor(Math.random() * this.techTopics.length)]}的新方法。这种方法的核心思想是通过优化算法和数据结构来提升性能。实际测试结果显示，相比传统方法，新的方案能够带来显著的性能提升。不过，在实施过程中也需要注意一些潜在的风险和限制条件。`
      ],
      '工作': [
        `今天的团队会议讨论了${this.workTopics[Math.floor(Math.random() * this.workTopics.length)]}相关的内容。大家就当前面临的挑战和机遇进行了深入的交流。通过集思广益，我们形成了一些初步的共识和行动计划。下一步需要将这些想法转化为具体的实施方案，并建立相应的跟踪和评估机制。`,
        `在${this.workTopics[Math.floor(Math.random() * this.workTopics.length)]}方面，我有一些新的思考和建议。基于最近的市场趋势和用户反馈，我认为我们需要调整现有的策略。具体来说，可以从以下几个维度进行优化：产品功能、用户体验、技术架构和团队协作。`
      ],
      '学习': [
        `最近在学习${this.workTopics[Math.floor(Math.random() * this.workTopics.length)]}的过程中，有了一些重要的收获和感悟。通过系统性的学习和实践，我对这个领域有了更深入的理解。特别是在概念理解和实际应用之间建立起了有效的连接，这对我后续的学习和工作都有很大帮助。`,
        `今天完成了一个关于${this.workTopics[Math.floor(Math.random() * this.workTopics.length)]}的在线课程。课程内容涵盖了理论基础、实践案例和最新发展趋势。通过学习和实践，我不仅掌握了相关的知识和技能，还培养了解决问题的思维方法。`
      ],
      '生活': [
        `今天在${this.lifeTopics[Math.floor(Math.random() * this.lifeTopics.length)]}方面有一些新的体验和感受。生活中的这些小事虽然看似平凡，但却能给我们带来很多启发和思考。通过记录和反思这些经历，我能够更好地认识自己，也能够在日常生活中发现更多的美好。`,
        `最近在${this.lifeTopics[Math.floor(Math.random() * this.lifeTopics.length)]}上取得了一些进展。通过持续的努力和改进，我逐步建立起了良好的习惯和模式。这个过程虽然有挑战，但每一次的小进步都让我感到充实和满足。`
      ],
      '创意': [
        `突然有了一个关于${this.techTopics[Math.floor(Math.random() * this.techTopics.length)]}的新想法。这个想法结合了多个领域的知识和经验，可能会带来一些创新的解决方案。虽然目前还处于概念阶段，但我认为值得进一步探索和验证。`,
        `今天在思考${this.lifeTopics[Math.floor(Math.random() * this.lifeTopics.length)]}的时候，产生了一些有趣的创意。这些创意虽然看似简单，但可能会对我们的生活或工作产生积极的影响。我需要将这些想法记录下来，并在合适的时机进行实践和验证。`
      ]
    };

    const categoryTemplates = templates[category as keyof typeof templates] || templates['技术'];
    let content = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];

    // 调整内容长度
    if (content.length < wordCount) {
      const additionalContent = `这个话题还有很多值得深入探讨的地方。从不同角度来看，我们可以获得更多的见解和理解。未来我计划继续关注相关的动态和发展，不断更新和完善我的认识。同时，也希望能够与他人分享和交流这些想法，获得更多的反馈和建议。`;
      content += ' ' + additionalContent;
    }

    return content;
  }

  generateAITask(): string {
    return this.aiPrompts[Math.floor(Math.random() * this.aiPrompts.length)];
  }

  generateTimestamp(daysBack: number = 30): Date {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * daysBack);
    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);

    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);

    return timestamp;
  }
}

// 主要种子数据生成函数
async function main() {
  const config = { ...defaultConfig };
  const generator = new ContentGenerator();

  console.log('🌱 开始增强版种子数据初始化...');
  console.log(`📊 环境配置:`, config);

  try {
    // 1. 清理现有数据（如果需要）
    if (config.clearExistingData && config.environment === 'development') {
      console.log('🧹 清理现有数据...');
      await clearDatabase();
    }

    // 2. 创建系统配置
    console.log('⚙️ 创建系统配置...');
    await createSystemConfigs();

    // 3. 创建测试用户
    console.log('👤 创建测试用户...');
    const users = await createUsers();

    // 4. 创建分类和标签
    console.log('📁 创建分类和标签...');
    const { categories, tags } = await createCategoriesAndTags(users[0].id);

    // 5. 创建示例笔记
    if (config.createSampleNotes) {
      console.log(`📝 创建 ${config.noteCount} 条示例笔记...`);
      const notes = await createSampleNotes(users, categories, tags, config.noteCount, generator);

      // 6. 创建笔记关系
      if (config.createNoteRelationships && notes.length > 1) {
        console.log('🔗 创建笔记关系...');
        await createNoteRelationships(notes, generator);
      }

      // 7. 创建AI处理日志
      if (config.createAIProcessingLogs) {
        console.log('🤖 创建AI处理日志...');
        await createAIProcessingLogs(notes, generator);
      }

      // 8. 创建用户反馈
      if (config.createUserFeedback) {
        console.log('💬 创建用户反馈...');
        await createUserFeedback(notes, users, generator);
      }
    }

    // 9. 创建向量嵌入示例
    console.log('🔢 创建向量嵌入示例...');
    await createVectorEmbeddings();

    console.log('✅ 种子数据初始化完成！');
    console.log('📈 数据统计:');
    await printDataStatistics();

  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error);
    throw error;
  }
}

// 清理数据库
async function clearDatabase() {
  const tables = [
    'userFeedback', 'vectorEmbedding', 'aiProcessingLog',
    'noteRelationship', 'noteTag', 'note', 'tag',
    'category', 'systemConfig', 'user'
  ];

  for (const table of tables) {
    try {
      await (prisma as any)[table].deleteMany();
      console.log(`  ✓ 清理表: ${table}`);
    } catch (error) {
      console.warn(`  ⚠️ 清理表失败: ${table}`, error);
    }
  }
}

// 创建系统配置
async function createSystemConfigs() {
  const systemConfigs = [
    {
      key: 'app.version',
      value: {
        version: '1.0.0',
        buildDate: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      description: '应用版本信息',
    },
    {
      key: 'ai.default_model',
      value: {
        provider: 'openai',
        model: 'gpt-4-turbo',
        maxTokens: 4000,
        temperature: 0.7,
        topP: 0.9
      },
      description: '默认AI模型配置',
    },
    {
      key: 'search.settings',
      value: {
        enableVectorSearch: true,
        similarityThreshold: 0.7,
        maxResults: 20,
        enableFullTextSearch: true,
        searchWeights: {
          title: 2.0,
          content: 1.0,
          tags: 1.5,
          categories: 1.2
        }
      },
      description: '搜索设置',
    },
    {
      key: 'ai.analysis.settings',
      value: {
        autoSummarize: true,
        autoExtractKeywords: true,
        autoCategorize: true,
        maxAnalysisRetries: 3,
        batchSize: 10,
        enableParallelProcessing: true
      },
      description: 'AI分析设置',
    },
    {
      key: 'ui.theme.settings',
      value: {
        defaultTheme: 'light',
        availableThemes: ['light', 'dark', 'auto'],
        customColors: {
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444'
        }
      },
      description: 'UI主题设置',
    },
    {
      key: 'performance.monitoring',
      value: {
        enableMetrics: true,
        sampleRate: 0.1,
        retentionDays: 30,
        alertThresholds: {
          responseTime: 1000,
          errorRate: 0.05,
          memoryUsage: 0.8
        }
      },
      description: '性能监控配置',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config,
    });
  }
}

// 创建用户
async function createUsers() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const usersData = [
    {
      email: 'demo@mindnote.com',
      username: 'demo',
      passwordHash: hashedPassword,
      fullName: 'Demo User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      emailVerified: true,
      isActive: true,
      aiPreferences: {
        preferredProvider: 'openai',
        analysisLevel: 'detailed' as const,
        autoProcess: true,
        summaryLength: 'medium' as const,
        extractKeywords: true,
        suggestTags: true
      },
      settings: {
        theme: 'light',
        language: 'zh-CN',
        autoSave: true,
        notifications: true,
        sidebarCollapsed: false,
        notesPerPage: 20
      },
    },
    {
      email: 'admin@mindnote.com',
      username: 'admin',
      passwordHash: hashedPassword,
      fullName: 'Admin User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      emailVerified: true,
      isActive: true,
      role: 'ADMIN',
      aiPreferences: {
        preferredProvider: 'openai',
        analysisLevel: 'comprehensive' as const,
        autoProcess: true,
        summaryLength: 'detailed' as const,
        extractKeywords: true,
        suggestTags: true,
        enableAdvancedFeatures: true
      },
      settings: {
        theme: 'dark',
        language: 'zh-CN',
        autoSave: true,
        notifications: true,
        sidebarCollapsed: false,
        notesPerPage: 50,
        showAdvancedOptions: true
      },
    },
    {
      email: 'developer@mindnote.com',
      username: 'developer',
      passwordHash: hashedPassword,
      fullName: 'Developer User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer',
      emailVerified: true,
      isActive: true,
      role: 'DEVELOPER',
      aiPreferences: {
        preferredProvider: 'anthropic',
        analysisLevel: 'comprehensive' as const,
        autoProcess: false,
        summaryLength: 'detailed' as const,
        extractKeywords: true,
        suggestTags: true,
        customPrompts: true
      },
      settings: {
        theme: 'dark',
        language: 'en-US',
        autoSave: true,
        notifications: false,
        sidebarCollapsed: true,
        notesPerPage: 100,
        showDebugInfo: true
      },
    },
  ];

  const users = await Promise.all(
    usersData.map(userData =>
      prisma.user.create({ data: userData })
    )
  );

  console.log(`  ✓ 创建了 ${users.length} 个用户`);
  return users;
}

// 创建分类和标签
async function createCategoriesAndTags(createdBy: string) {
  const categoriesData = [
    { name: '工作', description: '工作相关笔记', color: '#3B82F6', icon: '💼', isDefault: true, createdBy },
    { name: '学习', description: '学习资料和笔记', color: '#10B981', icon: '📚', isDefault: true, createdBy },
    { name: '生活', description: '日常生活记录', color: '#F59E0B', icon: '🌟', isDefault: true, createdBy },
    { name: '技术', description: '技术文档和代码', color: '#8B5CF6', icon: '💻', isDefault: true, createdBy },
    { name: '创意', description: '创意和想法记录', color: '#EC4899', icon: '🎨', isDefault: true, createdBy },
    { name: '项目', description: '项目管理和进展', color: '#14B8A6', icon: '📊', isDefault: false, createdBy },
    { name: '会议', description: '会议记录和决策', color: '#F97316', icon: '📅', isDefault: false, createdBy },
    { name: '研究', description: '研究和调研资料', color: '#6366F1', icon: '🔬', isDefault: false, createdBy },
  ];

  const categories = await Promise.all(
    categoriesData.map(catData =>
      prisma.category.create({ data: catData })
    )
  );

  const tagsData = [
    // 优先级标签
    { name: '重要', color: '#EF4444', category: 'priority', description: '重要内容', isDefault: true, createdBy },
    { name: '紧急', color: '#DC2626', category: 'priority', description: '紧急处理', isDefault: true, createdBy },
    { name: '一般', color: '#6B7280', category: 'priority', description: '一般优先级', isDefault: true, createdBy },

    // 状态标签
    { name: '进行中', color: '#3B82F6', category: 'status', description: '正在处理', isDefault: true, createdBy },
    { name: '已完成', color: '#10B981', category: 'status', description: '已完成事项', isDefault: true, createdBy },
    { name: '待办', color: '#F59E0B', category: 'status', description: '待处理事项', isDefault: true, createdBy },
    { name: '暂停', color: '#8B5CF6', category: 'status', description: '暂时搁置', isDefault: false, createdBy },

    // 类型标签
    { name: '想法', color: '#8B5CF6', category: 'type', description: '创意想法', isDefault: true, createdBy },
    { name: '参考资料', color: '#6B7280', category: 'type', description: '参考和资料', isDefault: true, createdBy },
    { name: '问题', color: '#EF4444', category: 'type', description: '问题和疑问', isDefault: true, createdBy },
    { name: '解决方案', color: '#10B981', category: 'type', description: '解决方案', isDefault: true, createdBy },

    // 上下文标签
    { name: '项目', color: '#3B82F6', category: 'context', description: '项目相关', isDefault: true, createdBy },
    { name: '会议', color: '#EC4899', category: 'context', description: '会议记录', isDefault: true, createdBy },
    { name: '个人', color: '#14B8A6', category: 'context', description: '个人事务', isDefault: true, createdBy },
    { name: '团队', color: '#F97316', category: 'context', description: '团队协作', isDefault: true, createdBy },

    // 技术标签
    { name: '前端', color: '#3B82F6', category: 'technology', description: '前端开发', isDefault: false, createdBy },
    { name: '后端', color: '#10B981', category: 'technology', description: '后端开发', isDefault: false, createdBy },
    { name: '数据库', color: '#8B5CF6', category: 'technology', description: '数据库相关', isDefault: false, createdBy },
    { name: 'DevOps', color: '#F59E0B', category: 'technology', description: '运维部署', isDefault: false, createdBy },

    // 其他常用标签
    { name: '灵感', color: '#14B8A6', category: 'other', description: '灵感记录', isDefault: true, createdBy },
    { name: '待研究', color: '#6366F1', category: 'other', description: '需要深入研究', isDefault: false, createdBy },
    { name: '已验证', color: '#10B981', category: 'other', description: '已验证可行', isDefault: false, createdBy },
  ];

  const tags = await Promise.all(
    tagsData.map(tagData =>
      prisma.tag.create({ data: tagData })
    )
  );

  console.log(`  ✓ 创建了 ${categories.length} 个分类和 ${tags.length} 个标签`);
  return { categories, tags };
}

// 创建示例笔记
async function createSampleNotes(
  users: any[],
  categories: any[],
  tags: any[],
  noteCount: number,
  generator: ContentGenerator
) {
  const notes = [];
  const statuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
  const statusWeights = [0.1, 0.8, 0.1]; // 10% 草稿，80% 已发布，10% 归档

  for (let i = 0; i < noteCount; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const selectedTags = tags
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 4) + 1); // 1-4个标签

    // 根据权重选择状态
    const status = weightedRandom(statuses, statusWeights);

    const title = generator.generateTitle(category.name);
    const content = generator.generateContent(category.name, 150 + Math.random() * 350);
    const createdAt = generator.generateTimestamp(30);
    const updatedAt = new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // 创建后1周内更新

    const note = await prisma.note.create({
      data: {
        title,
        content,
        status,
        userId: user.id,
        categoryId: category.id,
        wordCount: content.length,
        readingTime: Math.ceil(content.length / 200), // 假设200字/分钟
        createdAt,
        updatedAt,
        aiProcessed: Math.random() > 0.3, // 70%的笔记经过AI处理
        isPublic: Math.random() > 0.8, // 20%公开
        viewCount: Math.floor(Math.random() * 100),
        lastViewedAt: Math.random() > 0.5 ? new Date(createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())) : null,
        tags: {
          create: selectedTags.map(tag => ({
            tagId: tag.id,
            createdAt,
          }))
        }
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    notes.push(note);
  }

  console.log(`  ✓ 创建了 ${notes.length} 条示例笔记`);
  return notes;
}

// 创建笔记关系
async function createNoteRelationships(notes: any[], generator: ContentGenerator) {
  const relationshipTypes = ['RELATED', 'REFERENCE', 'SEQUENCE', 'DEPENDENCY'] as const;

  for (let i = 0; i < Math.min(notes.length * 0.3, 20); i++) { // 创建30%的关系，最多20个
    const sourceNote = notes[Math.floor(Math.random() * notes.length)];
    const targetNote = notes[Math.floor(Math.random() * notes.length)];

    if (sourceNote.id === targetNote.id) continue;

    const relationshipType = relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)];
    const createdAt = generator.generateTimestamp(7);

    try {
      await prisma.noteRelationship.create({
        data: {
          sourceId: sourceNote.id,
          targetId: targetNote.id,
          type: relationshipType,
          description: generateRelationshipDescription(relationshipType, sourceNote.title, targetNote.title),
          strength: Math.random() * 0.5 + 0.5, // 0.5-1.0
          createdAt,
        }
      });
    } catch (error) {
      // 忽略重复关系错误
    }
  }

  console.log('  ✓ 创建笔记关系完成');
}

// 生成关系描述
function generateRelationshipDescription(type: string, sourceTitle: string, targetTitle: string): string {
  const templates = {
    'RELATED': [
      `与"${targetTitle}"主题相关`,
      `参考了"${targetTitle}"的内容`,
      `与"${targetTitle}"互为补充`
    ],
    'REFERENCE': [
      `引用了"${targetTitle}"的观点`,
      `基于"${targetTitle}"的方法`,
      `参考"${targetTitle}"实现`
    ],
    'SEQUENCE': [
      `是"${targetTitle}"的后续`,
      `在"${targetTitle}"基础上展开`,
      `先理解"${targetTitle}"`
    ],
    'DEPENDENCY': [
      `依赖"${targetTitle}"的结果`,
      `需要"${targetTitle}"的支持`,
      `基于"${targetTitle}"的前提`
    ]
  };

  const typeTemplates = templates[type as keyof typeof templates] || templates['RELATED'];
  return typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
}

// 创建AI处理日志
async function createAIProcessingLogs(notes: any[], generator: ContentGenerator) {
  const processedNotes = notes.filter(note => note.aiProcessed);
  const operationTypes = ['SUMMARIZE', 'EXTRACT_KEYWORDS', 'CATEGORIZE', 'TRANSLATE', 'ENHANCE'] as const;
  const statuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;

  for (const note of processedNotes) {
    const operationCount = Math.floor(Math.random() * 3) + 1; // 1-3个操作

    for (let i = 0; i < operationCount; i++) {
      const operationType = operationTypes[Math.floor(Math.random() * operationTypes.length)];
      const status = Math.random() > 0.1 ? 'COMPLETED' : statuses[Math.floor(Math.random() * statuses.length)];
      const startTime = generator.generateTimestamp(7);
      const duration = Math.floor(Math.random() * 5000) + 500; // 500-5500ms

      const log = await prisma.aiProcessingLog.create({
        data: {
          noteId: note.id,
          operationType,
          status,
          prompt: generator.generateAITask(),
          startTime,
          endTime: status === 'COMPLETED' ? new Date(startTime.getTime() + duration) : null,
          duration: status === 'COMPLETED' ? duration : null,
          errorMessage: status === 'FAILED' ? 'AI服务暂时不可用' : null,
          retryCount: status === 'FAILED' ? Math.floor(Math.random() * 3) : 0,
          metadata: {
            model: 'gpt-4-turbo',
            tokensUsed: Math.floor(Math.random() * 1000) + 100,
            cost: (Math.random() * 0.1 + 0.01).toFixed(4)
          }
        }
      });

      // 如果操作完成，更新笔记的AI处理结果
      if (status === 'COMPLETED') {
        const results = generateAIResults(operationType);
        await prisma.note.update({
          where: { id: note.id },
          data: {
            aiSummary: results.summary,
            aiKeywords: results.keywords,
            aiCategories: results.categories,
            aiEnhancedContent: results.enhancedContent
          }
        });
      }
    }
  }

  console.log(`  ✓ 为 ${processedNotes.length} 条笔记创建了AI处理日志`);
}

// 生成AI处理结果
function generateAIResults(operationType: string) {
  const results = {
    summary: '',
    keywords: [],
    categories: [],
    enhancedContent: ''
  };

  switch (operationType) {
    case 'SUMMARIZE':
      results.summary = '这篇文章主要讨论了技术实现的核心要点，包括架构设计、性能优化和最佳实践。作者通过具体案例展示了这些概念在实际项目中的应用。';
      break;
    case 'EXTRACT_KEYWORDS':
      results.keywords = ['技术架构', '性能优化', '最佳实践', '案例分析', '项目管理'];
      break;
    case 'CATEGORIZE':
      results.categories = ['技术文档', '项目规划', '经验分享'];
      break;
    case 'ENHANCE':
      results.enhancedContent = '【AI增强】本文内容经过深度分析和优化，提供了更清晰的结构和更详细的解释。';
      break;
  }

  return results;
}

// 创建用户反馈
async function createUserFeedback(notes: any[], users: any[], generator: ContentGenerator) {
  const feedbackTypes = ['CONTENT_QUALITY', 'AI_ACCURACY', 'FEATURE_REQUEST', 'BUG_REPORT', 'GENERAL'] as const;
  const ratings = [1, 2, 3, 4, 5];

  for (let i = 0; i < Math.min(notes.length * 0.2, 15); i++) { // 为20%的笔记创建反馈，最多15个
    const note = notes[Math.floor(Math.random() * notes.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const feedbackType = feedbackTypes[Math.floor(Math.random() * feedbackTypes.length)];

    // 跳过自己给自己的反馈
    if (note.userId === user.id) continue;

    const feedback = await prisma.userFeedback.create({
      data: {
        noteId: note.id,
        userId: user.id,
        type: feedbackType,
        rating: ratings[Math.floor(Math.random() * ratings.length)],
        comment: generateFeedbackComment(feedbackType, Math.random() > 0.5),
        createdAt: generator.generateTimestamp(14),
        helpful: Math.random() > 0.3,
        resolved: Math.random() > 0.7
      }
    });
  }

  console.log('  ✓ 创建用户反馈完成');
}

// 生成反馈评论
function generateFeedbackComment(type: string, isPositive: boolean): string {
  const templates = {
    'CONTENT_QUALITY': {
      positive: [
        '内容质量很高，很有帮助！',
        '写得很详细，感谢分享！',
        '结构清晰，易于理解。',
        '这个内容解决了我遇到的问题。'
      ],
      negative: [
        '内容有些混乱，需要整理。',
        '希望能提供更多细节。',
        '部分内容不够准确。',
        '建议补充更多示例。'
      ]
    },
    'AI_ACCURACY': {
      positive: [
        'AI分析很准确！',
        '关键词提取很到位。',
        '自动分类效果很好。',
        'AI增强内容很有价值。'
      ],
      negative: [
        'AI分析有些偏差。',
        '关键词不够准确。',
        '分类结果需要调整。',
        'AI增强内容质量一般。'
      ]
    },
    'FEATURE_REQUEST': [
      '希望能支持导出功能。',
      '建议添加搜索历史。',
      '需要更好的分类管理。',
      '希望能批量处理笔记。'
    ],
    'BUG_REPORT': [
      '有时候保存会失败。',
      '搜索功能偶尔无响应。',
      '标签颜色显示不正确。',
      'AI处理时间过长。'
    ],
    'GENERAL': {
      positive: [
        '整体体验很好！',
        '界面设计简洁美观。',
        '功能很实用。',
        '推荐给朋友使用。'
      ],
      negative: [
        '希望能改进用户体验。',
        '功能还需要完善。',
        '性能有待提升。',
        '文档需要更详细。'
      ]
    }
  };

  const typeTemplates = templates[type as keyof typeof templates] || templates['GENERAL'];
  const sentimentTemplates = typeTemplates.positive ?
    (isPositive ? typeTemplates.positive : typeTemplates.negative) :
    typeTemplates;

  return sentimentTemplates[Math.floor(Math.random() * sentimentTemplates.length)];
}

// 创建向量嵌入示例
async function createVectorEmbeddings() {
  // 创建一些示例向量嵌入
  const sampleVectors = [
    {
      noteId: 1, // 假设存在ID为1的笔记
      embedding: Array(1536).fill(0).map(() => Math.random() - 0.5), // 1536维向量
      model: 'text-embedding-ada-002',
      dimensions: 1536,
      createdAt: new Date()
    }
  ];

  try {
    for (const vector of sampleVectors) {
      // 检查笔记是否存在
      const noteExists = await prisma.note.findUnique({
        where: { id: vector.noteId }
      });

      if (noteExists) {
        await prisma.vectorEmbedding.create({
          data: vector
        });
      }
    }
  } catch (error) {
    console.warn('  ⚠️ 向量嵌入创建跳过（可能没有相关笔记）');
  }
}

// 加权随机选择
function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

// 打印数据统计
async function printDataStatistics() {
  try {
    const [
      userCount,
      categoryCount,
      tagCount,
      noteCount,
      aiLogCount,
      feedbackCount,
      relationshipCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.tag.count(),
      prisma.note.count(),
      prisma.aiProcessingLog.count(),
      prisma.userFeedback.count(),
      prisma.noteRelationship.count()
    ]);

    console.log(`  👤 用户: ${userCount}`);
    console.log(`  📁 分类: ${categoryCount}`);
    console.log(`  🏷️  标签: ${tagCount}`);
    console.log(`  📝 笔记: ${noteCount}`);
    console.log(`  🤖 AI处理日志: ${aiLogCount}`);
    console.log(`  💬 用户反馈: ${feedbackCount}`);
    console.log(`  🔗 笔记关系: ${relationshipCount}`);
  } catch (error) {
    console.warn('  ⚠️ 统计信息获取失败:', error);
  }
}

// 执行种子数据初始化
main()
  .catch((error) => {
    console.error('种子数据初始化失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });