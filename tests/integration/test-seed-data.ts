/**
 * 种子数据集成测试
 * 验证种子数据脚本的完整性和数据质量
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('种子数据集成测试', () => {
  beforeAll(async () => {
    // 确保测试环境已初始化
    console.log('开始种子数据集成测试...');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    console.log('种子数据集成测试完成');
  });

  describe('基础数据完整性', () => {
    it('应该创建必要的用户数据', async () => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          emailVerified: true,
          isActive: true
        }
      });

      expect(users.length).toBeGreaterThan(0);

      // 验证必需的测试用户
      const testUsers = users.filter(u => u.email.includes('@mindnote.com'));
      expect(testUsers.length).toBeGreaterThanOrEqual(2);

      // 验证用户数据完整性
      users.forEach(user => {
        expect(user.email).toBeDefined();
        expect(user.username).toBeDefined();
        expect(user.fullName).toBeDefined();
        expect(typeof user.emailVerified).toBe('boolean');
        expect(typeof user.isActive).toBe('boolean');
      });
    });

    it('应该创建默认分类', async () => {
      const categories = await prisma.category.findMany({
        where: { isDefault: true }
      });

      expect(categories.length).toBeGreaterThan(0);

      // 验证必需的分类
      const requiredCategories = ['工作', '学习', '生活', '技术', '创意'];
      const categoryNames = categories.map(c => c.name);

      requiredCategories.forEach(category => {
        expect(categoryNames).toContain(category);
      });

      // 验证分类数据完整性
      categories.forEach(category => {
        expect(category.name).toBeDefined();
        expect(category.color).toBeDefined();
        expect(category.icon).toBeDefined();
        expect(category.description).toBeDefined();
        expect(category.createdBy).toBeDefined();
      });
    });

    it('应该创建多样化的标签', async () => {
      const tags = await prisma.tag.findMany();

      expect(tags.length).toBeGreaterThan(0);

      // 验证标签分类
      const tagCategories = [...new Set(tags.map(t => t.category))];
      expect(tagCategories.length).toBeGreaterThan(0);

      // 验证必需的标签类别
      const requiredCategories = ['priority', 'status', 'type', 'context'];
      requiredCategories.forEach(category => {
        expect(tagCategories).toContain(category);
      });

      // 验证标签数据完整性
      tags.forEach(tag => {
        expect(tag.name).toBeDefined();
        expect(tag.color).toBeDefined();
        expect(tag.category).toBeDefined();
        expect(tag.createdBy).toBeDefined();
      });
    });

    it('应该创建系统配置', async () => {
      const configs = await prisma.systemConfig.findMany();

      expect(configs.length).toBeGreaterThan(0);

      // 验证必需的配置项
      const requiredConfigs = [
        'app.version',
        'ai.default_model',
        'search.settings',
        'ai.analysis.settings'
      ];

      const configKeys = configs.map(c => c.key);
      requiredConfigs.forEach(key => {
        expect(configKeys).toContain(key);
      });

      // 验证配置数据完整性
      configs.forEach(config => {
        expect(config.key).toBeDefined();
        expect(config.value).toBeDefined();
        expect(config.description).toBeDefined();
      });
    });
  });

  describe('笔记数据质量', () => {
    it('应该创建示例笔记', async () => {
      const notes = await prisma.note.findMany({
        include: {
          user: {
            select: { id: true, username: true }
          },
          category: {
            select: { id: true, name: true }
          },
          tags: {
            include: {
              tag: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      expect(notes.length).toBeGreaterThan(0);

      // 验证笔记数据完整性
      notes.forEach(note => {
        expect(note.title).toBeDefined();
        expect(note.content).toBeDefined();
        expect(note.status).toBeDefined();
        expect(note.userId).toBeDefined();
        expect(note.categoryId).toBeDefined();
        expect(note.wordCount).toBeGreaterThan(0);
        expect(note.readingTime).toBeGreaterThan(0);
        expect(note.createdAt).toBeDefined();
        expect(note.updatedAt).toBeDefined();

        // 验证关联数据
        expect(note.user).toBeDefined();
        expect(note.category).toBeDefined();
        expect(Array.isArray(note.tags)).toBe(true);
      });

      // 验证笔记状态分布
      const statuses = [...new Set(notes.map(n => n.status))];
      expect(statuses.length).toBeGreaterThan(0);
    });

    it('应该合理分配笔记状态', async () => {
      const [draftCount, publishedCount, archivedCount] = await Promise.all([
        prisma.note.count({ where: { status: 'DRAFT' } }),
        prisma.note.count({ where: { status: 'PUBLISHED' } }),
        prisma.note.count({ where: { status: 'ARCHIVED' } })
      ]);

      const total = draftCount + publishedCount + archivedCount;

      // 大部分笔记应该是已发布状态
      expect(publishedCount / total).toBeGreaterThan(0.5);

      // 草稿和归档的笔记应该较少
      expect(draftCount / total).toBeLessThan(0.3);
      expect(archivedCount / total).toBeLessThan(0.3);
    });

    it('应该创建合理的笔记-标签关联', async () => {
      const noteTags = await prisma.noteTag.findMany({
        include: {
          note: { select: { id: true, title: true } },
          tag: { select: { id: true, name: true } }
        }
      });

      if (noteTags.length > 0) {
        // 验证关联数据完整性
        noteTags.forEach(noteTag => {
          expect(noteTag.noteId).toBeDefined();
          expect(noteTag.tagId).toBeDefined();
          expect(noteTag.note).toBeDefined();
          expect(noteTag.tag).toBeDefined();
          expect(noteTag.createdAt).toBeDefined();
        });

        // 验证每个笔记至少有一个标签
        const notesWithTags = new Set(noteTags.map(nt => nt.noteId));
        const totalNotes = await prisma.note.count();

        if (totalNotes > 0) {
          expect(notesWithTags.size / totalNotes).toBeGreaterThan(0.5);
        }
      }
    });
  });

  describe('AI处理数据', () => {
    it('应该创建AI处理日志', async () => {
      const aiLogs = await prisma.aiProcessingLog.findMany({
        include: {
          note: {
            select: { id: true, title: true }
          }
        }
      });

      // 如果有AI处理日志，验证其完整性
      if (aiLogs.length > 0) {
        aiLogs.forEach(log => {
          expect(log.noteId).toBeDefined();
          expect(log.operationType).toBeDefined();
          expect(log.status).toBeDefined();
          expect(log.prompt).toBeDefined();
          expect(log.startTime).toBeDefined();

          if (log.status === 'COMPLETED') {
            expect(log.endTime).toBeDefined();
            expect(log.duration).toBeGreaterThan(0);
          }

          if (log.status === 'FAILED') {
            expect(log.errorMessage).toBeDefined();
          }
        });
      }
    });

    it('应该处理AI增强的笔记', async () => {
      const enhancedNotes = await prisma.note.findMany({
        where: {
          aiProcessed: true,
          OR: [
            { aiSummary: { not: null } },
            { aiKeywords: { not: null } },
            { aiCategories: { not: null } }
          ]
        }
      });

      if (enhancedNotes.length > 0) {
        enhancedNotes.forEach(note => {
          if (note.aiSummary) {
            expect(typeof note.aiSummary).toBe('string');
            expect(note.aiSummary.length).toBeGreaterThan(0);
          }

          if (note.aiKeywords) {
            expect(Array.isArray(note.aiKeywords)).toBe(true);
          }

          if (note.aiCategories) {
            expect(Array.isArray(note.aiCategories)).toBe(true);
          }
        });
      }
    });
  });

  describe('用户反馈数据', () => {
    it('应该创建用户反馈', async () => {
      const feedback = await prisma.userFeedback.findMany({
        include: {
          note: {
            select: { id: true, title: true }
          },
          user: {
            select: { id: true, username: true }
          }
        }
      });

      if (feedback.length > 0) {
        feedback.forEach(f => {
          expect(f.noteId).toBeDefined();
          expect(f.userId).toBeDefined();
          expect(f.type).toBeDefined();
          expect(f.rating).toBeGreaterThanOrEqual(1);
          expect(f.rating).toBeLessThanOrEqual(5);
          expect(f.createdAt).toBeDefined();

          // 验证反馈不是自己给自己的
          expect(f.note.userId).not.toBe(f.userId);
        });

        // 验证反馈类型分布
        const feedbackTypes = [...new Set(feedback.map(f => f.type))];
        expect(feedbackTypes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('笔记关系数据', () => {
    it('应该创建笔记关系', async () => {
      const relationships = await prisma.noteRelationship.findMany({
        include: {
          source: {
            select: { id: true, title: true }
          },
          target: {
            select: { id: true, title: true }
          }
        }
      });

      if (relationships.length > 0) {
        relationships.forEach(rel => {
          expect(rel.sourceId).toBeDefined();
          expect(rel.targetId).toBeDefined();
          expect(rel.type).toBeDefined();
          expect(rel.source).toBeDefined();
          expect(rel.target).toBeDefined();
          expect(rel.strength).toBeGreaterThanOrEqual(0);
          expect(rel.strength).toBeLessThanOrEqual(1);
          expect(rel.createdAt).toBeDefined();
        });

        // 验证关系类型分布
        const relationshipTypes = [...new Set(relationships.map(r => r.type))];
        expect(relationshipTypes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('数据一致性和关系完整性', () => {
    it('所有笔记应该关联到有效的用户', async () => {
      const notes = await prisma.note.findMany({
        select: { userId: true }
      });

      const userIds = [...new Set(notes.map(n => n.userId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true }
      });

      expect(users.length).toBe(userIds.length);
    });

    it('所有笔记应该关联到有效的分类', async () => {
      const notes = await prisma.note.findMany({
        select: { categoryId: true }
      });

      const categoryIds = [...new Set(notes.map(n => n.categoryId))];
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true }
      });

      expect(categories.length).toBe(categoryIds.length);
    });

    it('所有标签关联应该指向有效的标签', async () => {
      const noteTags = await prisma.noteTag.findMany({
        select: { tagId: true }
      });

      const tagIds = [...new Set(noteTags.map(nt => nt.tagId))];
      const tags = await prisma.tag.findMany({
        where: { id: { in: tagIds } },
        select: { id: true }
      });

      expect(tags.length).toBe(tagIds.length);
    });

    it('AI处理日志应该关联到有效的笔记', async () => {
      const aiLogs = await prisma.aiProcessingLog.findMany({
        select: { noteId: true }
      });

      if (aiLogs.length > 0) {
        const noteIds = [...new Set(aiLogs.map(log => log.noteId))];
        const notes = await prisma.note.findMany({
          where: { id: { in: noteIds } },
          select: { id: true }
        });

        expect(notes.length).toBe(noteIds.length);
      }
    });
  });

  describe('性能和可扩展性验证', () => {
    it('数据量应该在合理范围内', async () => {
      const [
        userCount,
        categoryCount,
        tagCount,
        noteCount,
        aiLogCount
      ] = await Promise.all([
        prisma.user.count(),
        prisma.category.count(),
        prisma.tag.count(),
        prisma.note.count(),
        prisma.aiProcessingLog.count()
      ]);

      // 验证数据量合理性
      expect(userCount).toBeLessThan(100);
      expect(categoryCount).toBeLessThan(50);
      expect(tagCount).toBeLessThan(100);
      expect(noteCount).toBeLessThan(1000);
      expect(aiLogCount).toBeLessThan(500);

      console.log('数据量统计:');
      console.log(`  用户: ${userCount}`);
      console.log(`  分类: ${categoryCount}`);
      console.log(`  标签: ${tagCount}`);
      console.log(`  笔记: ${noteCount}`);
      console.log(`  AI日志: ${aiLogCount}`);
    });

    it('查询性能应该在可接受范围内', async () => {
      const startTime = Date.now();

      // 执行一些典型查询
      await Promise.all([
        // 复杂关联查询
        prisma.note.findMany({
          include: {
            user: { select: { username: true } },
            category: { select: { name: true } },
            tags: {
              include: { tag: { select: { name: true } } }
            }
          },
          take: 10
        }),
        // 聚合查询
        prisma.note.groupBy({
          by: ['status'],
          _count: true
        }),
        // 搜索查询
        prisma.note.findMany({
          where: {
            OR: [
              { title: { contains: '技术' } },
              { content: { contains: '技术' } }
            ]
          },
          take: 5
        })
      ]);

      const queryTime = Date.now() - startTime;

      // 查询应该在1秒内完成
      expect(queryTime).toBeLessThan(1000);
      console.log(`查询执行时间: ${queryTime}ms`);
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理无效的数据引用', async () => {
      // 尝试查询不存在的数据
      const invalidNote = await prisma.note.findFirst({
        where: { userId: 'invalid-uuid' }
      });

      expect(invalidNote).toBeNull();
    });

    it('应该处理空结果集', async () => {
      // 查询不存在的内容
      const nonExistentNotes = await prisma.note.findMany({
        where: { title: 'ThisTitleShouldNotExist' }
      });

      expect(Array.isArray(nonExistentNotes)).toBe(true);
      expect(nonExistentNotes.length).toBe(0);
    });
  });
});