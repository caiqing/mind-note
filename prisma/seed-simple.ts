/**
 * 简化版数据库种子数据脚本
 * 用于验证基本功能
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始简化版种子数据初始化...');

  try {
    // 清理现有数据
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
    console.log('✅ 数据清理完成');

    // 创建系统配置
    console.log('⚙️ 创建系统配置...');
    await prisma.systemConfig.create({
      data: {
        key: 'app.version',
        value: {
          version: '1.0.0',
          buildDate: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        },
        description: '应用版本信息',
      },
    });

    // 加密密码
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 创建用户
    console.log('👤 创建用户...');
    const demoUser = await prisma.user.create({
      data: {
        email: 'demo@mindnote.com',
        username: 'demo',
        passwordHash: hashedPassword,
        fullName: 'Demo User',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
        emailVerified: true,
        aiPreferences: {
          preferredProvider: 'openai',
          analysisLevel: 'detailed',
          autoProcess: true,
          summaryLength: 'medium',
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
    });

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@mindnote.com',
        username: 'admin',
        passwordHash: hashedPassword,
        fullName: 'Admin User',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        emailVerified: true,
        aiPreferences: {
          preferredProvider: 'openai',
          analysisLevel: 'comprehensive',
          autoProcess: true,
          summaryLength: 'detailed',
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
    });

    console.log(`✅ 创建了 2 个用户`);

    // 创建分类
    console.log('📁 创建分类...');
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          name: '工作',
          description: '工作相关笔记',
          color: '#3B82F6',
          icon: '💼',
          createdBy: demoUser.id,
        },
      }),
      prisma.category.create({
        data: {
          name: '学习',
          description: '学习资料和笔记',
          color: '#10B981',
          icon: '📚',
          createdBy: demoUser.id,
        },
      }),
      prisma.category.create({
        data: {
          name: '技术',
          description: '技术文档和代码',
          color: '#8B5CF6',
          icon: '💻',
          createdBy: demoUser.id,
        },
      }),
    ]);

    console.log(`✅ 创建了 ${categories.length} 个分类`);

    // 创建标签
    console.log('🏷️ 创建标签...');
    const tags = await Promise.all([
      prisma.tag.create({
        data: {
          name: '重要',
          color: '#EF4444',
          category: 'priority',
          description: '重要内容',
          createdBy: demoUser.id,
        },
      }),
      prisma.tag.create({
        data: {
          name: '进行中',
          color: '#3B82F6',
          category: 'status',
          description: '正在处理',
          createdBy: demoUser.id,
        },
      }),
      prisma.tag.create({
        data: {
          name: '前端',
          color: '#3B82F6',
          category: 'technology',
          description: '前端开发',
          createdBy: demoUser.id,
        },
      }),
    ]);

    console.log(`✅ 创建了 ${tags.length} 个标签`);

    // 创建示例笔记
    console.log('📝 创建示例笔记...');
    const crypto = require('crypto');

    const sampleNotes = [
      {
        title: '欢迎使用MindNote',
        content: '这是您的第一条智能笔记！MindNote是一个功能强大的笔记应用，支持AI辅助分析、智能标签、关系图谱等功能。\n\n您可以：\n- 创建和管理各种类型的笔记\n- 使用AI进行内容分析和摘要\n- 通过标签和分类组织内容\n- 发现笔记之间的关联关系\n\n开始您的智能笔记之旅吧！',
        status: 'PUBLISHED' as const,
      },
      {
        title: 'React Hooks最佳实践',
        content: '今天学习了React Hooks的最佳实践，包括useState、useEffect、useContext等常用Hook的使用方法。\n\n主要收获：\n1. useState的使用要遵循不可变性原则\n2. useEffect要注意清理副作用\n3. useContext可以避免prop drilling\n4. 自定义Hook可以提高代码复用性\n\n需要在实际项目中多加练习。',
        status: 'PUBLISHED' as const,
      },
      {
        title: '项目会议记录',
        content: '参加新项目启动会议，讨论了项目目标和技术方案。\n\n会议要点：\n- 项目目标：开发智能笔记应用\n- 技术栈：React + Node.js + PostgreSQL\n- 开发周期：3个月\n- 团队分工：前端2人，后端2人\n\n下一步行动：\n1. 搭建开发环境\n2. 设计数据库架构\n3. 实现基础功能',
        status: 'DRAFT' as const,
      },
    ];

    const createdNotes = [];
    for (const noteData of sampleNotes) {
      const contentHash = crypto.createHash('sha256').update(noteData.content).digest('hex');

      const note = await prisma.note.create({
        data: {
          title: noteData.title,
          content: noteData.content,
          contentHash,
          status: noteData.status,
          userId: demoUser.id,
          categoryId: categories[Math.floor(Math.random() * categories.length)].id,
          aiProcessed: false,
          isPublic: false,
          viewCount: 0,
        },
      });

      createdNotes.push(note);
      console.log(`✅ 创建笔记: ${note.title}`);
    }

    console.log(`✅ 成功创建了 ${createdNotes.length} 条笔记`);
    console.log('🎉 种子数据初始化完成！');

    // 显示统计信息
    const stats = {
      users: await prisma.user.count(),
      categories: await prisma.category.count(),
      tags: await prisma.tag.count(),
      notes: await prisma.note.count(),
    };

    console.log('📊 数据统计:');
    console.log(`  用户: ${stats.users}`);
    console.log(`  分类: ${stats.categories}`);
    console.log(`  标签: ${stats.tags}`);
    console.log(`  笔记: ${stats.notes}`);

  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });