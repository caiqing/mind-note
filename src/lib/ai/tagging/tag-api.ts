/**
 * 标签管理API接口 - T105
 * 提供标签生成、管理和查询的REST API风格接口
 */

import {
  ContentTag,
  TagType,
  TagCategory,
  TagSource,
  TagGenerationRequest,
  TagGenerationResult,
  TagGenerationOptions,
  TagLibrary,
  TagAnalytics,
  TagValidationRule,
  TagValidationError,
  UserTagPreferences
} from './types';
import { TaggingService } from './tagging-service';

/**
 * API响应类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    processingTime: number;
  };
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 标签搜索参数
 */
export interface TagSearchParams extends PaginationParams {
  query?: string;
  type?: TagType;
  category?: TagCategory;
  libraryId?: string;
  minRelevance?: number;
  maxRelevance?: number;
  includeInactive?: boolean;
}

/**
 * 标签创建请求
 */
export interface TagCreateRequest {
  name: string;
  type: TagType;
  category: TagCategory;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  aliases?: string[];
  weight?: number;
  libraryId?: string;
}

/**
 * 标签更新请求
 */
export interface TagUpdateRequest {
  name?: string;
  type?: TagType;
  category?: TagCategory;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  aliases?: string[];
  weight?: number;
  isActive?: boolean;
}

/**
 * 批量标签生成请求
 */
export interface BatchTagGenerationRequest {
  items: Array<{
    id: string;
    content: string;
    options?: TagGenerationOptions;
  }>;
  userId: string;
  globalOptions?: TagGenerationOptions;
}

/**
 * 标签API类
 */
export class TagAPI {
  private taggingService: TaggingService;
  private rateLimiter: Map<string, number[]> = new Map();

  constructor(taggingService?: TaggingService) {
    this.taggingService = taggingService || this.createDefaultService();
  }

  /**
   * 生成标签
   */
  async generateTags(request: TagGenerationRequest): Promise<ApiResponse<TagGenerationResult>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // 速率限制检查
      if (!this.checkRateLimit(request.userId, 10, 60000)) { // 10次/分钟
        return this.createError('RATE_LIMIT_EXCEEDED', '请求过于频繁，请稍后再试', requestId, startTime);
      }

      // 参数验证
      const validationError = this.validateGenerationRequest(request);
      if (validationError) {
        return this.createError('INVALID_REQUEST', validationError, requestId, startTime);
      }

      // 执行标签生成
      const result = await this.taggingService.generateTags(request);

