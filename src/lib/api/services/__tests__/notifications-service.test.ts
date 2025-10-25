/**
 * T111 通知API服务测试套件
 * 测试通知服务的完整功能，包括多渠道通知、模板管理、用户设置等
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationsService } from '../notifications-service';
import { NotificationConfig, CreateNotificationRequest, NotificationTemplate } from '../../types';
import { ValidationError, NotFoundError } from '../../errors';

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;
  let testConfig: NotificationConfig;

  beforeEach(() => {
    testConfig = {
      baseUrl: 'http://localhost:3000/api/v1/notifications',
      timeout: 30000,
      retries: 3,
      enableLogging: false,
      enableCaching: true,
      cacheTTL: 300000,
      maxQueueSize: 10000,
      batchSize: 100,
      processingInterval: 30000,
      retentionPeriod: 90 * 24 * 60 * 60 * 1000,
      enableTemplates: true,
      enableRateLimiting: true,
      enableUserPreferences: true,
      defaultChannels: ['in_app', 'email'],
      maxRetries: 3,
      retryDelay: 5000
    };

    notificationsService = new NotificationsService(testConfig);
  });

  afterEach(() => {
    notificationsService = null as any;
  });

  describe('通知创建', () => {
    describe('createNotification', () => {
      it('应该成功创建基本通知', async () => {
        const request: CreateNotificationRequest = {
          recipientId: 'user_123',
          type: 'welcome',
          title: '欢迎使用MindNote',
          content: '感谢您注册MindNote！开始您的智能笔记之旅吧。',
          channels: ['in_app', 'email'],
          priority: 'normal'
        };

        const result = await notificationsService.createNotification(request);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.recipientId).toBe('user_123');
        expect(result.data.type).toBe('welcome');
        expect(result.data.title).toBe('欢迎使用MindNote');
        expect(result.data.status).toBeDefined();
        expect(result.data.id).toBeDefined();
      });

      it('应该支持创建高优先级通知', async () => {
        const request: CreateNotificationRequest = {
          recipientId: 'user_123',
          type: 'security_alert',
          title: '安全警报',
          content: '检测到异常登录活动',
          channels: ['in_app', 'email', 'sms'],
          priority: 'urgent'
        };

        const result = await notificationsService.createNotification(request);

        expect(result.success).toBe(true);
        expect(result.data.priority).toBe('urgent');
        expect(result.data.channels).toContain('sms');
      });

      it('应该支持计划发送通知', async () => {
        const scheduledTime = new Date(Date.now() + 60000); // 1分钟后

        const request: CreateNotificationRequest = {
          recipientId: 'user_123',
          type: 'system_maintenance',
          title: '系统维护通知',
          content: '系统将于今晚进行维护',
          channels: ['in_app'],
          scheduledAt: scheduledTime
        };

        const result = await notificationsService.createNotification(request);

        expect(result.success).toBe(true);
        expect(result.data.scheduledAt).toEqual(scheduledTime);
        expect(result.data.status).toBe('pending');
      });

      it('应该支持设置通知过期时间', async () => {
        const expireTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后

        const request: CreateNotificationRequest = {
          recipientId: 'user_123',
          type: 'promotion',
          title: '限时优惠',
          content: '享受特别的会员优惠',
          channels: ['email'],
          expiresAt: expireTime
        };

        const result = await notificationsService.createNotification(request);

        expect(result.success).toBe(true);
        expect(result.data.expiresAt).toEqual(expireTime);
      });

      it('应该拒绝无效的通知请求', async () => {
        const invalidRequest = {
          recipientId: '',
          type: '',
          title: '',
          content: '',
          channels: [],
          priority: 'invalid_priority'
        } as any;

        await expect(notificationsService.createNotification(invalidRequest))
          .rejects.toThrow(ValidationError);
      });

      it('应该拒绝无效的渠道', async () => {
        const request = {
          recipientId: 'user_123',
          type: 'test',
          title: '测试通知',
          content: '测试内容',
          channels: ['invalid_channel']
        } as any;

        await expect(notificationsService.createNotification(request))
          .rejects.toThrow(ValidationError);
      });

      it('应该支持自定义元数据', async () => {
        const request: CreateNotificationRequest = {
          recipientId: 'user_123',
          type: 'custom',
          title: '自定义通知',
          content: '包含自定义元数据的通知',
          channels: ['in_app'],
          metadata: {
            source: 'mobile_app',
            category: 'engagement',
            tags: ['onboarding', 'tutorial'],
            campaign: 'welcome_series'
          }
        };

        const result = await notificationsService.createNotification(request);

        expect(result.success).toBe(true);
        expect(result.data.metadata.source).toBe('mobile_app');
        expect(result.data.metadata.category).toBe('engagement');
        expect(result.data.metadata.tags).toEqual(['onboarding', 'tutorial']);
        expect(result.data.metadata.campaign).toBe('welcome_series');
      });
    });

    describe('createNotificationFromTemplate', () => {
      it('应该使用模板创建通知', async () => {
        const variables = {
          userName: '张三',
          noteTitle: '我的第一篇笔记',
          noteId: 'note_123'
        };

        const result = await notificationsService.createNotificationFromTemplate(
          'note_shared',
          'user_123',
          variables
        );

        expect(result.success).toBe(true);
        expect(result.data.type).toBe('share');
        expect(result.data.title).toContain('与您分享了一篇笔记');
        expect(result.data.content).toContain('我的第一篇笔记');
        expect(result.data.data.templateId).toBe('note_shared');
      });

      it('应该验证模板变量', async () => {
        const variables = {
          // 缺少必需的变量
          userName: '张三'
        };

        await expect(
          notificationsService.createNotificationFromTemplate('note_shared', 'user_123', variables)
        ).rejects.toThrow(ValidationError);
      });

      it('应该支持自定义选项', async () => {
        const variables = {
          commenterName: '李四',
          noteTitle: '项目笔记',
          commentPreview: '很好的总结！',
          noteId: 'note_456',
          commentId: 'comment_789'
        };

        const options = {
          channels: ['in_app'], // 覆盖模板默认渠道
          priority: 'high' as const,
          scheduledAt: new Date(Date.now() + 30000),
          metadata: {
            source: 'api_v2'
          }
        };

        const result = await notificationsService.createNotificationFromTemplate(
          'comment_added',
          'user_123',
          variables,
          options
        );

        expect(result.success).toBe(true);
        expect(result.data.channels).toEqual(['in_app']);
        expect(result.data.priority).toBe('high');
        expect(result.data.scheduledAt).toEqual(options.scheduledAt);
        expect(result.data.metadata.source).toBe('api_v2');
      });

      it('应该拒绝不存在的模板', async () => {
        await expect(
          notificationsService.createNotificationFromTemplate('nonexistent_template', 'user_123', {})
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('createBulkNotifications', () => {
      it('应该成功创建批量通知', async () => {
        const requests: CreateNotificationRequest[] = [
          {
            recipientId: 'user_001',
            type: 'announcement',
            title: '系统公告',
            content: '系统将进行升级',
            channels: ['in_app']
          },
          {
            recipientId: 'user_002',
            type: 'announcement',
            title: '系统公告',
            content: '系统将进行升级',
            channels: ['in_app']
          },
          {
            recipientId: 'user_003',
            type: 'announcement',
            title: '系统公告',
            content: '系统将进行升级',
            channels: ['in_app']
          }
        ];

        const result = await notificationsService.createBulkNotifications(requests);

        expect(result.success).toBe(true);
        expect(result.data.successful).toHaveLength(3);
        expect(result.data.failed).toHaveLength(0);
      });

      it('应该处理部分失败的情况', async () => {
        const requests: CreateNotificationRequest[] = [
          {
            recipientId: 'user_001',
            type: 'valid',
            title: '有效通知',
            content: '有效内容',
            channels: ['in_app']
          },
          {
            recipientId: '', // 无效请求
            type: 'invalid',
            title: '',
            content: '',
            channels: []
          } as any,
          {
            recipientId: 'user_002',
            type: 'valid',
            title: '另一个有效通知',
            content: '有效内容',
            channels: ['in_app']
          }
        ];

        const result = await notificationsService.createBulkNotifications(requests);

        expect(result.success).toBe(true);
        expect(result.data.successful).toHaveLength(2);
        expect(result.data.failed).toHaveLength(1);
      });

      it('应该拒绝超过限制的批量请求', async () => {
        const tooManyRequests = Array(1001).fill(null).map((_, i) => ({
          recipientId: `user_${i}`,
          type: 'test',
          title: '测试通知',
          content: '测试内容',
          channels: ['in_app']
        }));

        await expect(notificationsService.createBulkNotifications(tooManyRequests))
          .rejects.toThrow(ValidationError);
      });

      it('应该拒绝空的请求数组', async () => {
        await expect(notificationsService.createBulkNotifications([]))
          .rejects.toThrow(ValidationError);
      });
    });
  });

  describe('通知管理', () => {
    describe('getNotifications', () => {
      it('应该返回通知列表', async () => {
        const result = await notificationsService.getNotifications(
          { recipientId: 'user_123' },
          { page: 1, limit: 20 }
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data.items)).toBe(true);
        expect(result.data.pagination).toBeDefined();
      });

      it('应该支持多种过滤条件', async () => {
        const filters = {
          recipientId: 'user_123',
          channels: ['in_app', 'email'],
          types: ['welcome', 'share'],
          statuses: ['sent', 'read'],
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
        };

        const result = await notificationsService.getNotifications(filters);

        expect(result.success).toBe(true);
        expect(result.data.items).toBeDefined();
      });

      it('应该支持分页', async () => {
        const pagination = { page: 2, limit: 10 };
        const result = await notificationsService.getNotifications({}, pagination);

        expect(result.success).toBe(true);
        expect(result.data.pagination.page).toBe(2);
        expect(result.data.pagination.limit).toBe(10);
      });
    });

    describe('getNotificationById', () => {
      it('应该根据ID返回通知', async () => {
        // 首先创建一个通知
        const createResult = await notificationsService.createNotification({
          recipientId: 'user_123',
          type: 'test',
          title: '测试通知',
          content: '测试内容',
          channels: ['in_app']
        });

        if (createResult.success && createResult.data) {
          const result = await notificationsService.getNotificationById(createResult.data.id);

          expect(result.success).toBe(true);
          expect(result.data.id).toBe(createResult.data.id);
          expect(result.data.title).toBe('测试通知');
        }
      });

      it('应该拒绝不存在的通知ID', async () => {
        await expect(notificationsService.getNotificationById('nonexistent_id'))
          .rejects.toThrow(NotFoundError);
      });

      it('应该拒绝无效的通知ID', async () => {
        await expect(notificationsService.getNotificationById(''))
          .rejects.toThrow(ValidationError);
      });
    });

    describe('updateNotification', () => {
      it('应该成功更新通知', async () => {
        // 首先创建一个通知
        const createResult = await notificationsService.createNotification({
          recipientId: 'user_123',
          type: 'test',
          title: '原标题',
          content: '原内容',
          channels: ['in_app']
        });

        if (createResult.success && createResult.data) {
          const updateResult = await notificationsService.updateNotification(createResult.data.id, {
            title: '更新后的标题',
            content: '更新后的内容'
          });

          expect(updateResult.success).toBe(true);
          expect(updateResult.data.title).toBe('更新后的标题');
          expect(updateResult.data.content).toBe('更新后的内容');
        }
      });

      it('应该拒绝更新不存在的通知', async () => {
        await expect(
          notificationsService.updateNotification('nonexistent_id', { title: '新标题' })
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('markNotificationAsRead', () => {
      it('应该成功标记通知为已读', async () => {
        // 首先创建一个通知
        const createResult = await notificationsService.createNotification({
          recipientId: 'user_123',
          type: 'test',
          title: '测试通知',
          content: '测试内容',
          channels: ['in_app']
        });

        if (createResult.success && createResult.data) {
          const result = await notificationsService.markNotificationAsRead(createResult.data.id);

          expect(result.success).toBe(true);
        }
      });

      it('应该拒绝标记不存在的通知', async () => {
        await expect(notificationsService.markNotificationAsRead('nonexistent_id'))
          .rejects.toThrow(NotFoundError);
      });
    });

    describe('markMultipleNotificationsAsRead', () => {
      it('应该批量标记通知为已读', async () => {
        // 创建多个通知
        const notificationIds: string[] = [];
        for (let i = 0; i < 3; i++) {
          const result = await notificationsService.createNotification({
            recipientId: 'user_123',
            type: 'test',
            title: `测试通知${i}`,
            content: `测试内容${i}`,
            channels: ['in_app']
          });

          if (result.success && result.data) {
            notificationIds.push(result.data.id);
          }
        }

        const result = await notificationsService.markMultipleNotificationsAsRead(notificationIds);

        expect(result.success).toBe(true);
      });

      it('应该拒绝超过限制的批量操作', async () => {
        const tooManyIds = Array(101).fill(null).map((_, i) => `id_${i}`);

        await expect(notificationsService.markMultipleNotificationsAsRead(tooManyIds))
          .rejects.toThrow(ValidationError);
      });

      it('应该拒绝空的ID数组', async () => {
        await expect(notificationsService.markMultipleNotificationsAsRead([]))
          .rejects.toThrow(ValidationError);
      });
    });

    describe('deleteNotification', () => {
      it('应该成功删除通知', async () => {
        // 首先创建一个通知
        const createResult = await notificationsService.createNotification({
          recipientId: 'user_123',
          type: 'test',
          title: '待删除通知',
          content: '待删除内容',
          channels: ['in_app']
        });

        if (createResult.success && createResult.data) {
          const result = await notificationsService.deleteNotification(createResult.data.id);

          expect(result.success).toBe(true);
        }
      });

      it('应该拒绝删除不存在的通知', async () => {
        await expect(notificationsService.deleteNotification('nonexistent_id'))
          .rejects.toThrow(NotFoundError);
      });
    });
  });

  describe('用户设置管理', () => {
    describe('getUserNotificationSettings', () => {
      it('应该返回用户通知设置', async () => {
        const result = await notificationsService.getUserNotificationSettings('user_123');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.userId).toBe('user_123');
        expect(result.data.channelPreferences).toBeDefined();
        expect(Array.isArray(result.data.channelPreferences)).toBe(true);
      });

      it('应该拒绝无效的用户ID', async () => {
        await expect(notificationsService.getUserNotificationSettings(''))
          .rejects.toThrow(ValidationError);
      });
    });

    describe('updateUserNotificationSettings', () => {
      it('应该成功更新用户通知设置', async () => {
        const updates = {
          channelPreferences: [
            { channel: 'email', enabled: false },
            { channel: 'push', enabled: true }
          ],
          doNotDisturb: true,
          doNotDisturbStartTime: 2200,
          doNotDisturbEndTime: 800,
          disabledTypes: ['promotion']
        };

        const result = await notificationsService.updateUserNotificationSettings('user_123', updates);

        expect(result.success).toBe(true);
        expect(result.data.channelPreferences).toEqual(updates.channelPreferences);
        expect(result.data.doNotDisturb).toBe(true);
      });

      it('应该拒绝无效的用户ID', async () => {
        await expect(
          notificationsService.updateUserNotificationSettings('', {})
        ).rejects.toThrow(ValidationError);
      });
    });
  });

  describe('模板管理', () => {
    describe('getNotificationTemplates', () => {
      it('应该返回所有通知模板', async () => {
        const result = await notificationsService.getNotificationTemplates();

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
      });

      it('应该支持按类别筛选', async () => {
        const result = await notificationsService.getNotificationTemplates({ category: 'user' });

        expect(result.success).toBe(true);
        result.data.forEach(template => {
          expect(template.category).toBe('user');
        });
      });

      it('应该支持按类型筛选', async () => {
        const result = await notificationsService.getNotificationTemplates({ type: 'welcome' });

        expect(result.success).toBe(true);
        result.data.forEach(template => {
          expect(template.type).toBe('welcome');
        });
      });

      it('应该支持按启用状态筛选', async () => {
        const result = await notificationsService.getNotificationTemplates({ enabled: true });

        expect(result.success).toBe(true);
        result.data.forEach(template => {
          expect(template.enabled).toBe(true);
        });
      });
    });

    describe('createNotificationTemplate', () => {
      it('应该成功创建通知模板', async () => {
        const request = {
          name: '自定义模板',
          description: '用户自定义的通知模板',
          category: 'collaboration',
          type: 'custom_type',
          channels: ['in_app', 'email'],
          subject: '自定义通知主题',
          content: {
            title: '{{senderName}}与您分享了{{contentType}}',
            body: '{{contentDescription}}，点击查看详情。',
            actionUrl: '/content/{{contentId}}',
            actionText: '查看内容'
          },
          variables: ['senderName', 'contentType', 'contentDescription', 'contentId']
        };

        const result = await notificationsService.createNotificationTemplate(request);

        expect(result.success).toBe(true);
        expect(result.data.name).toBe('自定义模板');
        expect(result.data.category).toBe('collaboration');
        expect(result.data.enabled).toBe(true);
        expect(result.data.id).toBeDefined();
      });

      it('应该验证必需字段', async () => {
        const invalidRequest = {
          name: '',
          description: '',
          category: 'invalid_category',
          content: {
            // 缺少title和body
          }
        } as any;

        await expect(notificationsService.createNotificationTemplate(invalidRequest))
          .rejects.toThrow(ValidationError);
      });

      it('应该验证内容结构', async () => {
        const request = {
          name: '测试模板',
          description: '测试描述',
          category: 'user',
          type: 'test',
          content: {
            // 缺少必需的title和body
            actionUrl: '/test'
          }
        } as any;

        await expect(notificationsService.createNotificationTemplate(request))
          .rejects.toThrow(ValidationError);
      });
    });

    describe('updateNotificationTemplate', () => {
      it('应该成功更新通知模板', async () => {
        // 首先创建一个模板
        const createResult = await notificationsService.createNotificationTemplate({
          name: '原始模板',
          description: '原始描述',
          category: 'user',
          type: 'original',
          content: {
            title: '原始标题',
            body: '原始内容'
          }
        });

        if (createResult.success && createResult.data) {
          const updates = {
            name: '更新后的模板',
            description: '更新后的描述',
            enabled: false
          };

          const updateResult = await notificationsService.updateNotificationTemplate(
            createResult.data.id,
            updates
          );

          expect(updateResult.success).toBe(true);
          expect(updateResult.data.name).toBe('更新后的模板');
          expect(updateResult.data.description).toBe('更新后的描述');
          expect(updateResult.data.enabled).toBe(false);
        }
      });

      it('应该拒绝更新不存在的模板', async () => {
        await expect(
          notificationsService.updateNotificationTemplate('nonexistent_id', { name: '新名称' })
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('deleteNotificationTemplate', () => {
      it('应该成功删除通知模板', async () => {
        // 首先创建一个模板
        const createResult = await notificationsService.createNotificationTemplate({
          name: '待删除模板',
          description: '待删除的模板',
          category: 'test',
          type: 'test',
          content: {
            title: '测试标题',
            body: '测试内容'
          }
        });

        if (createResult.success && createResult.data) {
          const result = await notificationsService.deleteNotificationTemplate(createResult.data.id);

          expect(result.success).toBe(true);
        }
      });

      it('应该拒绝删除不存在的模板', async () => {
        await expect(notificationsService.deleteNotificationTemplate('nonexistent_id'))
          .rejects.toThrow(NotFoundError);
      });
    });
  });

  describe('统计分析', () => {
    describe('getNotificationStats', () => {
      it('应该返回通知统计信息', async () => {
        const result = await notificationsService.getNotificationStats();

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.total).toBeGreaterThan(0);
        expect(result.data.sent).toBeGreaterThan(0);
        expect(result.data.delivered).toBeGreaterThan(0);
        expect(result.data.read).toBeGreaterThanOrEqual(0);
        expect(result.data.failed).toBeGreaterThanOrEqual(0);
        expect(result.data.byChannel).toBeDefined();
        expect(Array.isArray(result.data.byChannel)).toBe(true);
        expect(result.data.byType).toBeDefined();
        expect(Array.isArray(result.data.byType)).toBe(true);
        expect(result.data.deliveryRate).toBeGreaterThanOrEqual(0);
        expect(result.data.deliveryRate).toBeLessThanOrEqual(1);
        expect(result.data.readRate).toBeGreaterThanOrEqual(0);
        expect(result.data.readRate).toBeLessThanOrEqual(1);
      });

      it('应该支持自定义时间范围', async () => {
        const timeRange = {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        };

        const result = await notificationsService.getNotificationStats(timeRange);

        expect(result.success).toBe(true);
        expect(result.data.timeRange).toEqual(timeRange);
      });

      it('应该支持过滤条件', async () => {
        const filters = {
          userId: 'user_123',
          channels: ['in_app', 'email'],
          types: ['welcome', 'share']
        };

        const result = await notificationsService.getNotificationStats(undefined, filters);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });

  describe('数据清理', () => {
    describe('cleanupExpiredNotifications', () => {
      it('应该成功清理过期通知', async () => {
        // 该方法主要是内部实现，我们只验证它不会抛出错误
        await expect(notificationsService.cleanupExpiredNotifications()).resolves.not.toThrow();
      });
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的通知工作流', async () => {
      // 1. 创建通知模板
      const templateResult = await notificationsService.createNotificationTemplate({
        name: '集成测试模板',
        description: '用于集成测试的模板',
        category: 'test',
        type: 'integration_test',
        content: {
          title: '测试通知：{{testType}}',
          body: '这是一个{{testType}}通知，用于集成测试。',
          actionUrl: '/test/{{testId}}',
          actionText: '查看测试'
        },
        variables: ['testType', 'testId']
      });

      expect(templateResult.success).toBe(true);

      // 2. 更新用户通知设置
      const settingsResult = await notificationsService.updateUserNotificationSettings('test_user', {
        channelPreferences: [
          { channel: 'in_app', enabled: true },
          { channel: 'email', enabled: false }
        ]
      });

      expect(settingsResult.success).toBe(true);

      // 3. 使用模板创建通知
      const notificationResult = await notificationsService.createNotificationFromTemplate(
        templateResult.data.id,
        'test_user',
        { testType: '功能测试', testId: 'integration_001' }
      );

      expect(notificationResult.success).toBe(true);

      // 4. 获取通知列表
      const listResult = await notificationsService.getNotifications({
        recipientId: 'test_user'
      });

      expect(listResult.success).toBe(true);

      // 5. 标记通知为已读
      if (notificationResult.success && notificationResult.data) {
        const readResult = await notificationsService.markNotificationAsRead(notificationResult.data.id);
        expect(readResult.success).toBe(true);
      }

      // 6. 获取统计信息
      const statsResult = await notificationsService.getNotificationStats();
      expect(statsResult.success).toBe(true);

      // 7. 删除模板
      if (templateResult.success && templateResult.data) {
        const deleteResult = await notificationsService.deleteNotificationTemplate(templateResult.data.id);
        expect(deleteResult.success).toBe(true);
      }
    });

    it('应该处理复杂的批量操作', async () => {
      // 创建多个用户的通知
      const userIds = ['user_001', 'user_002', 'user_003', 'user_004', 'user_005'];
      const requests: CreateNotificationRequest[] = [];

      userIds.forEach(userId => {
        requests.push({
          recipientId: userId,
          type: 'bulk_test',
          title: `批量通知给${userId}`,
          content: `这是发送给${userId}的批量通知`,
          channels: ['in_app'],
          priority: 'normal'
        });
      });

      const bulkResult = await notificationsService.createBulkNotifications(requests);
      expect(bulkResult.success).toBe(true);
      expect(bulkResult.data.successful.length).toBe(5);

      // 批量标记为已读
      if (bulkResult.data.successful.length > 0) {
        const markReadResult = await notificationsService.markMultipleNotificationsAsRead(
          bulkResult.data.successful.slice(0, 3) // 标记前3个为已读
        );
        expect(markReadResult.success).toBe(true);
      }
    });

    it('应该优雅地处理错误情况', async () => {
      // 测试各种错误情况

      // 1. 无效通知创建
      await expect(notificationsService.createNotification({
        recipientId: '',
        type: '',
        title: '',
        content: '',
        channels: []
      } as any)).rejects.toThrow(ValidationError);

      // 2. 不存在的通知ID
      await expect(notificationsService.getNotificationById('nonexistent_id'))
        .rejects.toThrow(NotFoundError);

      // 3. 不存在的模板
      await expect(
        notificationsService.createNotificationFromTemplate('nonexistent', 'user_123', {})
      ).rejects.toThrow(NotFoundError);

      // 4. 无效的批量操作
      await expect(notificationsService.createBulkNotifications([]))
        .rejects.toThrow(ValidationError);

      await expect(notificationsService.markMultipleNotificationsAsRead([]))
        .rejects.toThrow(ValidationError);

      // 5. 不存在的用户
      await expect(notificationsService.getUserNotificationSettings(''))
        .rejects.toThrow(ValidationError);

      await expect(notificationsService.updateUserNotificationSettings('', {}))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('性能测试', () => {
    it('应该在大批量操作时保持性能', async () => {
      const batchSize = 100;
      const requests: CreateNotificationRequest[] = Array(batchSize).fill(null).map((_, i) => ({
        recipientId: `perf_user_${i % 10}`, // 10个不同用户
        type: 'performance_test',
        title: `性能测试通知${i}`,
        content: `这是第${i}个性能测试通知`,
        channels: ['in_app'],
        priority: 'normal'
      }));

      const startTime = Date.now();
      const result = await notificationsService.createBulkNotifications(requests);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
      expect(result.data.successful.length).toBe(batchSize);
    });

    it('应该在复杂查询时保持合理响应时间', async () => {
      const complexFilters = {
        recipientId: 'performance_user',
        channels: ['in_app', 'email', 'push'],
        types: ['welcome', 'share', 'comment', 'system', 'ai_summary'],
        statuses: ['sent', 'delivered', 'read'],
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      };

      const startTime = Date.now();
      const result = await notificationsService.getNotifications(complexFilters, {
        page: 1,
        limit: 50
      });
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});