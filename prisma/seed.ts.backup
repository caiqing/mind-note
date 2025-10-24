/**
 * 数据库种子数据脚本
 * 用于开发和测试环境的基础数据初始化
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始种子数据初始化...');

  // 清理现有数据（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 清理现有数据...');
    await prisma.userFeedback.deleteMany();
    await prisma.aiProcessingLog.deleteMany();
    await prisma.noteRelationship.deleteMany();
    await prisma.noteTag.deleteMany();
    await prisma.note.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.category.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.user.deleteMany();
  }

  // 1. 创建系统配置
  console.log('⚙️ 创建系统配置...');
  const systemConfigs = [
    {
      key: 'app.version',
      value: { version: '1.0.0', buildDate: new Date().toISOString() },
      description: '应用版本信息',
    },
    {
      key: 'ai.default_model',
      value: { provider: 'openai', model: 'gpt-4-turbo', maxTokens: 4000 },
      description: '默认AI模型配置',
    },
    {
      key: 'search.settings',
      value: {
        enableVectorSearch: true,
        similarityThreshold: 0.7,
        maxResults: 20
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
      },
      description: 'AI分析设置',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config,
    });
  }

  // 2. 创建测试用户
  console.log('👤 创建测试用户...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@mindnote.com',
      username: 'demo',
      passwordHash: hashedPassword,
      fullName: 'Demo User',
      emailVerified: true,
      aiPreferences: {
        preferredProvider: 'openai',
        analysisLevel: 'detailed',
        autoProcess: true,
      },
      settings: {
        theme: 'light',
        language: 'zh-CN',
        autoSave: true,
        notifications: true,
      },
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@mindnote.com',
      username: 'admin',
      passwordHash: hashedPassword,
      fullName: 'Admin User',
      emailVerified: true,
      aiPreferences: {
        preferredProvider: 'openai',
        analysisLevel: 'comprehensive',
        autoProcess: true,
      },
      settings: {
        theme: 'dark',
        language: 'zh-CN',
        autoSave: true,
        notifications: true,
      },
    },
  });

  // 3. 创建分类
  console.log('📁 创建分类...');
  const categories = [
    { name: '工作', description: '工作相关笔记', color: '#3B82F6', icon: '💼', createdBy: demoUser.id },
    { name: '学习', description: '学习资料和笔记', color: '#10B981', icon: '📚', createdBy: demoUser.id },
    { name: '生活', description: '日常生活记录', color: '#F59E0B', icon: '🌟', createdBy: demoUser.id },
    { name: '技术', description: '技术文档和代码', color: '#8B5CF6', icon: '💻', createdBy: demoUser.id },
    { name: '创意', description: '创意和想法记录', color: '#EC4899', icon: '🎨', createdBy: demoUser.id },
  ];

  const createdCategories = await Promise.all(
    categories.map((cat) =>
      prisma.category.create({
        data: cat,
      })
    )
  );

  // 4. 创建标签
  console.log('🏷️ 创建标签...');
  const tags = [
    { name: '重要', color: '#EF4444', category: 'priority', description: '重要内容', createdBy: demoUser.id },
    { name: '待办', color: '#F59E0B', category: 'status', description: '待处理事项', createdBy: demoUser.id },
    { name: '已完成', color: '#10B981', category: 'status', description: '已完成事项', createdBy: demoUser.id },
    { name: '想法', color: '#8B5CF6', category: 'type', description: '创意想法', createdBy: demoUser.id },
    { name: '参考资料', color: '#6B7280', category: 'type', description: '参考和资料', createdBy: demoUser.id },
    { name: '项目', color: '#3B82F6', category: 'context', description: '项目相关', createdBy: demoUser.id },
    { name: '会议', color: '#EC4899', category: 'context', description: '会议记录', createdBy: demoUser.id },
    { name: '灵感', color: '#14B8A6', category: 'type', description: '灵感记录', createdBy: demoUser.id },
  ];

  const createdTags = await Promise.all(
    tags.map((tag) =>
      prisma.tag.create({
        data: tag,
      })
    )
  );

  // 5. 创建示例笔记
  console.log('📝 创建示例笔记...');
  const notes = [
    {
      title: '欢迎使用 MindNote',
      content: `# 欢迎使用 MindNote

MindNote 是一个智能笔记应用，集成了强大的AI分析功能，帮助您更好地管理和理解您的笔记。

## 主要功能

1. **智能记录** - 随手记录各种类型的信息
2. **自动归类** - 系统自动打标签进行内容标注
3. **关联分析** - 后台定期对所有笔记进行关联性分析
4. **关系图谱** - 通过关系图谱展现笔记关联关系
5. **AI对话** - 基于相关笔记内容与AI进行讨论
6. **搜索整合** - AI启用联网搜索Deep Research功能搜集整理最新相关资料

## 开始使用

1. 创建您的第一条笔记
2. 尝试AI分析功能
3. 探索搜索和关联功能
4. 定制您的个人设置

祝您使用愉快！`,
      userId: demoUser.id,
      categoryId: createdCategories[0].id,
      status: 'PUBLISHED' as const,
      isPublic: true,
      metadata: {
        wordCount: 280,
        readTime: 2,
        tags: ['welcome', 'tutorial', 'getting-started'],
      },
    },
    {
      title: '项目开发计划',
      content: `# 项目开发计划

## 项目概述
开发一个基于AI的智能笔记管理系统。

## 技术栈
- 前端: Next.js 15 + React 19 + TypeScript
- 后端: Next.js API Routes + Prisma
- 数据库: PostgreSQL + pgvector
- AI集成: OpenAI API + 自定义模型

## 开发阶段

### 第一阶段：基础功能 (当前阶段)
- [x] 用户认证系统
- [x] 基础笔记CRUD
- [x] 分类和标签系统
- [ ] AI内容分析
- [ ] 搜索功能

### 第二阶段：AI增强
- [ ] 自动摘要生成
- [ ] 关键词提取
- [ ] 内容分类
- [ ] 关系分析

### 第三阶段：高级功能
- [ ] 关系图谱可视化
- [ ] 知识图谱构建
- [ ] 智能推荐
- [ ] 多模态内容支持

## 下一步行动
1. 完成AI分析功能
2. 实现搜索系统
3. 优化用户体验
4. 性能优化和测试`,
      userId: demoUser.id,
      categoryId: createdCategories[3].id,
      status: 'PUBLISHED' as const,
      metadata: {
        wordCount: 450,
        readTime: 3,
        tags: ['project', 'development', 'planning'],
        priority: 'HIGH',
      },
    },
    {
      title: '学习笔记：数据库设计原则',
      content: `# 数据库设计原则

## 基本原则

### 1. 数据库规范化
- **第一范式(1NF)**: 确保每列都是原子性的
- **第二范式(2NF)**: 满足1NF，且非主键列完全依赖于主键
- **第三范式(3NF)**: 满足2NF，且非主键列不传递依赖于主键

### 2. 索引优化
- 为经常查询的列创建索引
- 避免过度索引
- 使用复合索引优化多列查询
- 定期分析和优化索引性能

### 3. 数据完整性
- 使用外键约束确保引用完整性
- 添加检查约束验证数据有效性
- 使用触发器实现复杂的业务规则

## 性能优化

### 查询优化
- 避免SELECT *查询
- 使用EXPLAIN分析查询计划
- 合理使用JOIN操作
- 实现查询缓存机制

### 数据分区
- 按时间分区历史数据
- 按用户分区用户数据
- 实现自动数据归档策略

## 安全考虑
- 实施行级安全策略
- 加密敏感数据
- 定期备份数据
- 监控数据库访问日志

## 参考资料
- 《数据库系统概念》
- PostgreSQL官方文档
- 《高性能MySQL》`,
      userId: demoUser.id,
      categoryId: createdCategories[1].id,
      status: 'PUBLISHED' as const,
      metadata: {
        wordCount: 680,
        readTime: 5,
        tags: ['database', 'design', 'optimization', 'security'],
        difficulty: 'INTERMEDIATE',
      },
    },
    {
      title: '创意想法：智能学习助手',
      content: `# 创意想法：智能学习助手

## 概念描述
开发一个基于AI的个性化学习助手，能够：

1. **学习路径规划**
   - 根据用户知识水平制定学习计划
   - 推荐相关学习资源
   - 跟踪学习进度

2. **智能答疑**
   - 理解上下文的问题回答
   - 提供多角度解释
   - 生成相关练习题

3. **知识图谱构建**
   - 自动构建知识关联网络
   - 识别知识盲点
   - 推荐补充学习内容

## 技术实现

### 核心技术
- **知识表示**: 图数据库存储知识结构
- **NLP处理**: 理解和生成教学内容
- **推荐算法**: 基于协同过滤和内容推荐
- **进度跟踪**: 学习分析算法

### 系统架构
```
用户界面 → AI处理引擎 → 知识图谱 → 内容推荐
    ↓           ↓            ↓         ↓
用户数据 ← 学习分析 ← 进度跟踪 ← 效果评估
```

## 商业价值
1. **个性化教育**: 解决"一刀切"教育问题
2. **学习效率**: 提高学习效果和兴趣
3. **数据驱动**: 基于学习数据优化教学方法

## 下一步行动
- 市场调研和竞品分析
- 技术可行性评估
- 原型开发
- 用户测试和反馈`,
      userId: demoUser.id,
      categoryId: createdCategories[4].id,
      status: 'DRAFT' as const,
      metadata: {
        wordCount: 420,
        readTime: 3,
        tags: ['idea', 'education', 'AI', 'startup'],
        innovationLevel: 'HIGH',
      },
    },
  ];

  const createdNotes = await Promise.all(
    notes.map((note) => {
      // 计算内容哈希
      const crypto = require('crypto');
      const contentHash = crypto.createHash('sha256').update(note.content).digest('hex');

      return prisma.note.create({
        data: {
          ...note,
          contentHash,
        },
      });
    })
  );

  // 6. 创建笔记标签关联
  console.log('🔗 创建笔记标签关联...');
  const noteTagRelations = [
    { noteIndex: 0, tagIndexes: [0, 6] }, // 欢迎笔记: 重要, 欢迎使用(映射到"灵感")
    { noteIndex: 1, tagIndexes: [1, 5, 0] }, // 项目笔记: 待办, 项目, 重要
    { noteIndex: 2, tagIndexes: [4, 0] }, // 学习笔记: 参考资料, 重要
    { noteIndex: 3, tagIndexes: [3, 7, 5] }, // 创意笔记: 想法, 灵感, 项目
  ];

  for (const relation of noteTagRelations) {
    const note = createdNotes[relation.noteIndex];
    for (const tagIndex of relation.tagIndexes) {
      const tag = createdTags[tagIndex];
      await prisma.noteTag.create({
        data: {
          noteId: note.id,
          tagId: tag.id,
        },
      });

      // 更新标签使用计数
      await prisma.tag.update({
        where: { id: tag.id },
        data: { usageCount: { increment: 1 } },
      });
    }
  }

  // 7. 创建示例AI处理日志
  console.log('🤖 创建AI处理日志...');
  const aiLogs = [
    {
      noteId: createdNotes[0].id,
      userId: demoUser.id,
      processingType: 'SUMMARIZATION',
      provider: 'openai',
      model: 'gpt-4-turbo',
      inputTokens: 850,
      outputTokens: 150,
      processingTimeMs: 2300,
      cost: 0.015,
      status: 'COMPLETED',
      result: {
        summary: '这是一篇介绍MindNote智能笔记应用的欢迎指南，涵盖了主要功能和使用方法。',
        keywords: ['智能笔记', 'AI分析', '关系图谱', '搜索功能'],
        sentiment: 'positive',
      },
    },
    {
      noteId: createdNotes[2].id,
      userId: demoUser.id,
      processingType: 'CLASSIFICATION',
      provider: 'openai',
      model: 'gpt-4-turbo',
      inputTokens: 1200,
      outputTokens: 180,
      processingTimeMs: 3100,
      cost: 0.022,
      status: 'COMPLETED',
      result: {
        categories: ['技术文档', '学习资料'],
        difficulty: 'intermediate',
        topics: ['数据库', '设计模式', '性能优化'],
      },
    },
  ];

  for (const log of aiLogs) {
    await prisma.aiProcessingLog.create({
      data: log,
    });
  }

  // 8. 创建示例笔记关系
  console.log('🔗 创建笔记关系...');
  const noteRelationships = [
    {
      sourceNoteId: createdNotes[1].id,
      targetNoteId: createdNotes[3].id,
      relationshipType: 'RELATED',
      strengthScore: 0.75,
      aiGenerated: true,
      metadata: {
        reason: '项目开发中包含智能助手功能想法',
        confidence: 0.85,
      },
    },
    {
      sourceNoteId: createdNotes[2].id,
      targetNoteId: createdNotes[1].id,
      relationshipType: 'REFERENCE',
      strengthScore: 0.85,
      aiGenerated: false,
      metadata: {
        reason: '项目开发需要数据库设计知识',
        userDefined: true,
      },
    },
  ];

  for (const rel of noteRelationships) {
    await prisma.noteRelationship.create({
      data: rel,
    });
  }

  // 9. 创建示例用户反馈
  console.log('⭐ 创建用户反馈...');
  const feedbacks = [
    {
      userId: demoUser.id,
      noteId: createdNotes[0].id,
      feedbackType: 'SUMMARY_QUALITY',
      rating: 5,
      comment: '摘要准确，很好地概括了内容要点',
    },
    {
      userId: demoUser.id,
      noteId: createdNotes[2].id,
      feedbackType: 'CLASSIFICATION',
      rating: 4,
      comment: '分类基本准确，但可以更细化一些',
    },
  ];

  for (const feedback of feedbacks) {
    await prisma.userFeedback.create({
      data: feedback,
    });
  }

  // 更新笔记的AI处理状态
  console.log('🔄 更新笔记AI处理状态...');
  await prisma.note.updateMany({
    where: {
      id: {
        in: [createdNotes[0].id, createdNotes[2].id],
      },
    },
    data: {
      aiProcessed: true,
      aiProcessedAt: new Date(),
    },
  });

  console.log('✅ 种子数据初始化完成！');
  console.log('');
  console.log('📊 创建的数据统计:');
  console.log(`- 用户: ${2}`);
  console.log(`- 分类: ${createdCategories.length}`);
  console.log(`- 标签: ${createdTags.length}`);
  console.log(`- 笔记: ${createdNotes.length}`);
  console.log(`- AI处理日志: ${aiLogs.length}`);
  console.log(`- 笔记关系: ${noteRelationships.length}`);
  console.log(`- 用户反馈: ${feedbacks.length}`);
  console.log('');
  console.log('🔑 测试账号信息:');
  console.log('- 邮箱: demo@mindnote.com');
  console.log('- 密码: password123');
  console.log('');
  console.log('- 邮箱: admin@mindnote.com');
  console.log('- 密码: password123');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });