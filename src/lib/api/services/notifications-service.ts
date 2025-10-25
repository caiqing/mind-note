/**
 * T111 通知API服务
 * 提供全面的通知管理功能，支持多渠道通知和智能推送
 */

import { BaseAPIService } from '../base-service';
import {
  NotificationConfig,
  Notification,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationFilters,
  NotificationTemplate,
  CreateTemplateRequest,
  NotificationChannel,
  NotificationPreferences,
  UserNotificationSettings,
  NotificationStats,
  ApiResponse,
  PaginatedResponse,
  DateRange
} from '../types';
import { ValidationError, NotFoundError } from '../errors';

/**
 * T111 通知API服务
 */
export class NotificationsService extends BaseAPIService {
  private templates: Map<string, NotificationTemplate> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private userSettings: Map<string, UserNotificationSettings> = new Map();
  private notificationQueue: Notification[] = [];
  private sendingHistory: Map<string, Date> = new Map();

  constructor(config: NotificationConfig) {
    super(config);
    this.initializeDefaultChannels();
    this.initializeDefaultTemplates();
    this.startNotificationProcessor();
  }

  /**
   * 初始化默认通知渠道
   */
  private initializeDefaultChannels(): void {
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'in_app',
        name: '应用内通知',
        description: '在应用内显示的通知',
        type: 'in_app',
        enabled: true,
        config: {
          maxVisible: 5,
          autoHide: true,
          autoHideDelay: 5000,
          allowDismiss: true,
          position: 'top-right'
        },
        rateLimits: {
          maxPerMinute: 30,
          maxPerHour: 200,
          maxPerDay: 1000
        }
      },
      {
        id: 'email',
        name: '邮件通知',
        description: '通过邮件发送的通知',
        type: 'email',
        enabled: true,
        config: {
          provider: 'smtp',
          fromAddress: 'noreply@mindnote.com',
          fromName: 'MindNote',
          replyTo: 'support@mindnote.com',
          templateEngine: 'handlebars',
          includeUnsubscribeLink: true,
          trackOpens: true,
          trackClicks: true
        },
        rateLimits: {
          maxPerMinute: 10,
          maxPerHour: 100,
          maxPerDay: 500
        }
      },
      {
        id: 'push',
        name: '推送通知',
        description: '移动设备推送通知',
        type: 'push',
        enabled: true,
        config: {
          provider: 'firebase',
          apiKey: 'your-firebase-api-key',
          sound: 'default',
          badge: true,
          priority: 'high',
          ttl: 86400
        },
        rateLimits: {
          maxPerMinute: 20,
          maxPerHour: 150,
          maxPerDay: 800
        }
      },
      {
        id: 'sms',
        name: '短信通知',
        description: '通过短信发送的通知',
        type: 'sms',
        enabled: false,
        config: {
          provider: 'twilio',
          accountSid: 'your-twilio-account-sid',
          authToken: 'your-twilio-auth-token',
          fromNumber: '+1234567890',
          maxLength: 160
        },
        rateLimits: {
          maxPerMinute: 5,
          maxPerHour: 50,
          maxPerDay: 200
        }
      },
      {
        id: 'webhook',
        name: 'Webhook通知',
        description: '通过HTTP webhook发送的通知',
        type: 'webhook',
        enabled: true,
        config: {
          timeout: 10000,
          retryAttempts: 3,
          retryDelay: 1000,
          signatureHeader: 'X-Signature',
          secretKey: 'your-webhook-secret'
        },
        rateLimits: {
          maxPerMinute: 15,
          maxPerHour: 120,
          maxPerDay: 600
        }
      }
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel.id, channel);
    });
  }

  /**
   * 初始化默认通知模板
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'welcome',
        name: '欢迎通知',
        description: '新用户欢迎通知',
        category: 'user',
        type: 'welcome',
        channels: ['in_app', 'email'],
        subject: '欢迎使用MindNote',
        content: {
          title: '欢迎加入MindNote！',
          body: '亲爱的{{userName}}，感谢您注册MindNote！开始您的智能笔记之旅吧。',
          actionUrl: '/dashboard',
          actionText: '开始使用'
        },
        variables: ['userName'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'note_shared',
        name: '笔记分享通知',
        description: '笔记被分享时的通知',
        category: 'collaboration',
        type: 'share',
        channels: ['in_app', 'email'],
        subject: '{{senderName}}与您分享了一篇笔记',
        content: {
          title: '笔记分享',
          body: '{{senderName}}与您分享了笔记"{{noteTitle}}"，点击查看详情。',
          actionUrl: '/notes/{{noteId}}',
          actionText: '查看笔记'
        },
        variables: ['senderName', 'noteTitle', 'noteId'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'comment_added',
        name: '评论通知',
        description: '笔记收到新评论时的通知',
        category: 'collaboration',
        type: 'comment',
        channels: ['in_app', 'email'],
        subject: '{{commenterName}}评论了您的笔记',
        content: {
          title: '新评论',
          body: '{{commenterName}}评论了您的笔记"{{noteTitle}}"：{{commentPreview}}',
          actionUrl: '/notes/{{noteId}}#comment-{{commentId}}',
          actionText: '查看评论'
        },
        variables: ['commenterName', 'noteTitle', 'commentPreview', 'noteId', 'commentId'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'ai_summary_ready',
        name: 'AI摘要完成通知',
        description: 'AI生成摘要完成时的通知',
        category: 'ai',
        type: 'ai_summary',
        channels: ['in_app', 'push'],
        subject: 'AI摘要生成完成',
        content: {
          title: 'AI摘要已生成',
          body: '您的笔记"{{noteTitle}}"的AI摘要已生成完成，点击查看。',
          actionUrl: '/notes/{{noteId}}?tab=summary',
          actionText: '查看摘要'
        },
        variables: ['noteTitle', 'noteId'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'system_maintenance',
        name: '系统维护通知',
        description: '系统维护时的通知',
        category: 'system',
        type: 'maintenance',
        channels: ['in_app', 'email'],
        subject: '系统维护通知',
        content: {
          title: '系统维护公告',
          body: '系统将于{{startTime}}进行维护，预计持续{{duration}}。期间服务可能暂时不可用。',
          actionUrl: '/status',
          actionText: '查看状态'
        },
        variables: ['startTime', 'duration'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'security_alert',
        name: '安全警报通知',
        description: '安全相关事件的通知',
        category: 'security',
        type: 'security',
        channels: ['in_app', 'email', 'sms'],
        subject: '安全警报',
        content: {
          title: '安全警报',
          body: '检测到您的账户有异常活动：{{activity}}。如果这不是您本人的操作，请立即修改密码。',
          actionUrl: '/security',
          actionText: '查看安全设置'
        },
        variables: ['activity'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * 启动通知处理器
   */
  private startNotificationProcessor(): void {
    // 每30秒处理一次通知队列
    setInterval(() => {
      this.processNotificationQueue();
    }, 30000);

    // 每5分钟清理过期的发送历史
    setInterval(() => {
      this.cleanupSendingHistory();
    }, 300000);
  }

  /**
   * 处理通知队列
   */
  private async processNotificationQueue(): Promise<void> {
    if (this.notificationQueue.length === 0) return;

    const notifications = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const notification of notifications) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        this.log('error', 'Failed to send notification', {
          notificationId: notification.id,
          error
        });
      }
    }
  }

  /**
   * 清理发送历史
   */
  private cleanupSendingHistory(): void {
    const now = Date.now();
    const expirationTime = 24 * 60 * 60 * 1000; // 24小时

    for (const [key, timestamp] of this.sendingHistory.entries()) {
      if (now - timestamp.getTime() > expirationTime) {
        this.sendingHistory.delete(key);
      }
    }
  }

  /**
   * 创建通知
   */
  async createNotification(request: CreateNotificationRequest): Promise<ApiResponse<Notification>> {
    try {
      this.validateNotificationRequest(request);

      const notification: Notification = {
        id: this.generateNotificationId(),
        recipientId: request.recipientId,
        senderId: request.senderId || 'system',
        type: request.type,
        title: request.title,
        content: request.content,
        data: request.data || {},
        channels: request.channels || ['in_app'],
        priority: request.priority || 'normal',
        status: 'pending',
        scheduledAt: request.scheduledAt,
        expiresAt: request.expiresAt,
        metadata: {
          source: request.metadata?.source || 'api',
          category: request.metadata?.category || 'general',
          tags: request.metadata?.tags || [],
          campaign: request.metadata?.campaign
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 验证用户通知设置
      const userSettings = await this.getUserNotificationSettings(request.recipientId);
      if (!this.shouldSendNotification(notification, userSettings)) {
        notification.status = 'skipped';
        notification.metadata.skipReason = 'user_preferences';
      }

      // 检查频率限制
      if (this.isRateLimited(notification)) {
        notification.status = 'skipped';
        notification.metadata.skipReason = 'rate_limited';
      }

      if (notification.status === 'pending') {
        // 添加到发送队列
        if (notification.scheduledAt && notification.scheduledAt > new Date()) {
          // 延迟发送
          this.notificationQueue.push(notification);
        } else {
          // 立即发送
          await this.sendNotification(notification);
        }
      }

      this.log('info', 'Notification created', {
        notificationId: notification.id,
        recipientId: request.recipientId,
        type: request.type
      });

      return this.createApiResponse(notification);

    } catch (error) {
      this.log('error', 'Failed to create notification', {
        recipientId: request.recipientId,
        type: request.type,
        error
      });
      throw error;
    }
  }

  /**
   * 使用模板创建通知
   */
  async createNotificationFromTemplate(
    templateId: string,
    recipientId: string,
    variables: Record<string, any>,
    options: {
      channels?: string[];
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      scheduledAt?: Date;
      expiresAt?: Date;
      senderId?: string;
      metadata?: any;
    } = {}
  ): Promise<ApiResponse<Notification>> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new NotFoundError('Notification template');
      }

      if (!template.enabled) {
        throw new ValidationError('Template is disabled');
      }

      // 验证必需的变量
      for (const variable of template.variables) {
        if (!(variable in variables)) {
          throw new ValidationError(`Missing required variable: ${variable}`);
        }
      }

      // 渲染模板内容
      const renderedContent = this.renderTemplate(template.content, variables);

      const request: CreateNotificationRequest = {
        recipientId,
        senderId: options.senderId || 'system',
        type: template.type,
        title: renderedContent.title,
        content: renderedContent.body,
        data: {
          templateId,
          variables,
          actionUrl: renderedContent.actionUrl,
          actionText: renderedContent.actionText
        },
        channels: options.channels || template.channels,
        priority: options.priority || 'normal',
        scheduledAt: options.scheduledAt,
        expiresAt: options.expiresAt,
        metadata: {
          source: 'template',
          templateId,
          category: template.category,
          ...options.metadata
        }
      };

      return await this.createNotification(request);

    } catch (error) {
      this.log('error', 'Failed to create notification from template', {
        templateId,
        recipientId,
        error
      });
      throw error;
    }
  }

  /**
   * 批量创建通知
   */
  async createBulkNotifications(
    requests: CreateNotificationRequest[]
  ): Promise<ApiResponse<{ successful: string[]; failed: Array<{ id: string; error: string }> }>> {
    try {
      if (!requests || requests.length === 0) {
        throw new ValidationError('Requests array cannot be empty');
      }

      if (requests.length > 1000) {
        throw new ValidationError('Maximum 1000 notifications allowed per batch');
      }

      const successful: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      for (const request of requests) {
        try {
          const result = await this.createNotification(request);
          if (result.success && result.data) {
            successful.push(result.data.id);
          }
        } catch (error) {
          failed.push({
            id: request.recipientId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.log('info', 'Bulk notifications created', {
        total: requests.length,
        successful: successful.length,
        failed: failed.length
      });

      return this.createApiResponse({
        successful,
        failed
      });

    } catch (error) {
      this.log('error', 'Failed to create bulk notifications', { error });
      throw error;
    }
  }

  /**
   * 获取通知列表
   */
  async getNotifications(
    filters: NotificationFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    try {
      const params = {
        page: pagination.page || 1,
        limit: Math.min(pagination.limit || 20, 100),
        ...filters
      };

      // 处理数组参数
      if (filters.channels) {
        params.channels = filters.channels.join(',');
      }
      if (filters.types) {
        params.types = filters.types.join(',');
      }
      if (filters.statuses) {
        params.statuses = filters.statuses.join(',');
      }

      // 处理日期范围
      if (filters.dateRange) {
        params.dateStart = filters.dateRange.start;
        params.dateEnd = filters.dateRange.end;
      }

      const response = await this.get<PaginatedResponse<Notification>>('/notifications', {
        customHeaders: { 'X-Filter-Applied': 'true' }
      });

      this.log('info', 'Retrieved notifications list', {
        count: response.data?.items.length,
        page: pagination.page,
        filters: Object.keys(filters).length
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to retrieve notifications', { filters, error });
      throw error;
    }
  }

  /**
   * 根据ID获取通知
   */
  async getNotificationById(id: string): Promise<ApiResponse<Notification>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid notification ID');
      }

      const response = await this.get<Notification>(`/notifications/${id}`, {
        customHeaders: {
          'X-Notification-View': 'true'
        }
      });

      this.log('info', 'Retrieved notification by ID', { notificationId: id });

      return response;

    } catch (error) {
      if (error instanceof NotFoundError) {
        this.log('warn', 'Notification not found', { notificationId: id });
      } else {
        this.log('error', 'Failed to retrieve notification', { notificationId: id, error });
      }
      throw error;
    }
  }

  /**
   * 更新通知
   */
  async updateNotification(id: string, request: UpdateNotificationRequest): Promise<ApiResponse<Notification>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid notification ID');
      }

      const updateData = {
        ...request,
        updatedAt: new Date()
      };

      const response = await this.put<Notification>(`/notifications/${id}`, updateData, {
        customHeaders: {
          'X-Update-Reason': 'user_request'
        }
      });

      this.log('info', 'Notification updated', {
        notificationId: id,
        updates: Object.keys(request)
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to update notification', { notificationId: id, error });
      throw error;
    }
  }

  /**
   * 标记通知为已读
   */
  async markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid notification ID');
      }

      const response = await this.post<void>(`/notifications/${id}/read`, {}, {
        customHeaders: {
          'X-Action': 'mark_read',
          'X-Timestamp': new Date().toISOString()
        }
      });

      this.log('info', 'Notification marked as read', { notificationId: id });

      return response;

    } catch (error) {
      this.log('error', 'Failed to mark notification as read', { notificationId: id, error });
      throw error;
    }
  }

  /**
   * 批量标记通知为已读
   */
  async markMultipleNotificationsAsRead(notificationIds: string[]): Promise<ApiResponse<void>> {
    try {
      if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new ValidationError('Notification IDs array cannot be empty');
      }

      if (notificationIds.length > 100) {
        throw new ValidationError('Maximum 100 notifications allowed per batch');
      }

      const response = await this.post<void>('/notifications/batch/read', {
        notificationIds
      }, {
        customHeaders: {
          'X-Action': 'batch_mark_read',
          'X-Batch-Size': notificationIds.length.toString()
        }
      });

      this.log('info', 'Multiple notifications marked as read', {
        count: notificationIds.length
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to mark multiple notifications as read', {
        notificationIds,
        error
      });
      throw error;
    }
  }

  /**
   * 删除通知
   */
  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid notification ID');
      }

      const response = await this.delete<void>(`/notifications/${id}`, {
        customHeaders: {
          'X-Delete-Reason': 'user_request'
        }
      });

      this.log('info', 'Notification deleted', { notificationId: id });

      return response;

    } catch (error) {
      this.log('error', 'Failed to delete notification', { notificationId: id, error });
      throw error;
    }
  }

  /**
   * 获取用户通知设置
   */
  async getUserNotificationSettings(userId: string): Promise<ApiResponse<UserNotificationSettings>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      // 检查缓存
      const cached = this.userSettings.get(userId);
      if (cached) {
        return this.createApiResponse(cached);
      }

      const response = await this.get<UserNotificationSettings>(`/users/${userId}/notification-settings`);

      if (response.success && response.data) {
        // 缓存用户设置
        this.userSettings.set(userId, response.data);
      }

      this.log('info', 'Retrieved user notification settings', { userId });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get user notification settings', { userId, error });
      throw error;
    }
  }

  /**
   * 更新用户通知设置
   */
  async updateUserNotificationSettings(
    userId: string,
    settings: Partial<UserNotificationSettings>
  ): Promise<ApiResponse<UserNotificationSettings>> {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new ValidationError('Invalid user ID');
      }

      const response = await this.put<UserNotificationSettings>(
        `/users/${userId}/notification-settings`,
        settings,
        {
          customHeaders: {
            'X-Update-Reason': 'user_preferences_update'
          }
        }
      );

      if (response.success && response.data) {
        // 更新缓存
        this.userSettings.set(userId, response.data);
      }

      this.log('info', 'Updated user notification settings', { userId });

      return response;

    } catch (error) {
      this.log('error', 'Failed to update user notification settings', { userId, error });
      throw error;
    }
  }

  /**
   * 获取通知模板
   */
  async getNotificationTemplates(
    filters: {
      category?: string;
      type?: string;
      enabled?: boolean;
    } = {}
  ): Promise<ApiResponse<NotificationTemplate[]>> {
    try {
      let templates = Array.from(this.templates.values());

      // 应用过滤器
      if (filters.category) {
        templates = templates.filter(t => t.category === filters.category);
      }
      if (filters.type) {
        templates = templates.filter(t => t.type === filters.type);
      }
      if (filters.enabled !== undefined) {
        templates = templates.filter(t => t.enabled === filters.enabled);
      }

      return this.createApiResponse(templates);

    } catch (error) {
      this.log('error', 'Failed to get notification templates', { filters, error });
      throw error;
    }
  }

  /**
   * 创建通知模板
   */
  async createNotificationTemplate(request: CreateTemplateRequest): Promise<ApiResponse<NotificationTemplate>> {
    try {
      this.validateTemplateRequest(request);

      const template: NotificationTemplate = {
        id: this.generateTemplateId(),
        name: request.name,
        description: request.description,
        category: request.category,
        type: request.type,
        channels: request.channels || ['in_app'],
        subject: request.subject,
        content: request.content,
        variables: request.variables || [],
        enabled: request.enabled !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.templates.set(template.id, template);

      this.log('info', 'Notification template created', {
        templateId: template.id,
        name: request.name,
        category: request.category
      });

      return this.createApiResponse(template);

    } catch (error) {
      this.log('error', 'Failed to create notification template', { error });
      throw error;
    }
  }

  /**
   * 更新通知模板
   */
  async updateNotificationTemplate(
    id: string,
    updates: Partial<CreateTemplateRequest>
  ): Promise<ApiResponse<NotificationTemplate>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid template ID');
      }

      const existing = this.templates.get(id);
      if (!existing) {
        throw new NotFoundError('Notification template');
      }

      const updated: NotificationTemplate = {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };

      this.templates.set(id, updated);

      this.log('info', 'Notification template updated', {
        templateId: id,
        updates: Object.keys(updates)
      });

      return this.createApiResponse(updated);

    } catch (error) {
      this.log('error', 'Failed to update notification template', { templateId: id, error });
      throw error;
    }
  }

  /**
   * 删除通知模板
   */
  async deleteNotificationTemplate(id: string): Promise<ApiResponse<void>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid template ID');
      }

      const exists = this.templates.has(id);
      if (!exists) {
        throw new NotFoundError('Notification template');
      }

      this.templates.delete(id);

      this.log('info', 'Notification template deleted', { templateId: id });

      return this.createApiResponse(undefined, true, 'Template deleted successfully');

    } catch (error) {
      this.log('error', 'Failed to delete notification template', { templateId: id, error });
      throw error;
    }
  }

  /**
   * 获取通知统计
   */
  async getNotificationStats(
    timeRange?: DateRange,
    filters?: {
      userId?: string;
      channels?: string[];
      types?: string[];
    }
  ): Promise<ApiResponse<NotificationStats>> {
    try {
      // 模拟统计数据
      const stats: NotificationStats = {
        total: Math.floor(1000 + Math.random() * 500),
        sent: Math.floor(800 + Math.random() * 400),
        delivered: Math.floor(750 + Math.random() * 350),
        read: Math.floor(600 + Math.random() * 300),
        failed: Math.floor(20 + Math.random() * 50),
        pending: Math.floor(10 + Math.random() * 30),
        byChannel: [
          { channel: 'in_app', count: Math.floor(400 + Math.random() * 200) },
          { channel: 'email', count: Math.floor(300 + Math.random() * 150) },
          { channel: 'push', count: Math.floor(200 + Math.random() * 100) },
          { channel: 'sms', count: Math.floor(50 + Math.random() * 50) }
        ],
        byType: [
          { type: 'welcome', count: Math.floor(100 + Math.random() * 100) },
          { type: 'share', count: Math.floor(200 + Math.random() * 100) },
          { type: 'comment', count: Math.floor(300 + Math.random() * 150) },
          { type: 'system', count: Math.floor(150 + Math.random() * 100) }
        ],
        deliveryRate: 0.95 + Math.random() * 0.04,
        readRate: 0.75 + Math.random() * 0.2,
        averageDeliveryTime: Math.floor(50 + Math.random() * 100),
        timeRange: timeRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      };

      return this.createApiResponse(stats);

    } catch (error) {
      this.log('error', 'Failed to get notification stats', { error });
      throw error;
    }
  }

  /**
   * 发送通知
   */
  private async sendNotification(notification: Notification): Promise<void> {
    const startTime = Date.now();

    try {
      notification.status = 'sending';
      notification.sentAt = new Date();

      const results = await Promise.allSettled(
        notification.channels.map(channel => this.sendViaChannel(notification, channel))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        notification.status = 'sent';
        notification.deliveryChannels = notification.channels.slice(0, successful);
      } else {
        notification.status = 'failed';
        notification.error = 'All delivery channels failed';
      }

      notification.deliveryTime = Date.now() - startTime;

      this.log('info', 'Notification sent', {
        notificationId: notification.id,
        status: notification.status,
        successful,
        failed,
        deliveryTime: notification.deliveryTime
      });

    } catch (error) {
      notification.status = 'failed';
      notification.error = error instanceof Error ? error.message : 'Unknown error';
      notification.deliveryTime = Date.now() - startTime;

      this.log('error', 'Failed to send notification', {
        notificationId: notification.id,
        error
      });
    }
  }

  /**
   * 通过指定渠道发送通知
   */
  private async sendViaChannel(notification: Notification, channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    if (!channel.enabled) {
      throw new Error(`Channel is disabled: ${channelId}`);
    }

    // 检查渠道频率限制
    if (this.isChannelRateLimited(channelId)) {
      throw new Error(`Channel rate limit exceeded: ${channelId}`);
    }

    // 模拟发送逻辑
    const delay = Math.random() * 1000; // 0-1秒延迟
    await new Promise(resolve => setTimeout(resolve, delay));

    // 记录发送历史
    this.sendingHistory.set(`${notification.recipientId}:${channelId}`, new Date());

    this.log('info', 'Notification sent via channel', {
      notificationId: notification.id,
      channelId,
      recipientId: notification.recipientId
    });
  }

  /**
   * 验证通知请求
   */
  private validateNotificationRequest(request: CreateNotificationRequest): void {
    const rules: Record<string, any> = {
      recipientId: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      type: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      title: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 200
      },
      content: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 2000
      },
      channels: {
        type: 'object',
        validate: (value: any) => {
          if (!Array.isArray(value)) return 'Channels must be an array';
          if (value.length === 0) return 'At least one channel is required';
          if (value.length > 5) return 'Maximum 5 channels allowed';
          for (const channel of value) {
            if (!this.channels.has(channel)) {
              return `Invalid channel: ${channel}`;
            }
          }
          return null;
        }
      },
      priority: {
        type: 'string',
        validate: (value: any) => {
          const validPriorities = ['low', 'normal', 'high', 'urgent'];
          return validPriorities.includes(value) ? null : 'Invalid priority';
        }
      }
    };

    this.validateParams(request, rules);
  }

  /**
   * 验证模板请求
   */
  private validateTemplateRequest(request: CreateTemplateRequest): void {
    const rules: Record<string, any> = {
      name: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      description: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 500
      },
      category: {
        required: true,
        type: 'string',
        validate: (value: any) => {
          const validCategories = ['user', 'collaboration', 'ai', 'system', 'security'];
          return validCategories.includes(value) ? null : 'Invalid category';
        }
      },
      type: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      content: {
        required: true,
        type: 'object',
        validate: (value: any) => {
          if (!value.title || !value.body) {
            return 'Content must include title and body';
          }
          return null;
        }
      }
    };

    this.validateParams(request, rules);
  }

  /**
   * 检查是否应该发送通知
   */
  private shouldSendNotification(
    notification: Notification,
    userSettings: UserNotificationSettings
  ): boolean {
    // 检查通知类型是否被禁用
    if (userSettings.disabledTypes?.includes(notification.type)) {
      return false;
    }

    // 检查渠道偏好
    for (const channel of notification.channels) {
      const channelPref = userSettings.channelPreferences?.find(p => p.channel === channel);
      if (channelPref && !channelPref.enabled) {
        return false;
      }
    }

    // 检查勿扰模式
    if (userSettings.doNotDisturb) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startTime = userSettings.doNotDisturbStartTime || 2200; // 22:00
      const endTime = userSettings.doNotDisturbEndTime || 800; // 08:00

      let isInQuietHours = false;
      if (startTime > endTime) {
        // 跨夜情况，如22:00-08:00
        isInQuietHours = currentTime >= startTime || currentTime < endTime;
      } else {
        // 同日情况，如01:00-06:00
        isInQuietHours = currentTime >= startTime && currentTime < endTime;
      }

      if (isInQuietHours && notification.priority !== 'urgent') {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查是否被频率限制
   */
  private isRateLimited(notification: Notification): boolean {
    for (const channel of notification.channels) {
      const key = `${notification.recipientId}:${channel}`;
      const lastSent = this.sendingHistory.get(key);

      if (lastSent) {
        const timeSinceLastSent = Date.now() - lastSent.getTime();
        const minInterval = this.getMinInterval(channel, notification.priority);

        if (timeSinceLastSent < minInterval) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 检查渠道频率限制
   */
  private isChannelRateLimited(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return true;

    const now = Date.now();
    const recentSends = Array.from(this.sendingHistory.entries())
      .filter(([key, timestamp]) => {
        const [, channel] = key.split(':');
        return channel === channelId && (now - timestamp.getTime()) < 60000; // 1分钟内
      });

    return recentSends.length >= channel.rateLimits.maxPerMinute;
  }

  /**
   * 获取最小发送间隔
   */
  private getMinInterval(channel: string, priority: string): number {
    const baseIntervals = {
      'in_app': 0,
      'email': 30000, // 30秒
      'push': 10000, // 10秒
      'sms': 60000, // 1分钟
      'webhook': 5000 // 5秒
    };

    const priorityMultipliers = {
      'urgent': 0.1,
      'high': 0.5,
      'normal': 1,
      'low': 2
    };

    const baseInterval = baseIntervals[channel as keyof typeof baseIntervals] || 30000;
    const multiplier = priorityMultipliers[priority as keyof typeof priorityMultipliers] || 1;

    return baseInterval * multiplier;
  }

  /**
   * 渲染模板
   */
  private renderTemplate(
    template: any,
    variables: Record<string, any>
  ): { title: string; body: string; actionUrl?: string; actionText?: string } {
    const render = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    };

    return {
      title: render(template.title),
      body: render(template.body),
      actionUrl: template.actionUrl ? render(template.actionUrl) : undefined,
      actionText: template.actionText ? render(template.actionText) : undefined
    };
  }

  /**
   * 生成通知ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成模板ID
   */
  private generateTemplateId(): string {
    return `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理过期通知
   */
  public async cleanupExpiredNotifications(): Promise<void> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const response = await this.delete<void>('/notifications/cleanup', {
        customHeaders: {
          'X-Cleanup-Before': thirtyDaysAgo.toISOString(),
          'X-Cleanup-Reason': 'expired'
        }
      });

      this.log('info', 'Expired notifications cleaned up');

    } catch (error) {
      this.log('error', 'Failed to cleanup expired notifications', { error });
    }
  }
}

/**
 * 创建通知服务实例
 */
export function createNotificationsService(config: NotificationConfig): NotificationsService {
  return new NotificationsService(config);
}

/**
 * 默认通知服务配置
 */
export const defaultNotificationsServiceConfig: NotificationConfig = {
  baseUrl: '/api/v1/notifications',
  timeout: 30000,
  retries: 3,
  enableLogging: true,
  enableCaching: true,
  cacheTTL: 300000,
  maxQueueSize: 10000,
  batchSize: 100,
  processingInterval: 30000,
  retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90天
  enableTemplates: true,
  enableRateLimiting: true,
  enableUserPreferences: true,
  defaultChannels: ['in_app', 'email'],
  maxRetries: 3,
  retryDelay: 5000
};