      return this.createSuccess(result, requestId, startTime);

    } catch (error) {
      return this.createError('GENERATION_FAILED',
        `标签生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 批量生成标签
   */
  async generateBatchTags(request: BatchTagGenerationRequest): Promise<ApiResponse<TagGenerationResult[]>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // 限制批量请求数量
      if (request.items.length > 50) {
        return this.createError('INVALID_REQUEST', '批量请求数量不能超过50个', requestId, startTime);
      }

      // 转换为标准请求格式
      const standardRequests: TagGenerationRequest[] = request.items.map(item => ({
        content: item.content,
        userId: request.userId,
        options: { ...request.globalOptions, ...item.options }
      }));

      // 执行批量生成
      const results = await this.taggingService.generateBatchTags(standardRequests);

      return this.createSuccess(results, requestId, startTime);

    } catch (error) {
      return this.createError('BATCH_GENERATION_FAILED',
        `批量标签生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 搜索标签
   */
  async searchTags(params: TagSearchParams): Promise<ApiResponse<{ tags: ContentTag[]; total: number; pagination: any }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // 参数处理
      const limit = Math.min(params.limit || 20, 100);
      const page = Math.max(params.page || 1, 1);
      const offset = (page - 1) * limit;

      // 执行搜索
      let tags = this.taggingService.searchTags(params.query || '', {
        type: params.type,
        category: params.category,
        limit: limit + 1 // 多获取一个用于判断是否有下一页
      });

      // 应用过滤条件
      if (params.minRelevance !== undefined) {
        tags = tags.filter(tag => tag.relevanceScore >= params.minRelevance!);
      }
      if (params.maxRelevance !== undefined) {
        tags = tags.filter(tag => tag.relevanceScore <= params.maxRelevance!);
      }
      if (!params.includeInactive) {
        tags = tags.filter(tag => tag.metadata?.isActive !== false);
      }

      // 排序
      if (params.sortBy) {
        tags.sort((a, b) => {
          const aValue = this.getTagFieldValue(a, params.sortBy!);
          const bValue = this.getTagFieldValue(b, params.sortBy!);
          const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          return params.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // 计算总数和分页
      const total = tags.length;
      const paginatedTags = tags.slice(offset, offset + limit);
      const hasMore = tags.length > offset + limit;

      const pagination = {
        page,
        limit,
        total,
        hasMore,
        totalPages: Math.ceil(total / limit)
      };

      return this.createSuccess({
        tags: paginatedTags,
        total,
        pagination
      }, requestId, startTime);

    } catch (error) {
      return this.createError('SEARCH_FAILED',
        `标签搜索失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 获取标签详情
   */
  async getTag(tagId: string): Promise<ApiResponse<ContentTag>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const tags = this.taggingService.searchTags('');
      const tag = tags.find(t => t.id === tagId);

      if (!tag) {
        return this.createError('TAG_NOT_FOUND', '标签不存在', requestId, startTime);
      }

      return this.createSuccess(tag, requestId, startTime);

    } catch (error) {
      return this.createError('GET_TAG_FAILED',
        `获取标签详情失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 创建标签
   */
  async createTag(request: TagCreateRequest, userId: string): Promise<ApiResponse<ContentTag>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // 验证请求
      const validationError = this.validateTagCreateRequest(request);
      if (validationError) {
        return this.createError('INVALID_REQUEST', validationError, requestId, startTime);
      }

      // 创建标签对象
      const tag: ContentTag = {
        id: this.generateTagId(),
        name: request.name,
        type: request.type,
        category: request.category,
        relevanceScore: request.weight || 0.7,
        weight: request.weight || 0.7,
        source: TagSource.USER_DEFINED,
        confidence: 0.9,
        count: 0,
        lastUsed: new Date(),
        createdBy: 'user',
        parentId: request.parentId,
        metadata: {
          description: request.description,
          color: request.color,
          icon: request.icon,
          aliases: request.aliases,
          isActive: true
        }
      };

      // 添加到标签库
      const libraryId = request.libraryId || 'default';
      const libraryManager = this.taggingService.getLibraryManager();
      await libraryManager.addTagToLibrary(libraryId, tag);

      return this.createSuccess(tag, requestId, startTime);

    } catch (error) {
      return this.createError('CREATE_TAG_FAILED',
        `创建标签失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 更新标签
   */
  async updateTag(tagId: string, request: TagUpdateRequest, userId: string): Promise<ApiResponse<ContentTag>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // 查找标签
      const tags = this.taggingService.searchTags('');
      const existingTag = tags.find(t => t.id === tagId);

      if (!existingTag) {
        return this.createError('TAG_NOT_FOUND', '标签不存在', requestId, startTime);
      }

      // 更新标签
      const updatedTag: ContentTag = {
        ...existingTag,
        ...request,
        id: tagId, // 确保ID不被修改
        metadata: {
          ...existingTag.metadata,
          ...request.metadata,
          description: request.description || existingTag.metadata?.description,
          color: request.color || existingTag.metadata?.color,
          icon: request.icon || existingTag.metadata?.icon,
          aliases: request.aliases || existingTag.metadata?.aliases,
          isActive: request.isActive ?? existingTag.metadata?.isActive
        }
      };

      // 更新库中的标签
      const libraryManager = this.taggingService.getLibraryManager();
      const libraries = libraryManager.getAllLibraries();

      for (const library of libraries) {
        const tagIndex = library.tags.findIndex(t => t.id === tagId);
        if (tagIndex !== -1) {
          library.tags[tagIndex] = updatedTag;
          library.updatedAt = new Date();
          break;
        }
      }

      return this.createSuccess(updatedTag, requestId, startTime);

    } catch (error) {
      return this.createError('UPDATE_TAG_FAILED',
        `更新标签失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(tagId: string, userId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const libraryManager = this.taggingService.getLibraryManager();
      const libraries = libraryManager.getAllLibraries();
      let deleted = false;

      for (const library of libraries) {
        if (library.id === 'default') continue; // 不能删除默认库中的标签

        const removed = libraryManager.removeTagFromLibrary(library.id, tagId);
        if (removed) {
          deleted = true;
          break;
        }
      }

      if (!deleted) {
        return this.createError('DELETE_FAILED', '无法删除标签，可能不存在或位于受保护的库中', requestId, startTime);
      }

      return this.createSuccess({ deleted: true }, requestId, startTime);

    } catch (error) {
      return this.createError('DELETE_TAG_FAILED',
        `删除标签失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(limit: number = 20): Promise<ApiResponse<ContentTag[]>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const popularStats = this.taggingService.getPopularTags(limit);
      const tags = popularStats.map(stat => {
        const allTags = this.taggingService.searchTags('');
        return allTags.find(t => t.id === stat.tagId);
      }).filter(Boolean) as ContentTag[];

      return this.createSuccess(tags, requestId, startTime);

    } catch (error) {
      return this.createError('GET_POPULAR_TAGS_FAILED',
        `获取热门标签失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 获取趋势标签
   */
  async getTrendingTags(limit: number = 10): Promise<ApiResponse<ContentTag[]>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const trendingStats = this.taggingService.getTrendingTags(limit);
      const tags = trendingStats.map(stat => {
        const allTags = this.taggingService.searchTags('');
        return allTags.find(t => t.id === stat.tagId);
      }).filter(Boolean) as ContentTag[];

      return this.createSuccess(tags, requestId, startTime);

    } catch (error) {
      return this.createError('GET_TRENDING_TAGS_FAILED',
        `获取趋势标签失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 获取标签库列表
   */
  async getLibraries(): Promise<ApiResponse<TagLibrary[]>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const libraries = this.taggingService.getLibraries();
      return this.createSuccess(libraries, requestId, startTime);

    } catch (error) {
      return this.createError('GET_LIBRARIES_FAILED',
        `获取标签库列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 获取分析数据
   */
  async getAnalytics(): Promise<ApiResponse<TagAnalytics>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const analytics = this.taggingService.getAnalytics();
      return this.createSuccess(analytics, requestId, startTime);

    } catch (error) {
      return this.createError('GET_ANALYTICS_FAILED',
        `获取分析数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 设置用户偏好
   */
  async setUserPreferences(userId: string, preferences: UserTagPreferences): Promise<ApiResponse<{ success: boolean }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const libraryManager = this.taggingService.getLibraryManager();
      libraryManager.setUserPreferences(userId, preferences);

      return this.createSuccess({ success: true }, requestId, startTime);

    } catch (error) {
      return this.createError('SET_PREFERENCES_FAILED',
        `设置用户偏好失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 验证标签
   */
  async validateTag(tag: Partial<ContentTag>): Promise<ApiResponse<{ valid: boolean; errors: TagValidationError[] }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const libraryManager = this.taggingService.getLibraryManager();
      const fullTag: ContentTag = {
        id: tag.id || 'test',
        name: tag.name || 'test',
        type: tag.type || TagType.CUSTOM,
        category: tag.category || TagCategory.CONTENT,
        relevanceScore: tag.relevanceScore || 0.5,
        weight: tag.weight || 0.5,
        source: TagSource.USER_DEFINED,
        confidence: 0.8,
        count: 0,
        lastUsed: new Date(),
        createdBy: 'user',
        metadata: tag.metadata || { isActive: true }
      };

      const errors = await libraryManager.validateTag(fullTag);
      const valid = errors.length === 0;

      return this.createSuccess({ valid, errors }, requestId, startTime);

    } catch (error) {
      return this.createError('VALIDATION_FAILED',
        `标签验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; details?: any }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const health = await this.taggingService.healthCheck();
      return this.createSuccess({
        status: health.status,
        details: health
      }, requestId, startTime);

    } catch (error) {
      return this.createError('HEALTH_CHECK_FAILED',
        `健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
        requestId, startTime, error);
    }
  }

  /**
   * 辅助方法 - 创建默认服务
   */
  private createDefaultService(): TaggingService {
    return new TaggingService();
  }

  /**
   * 辅助方法 - 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 辅助方法 - 生成标签ID
   */
  private generateTagId(): string {
    return `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 辅助方法 - 创建成功响应
   */
  private createSuccess<T>(data: T, requestId: string, startTime: number): ApiResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * 辅助方法 - 创建错误响应
   */
  private createError(code: string, message: string, requestId: string, startTime: number, details?: any): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * 辅助方法 - 速率限制检查
   */
  private checkRateLimit(userId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const userRequests = this.rateLimiter.get(userId) || [];

    // 清理过期的请求记录
    const validRequests = userRequests.filter(time => now - time < windowMs);

    // 检查是否超过限制
    if (validRequests.length >= maxRequests) {
      return false;
    }

    // 记录当前请求
    validRequests.push(now);
    this.rateLimiter.set(userId, validRequests);

    return true;
  }

  /**
   * 辅助方法 - 验证生成请求
   */
  private validateGenerationRequest(request: TagGenerationRequest): string | null {
    if (!request.content || request.content.trim().length === 0) {
      return '内容不能为空';
    }

    if (request.content.length > 10000) {
      return '内容长度不能超过10000字符';
    }

    if (!request.userId || request.userId.trim().length === 0) {
      return '用户ID不能为空';
    }

    if (request.options?.maxTags && (request.options.maxTags < 1 || request.options.maxTags > 20)) {
      return '最大标签数量必须在1-20之间';
    }

    return null;
  }

  /**
   * 辅助方法 - 验证标签创建请求
   */
  private validateTagCreateRequest(request: TagCreateRequest): string | null {
    if (!request.name || request.name.trim().length === 0) {
      return '标签名称不能为空';
    }

    if (request.name.length > 50) {
      return '标签名称长度不能超过50字符';
    }

    if (request.weight && (request.weight < 0 || request.weight > 1)) {
      return '权重必须在0-1之间';
    }

    return null;
  }

  /**
   * 辅助方法 - 获取标签字段值
   */
  private getTagFieldValue(tag: ContentTag, fieldName: string): any {
    switch (fieldName) {
      case 'name': return tag.name;
      case 'type': return tag.type;
      case 'category': return tag.category;
      case 'relevanceScore': return tag.relevanceScore;
      case 'weight': return tag.weight;
      case 'count': return tag.count;
      case 'lastUsed': return tag.lastUsed.getTime();
      default: return '';
    }
  }
}

/**
 * 创建标签API实例
 */
export function createTagAPI(taggingService?: TaggingService): TagAPI {
  return new TagAPI(taggingService);
}

/**
 * 默认标签API实例
 */
export const defaultTagAPI = createTagAPI();