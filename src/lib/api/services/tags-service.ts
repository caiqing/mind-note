/**
 * T107 标签管理API服务
 * 提供完整的标签CRUD操作、分类管理和高级功能
 */

import { BaseAPIService } from '../base-service';
import {
  Tag,
  TagCategory,
  CreateTagRequest,
  UpdateTagRequest,
  TagFilters,
  TagSuggestion,
  BatchTagOperation,
  ApiResponse,
  PaginatedResponse,
  BatchOperationResult
} from '../types';
import { ValidationError, NotFoundError, ConflictError } from '../errors';

export interface TagsServiceConfig {
  baseUrl: string;
  aiServiceUrl?: string;
  enableAutoCategorization?: boolean;
  enableTagSuggestions?: boolean;
  maxTagsPerCategory?: number;
  maxTagDepth?: number;
}

/**
 * T107 标签管理API服务
 */
export class TagsService extends BaseAPIService {
  private aiServiceUrl?: string;
  private enableAutoCategorization: boolean;
  private enableTagSuggestions: boolean;
  private maxTagsPerCategory: number;
  private maxTagDepth: number;

  constructor(config: TagsServiceConfig) {
    super(config);

    this.aiServiceUrl = config.aiServiceUrl;
    this.enableAutoCategorization = config.enableAutoCategorization ?? true;
    this.enableTagSuggestions = config.enableTagSuggestions ?? true;
    this.maxTagsPerCategory = config.maxTagsPerCategory ?? 1000;
    this.maxTagDepth = config.maxTagDepth ?? 5;
  }

  /**
   * 验证标签数据
   */
  private validateTagData(data: CreateTagRequest | UpdateTagRequest, isUpdate: boolean = false): void {
    const rules: Record<string, any> = {
      name: {
        required: !isUpdate,
        type: 'string',
        minLength: 1,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9\u4e00-\u9fa5\-_\s]+$/,
        validate: (value: any) => {
          const trimmed = value.trim();
          if (trimmed !== value) return 'Tag name cannot start or end with whitespace';
          if (/^\d+$/.test(trimmed)) return 'Tag name cannot be only numbers';
          return null;
        }
      },
      description: {
        type: 'string',
        maxLength: 500
      },
      categoryId: {
        required: !isUpdate,
        type: 'string',
        pattern: /^[a-zA-Z0-9-]+$/
      },
      color: {
        type: 'string',
        pattern: /^#[0-9A-Fa-f]{6}$/
      },
      synonyms: {
        type: 'object',
        validate: (value: any) => {
          if (!Array.isArray(value)) return 'Synonyms must be an array';
          if (value.length > 10) return 'Maximum 10 synonyms allowed';
          for (const synonym of value) {
            if (typeof synonym !== 'string') return 'All synonyms must be strings';
            if (synonym.length < 1 || synonym.length > 50) return 'Synonym length must be between 1 and 50 characters';
          }
          return null;
        }
      },
      relatedTags: {
        type: 'object',
        validate: (value: any) => {
          if (!Array.isArray(value)) return 'Related tags must be an array';
          if (value.length > 20) return 'Maximum 20 related tags allowed';
          return null;
        }
      }
    };

    this.validateParams(data, rules);
  }

  /**
   * 创建标签
   */
  async createTag(request: CreateTagRequest): Promise<ApiResponse<Tag>> {
    try {
      // 验证请求数据
      this.validateTagData(request);

      this.log('info', 'Creating tag', { name: request.name, categoryId: request.categoryId });

      let processedRequest = { ...request };

      // 自动生成颜色（如果没有提供）
      if (!processedRequest.color) {
        processedRequest.color = this.generateTagColor();
      }

      // 自动分类（如果启用且没有指定分类）
      if (this.enableAutoCategorization && !processedRequest.categoryId && processedRequest.name) {
        try {
          const suggestedCategory = await this.suggestCategory(processedRequest.name);
          if (suggestedCategory) {
            processedRequest.categoryId = suggestedCategory;
          }
        } catch (error) {
          this.log('warn', 'Auto-categorization failed', { error });
        }
      }

      // 处理同义词（去重和清理）
      if (processedRequest.synonyms) {
        processedRequest.synonyms = [...new Set(processedRequest.synonyms.map((s: string) => s.trim().toLowerCase()))];
      }

      const response = await this.post<Tag>('/tags', processedRequest);

      this.log('info', 'Tag created successfully', {
        tagId: response.data?.id,
        name: request.name,
        categoryId: response.data?.category
      });

      return response;

    } catch (error) {
      if (error instanceof ConflictError) {
        this.log('warn', 'Tag already exists', { name: request.name });
      } else {
        this.log('error', 'Failed to create tag', { name: request.name, error });
      }
      throw error;
    }
  }

  /**
   * 获取标签列表
   */
  async getTags(
    filters: TagFilters = {},
    pagination: { page?: number; limit?: number } = {}
  ): Promise<ApiResponse<PaginatedResponse<Tag>>> {
    try {
      const params = {
        page: pagination.page || 1,
        limit: Math.min(pagination.limit || 50, 200),
        ...filters
      };

      // 处理数组参数
      if (filters.categories) {
        params.categories = filters.categories.join(',');
      }
      if (filters.source) {
        params.source = filters.source.join(',');
      }

      // 处理使用范围
      if (filters.usageRange) {
        params.usageMin = filters.usageRange.min;
        params.usageMax = filters.usageRange.max;
      }

      const response = await this.get<PaginatedResponse<Tag>>('/tags', {
        customHeaders: { 'X-Filter-Applied': 'true' }
      });

      this.log('info', 'Retrieved tags list', {
        count: response.data?.items.length,
        page: pagination.page,
        filters: Object.keys(filters).length
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to retrieve tags', { filters, error });
      throw error;
    }
  }

  /**
   * 根据ID获取标签
   */
  async getTagById(id: string): Promise<ApiResponse<Tag>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid tag ID');
      }

      const response = await this.get<Tag>(`/tags/${id}`);

      this.log('info', 'Retrieved tag by ID', { tagId: id });

      return response;

    } catch (error) {
      if (error instanceof NotFoundError) {
        this.log('warn', 'Tag not found', { tagId: id });
      } else {
        this.log('error', 'Failed to retrieve tag', { tagId: id, error });
      }
      throw error;
    }
  }

  /**
   * 更新标签
   */
  async updateTag(id: string, request: UpdateTagRequest): Promise<ApiResponse<Tag>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid tag ID');
      }

      // 验证请求数据
      this.validateTagData({ ...request, id }, true);

      // 获取当前标签
      const currentTag = await this.getTagById(id);
      if (!currentTag.data) {
        throw new NotFoundError('Tag');
      }

      let processedRequest = { ...request };

      // 处理同义词更新
      if (request.synonyms) {
        const existingSynonyms = currentTag.data.synonyms || [];
        const newSynonyms = [...new Set([...existingSynonyms, ...request.synonyms.map((s: string) => s.trim().toLowerCase())])];
        processedRequest.synonyms = newSynonyms;
      }

      // 处理相关标签更新
      if (request.relatedTags) {
        const existingRelated = currentTag.data.relatedTags || [];
        const newRelated = [...new Set([...existingRelated, ...request.relatedTags])];
        processedRequest.relatedTags = newRelated;
      }

      const response = await this.put<Tag>(`/tags/${id}`, processedRequest, {
        customHeaders: {
          'X-Update-Reason': 'user_request'
        }
      });

      this.log('info', 'Tag updated successfully', {
        tagId: id,
        name: response.data?.name
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to update tag', { tagId: id, error });
      throw error;
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(id: string, force: boolean = false): Promise<ApiResponse<void>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid tag ID');
      }

      // 检查标签是否在使用中
      if (!force) {
        const usage = await this.getTagUsage(id);
        if (usage.data && usage.data.count > 0) {
          throw new ConflictError('Cannot delete tag that is in use', {
            usageCount: usage.data.count
          });
        }
      }

      const endpoint = force ? `/tags/${id}/force` : `/tags/${id}`;
      const response = await this.delete<void>(endpoint, {
        customHeaders: {
          'X-Delete-Reason': 'user_request',
          'X-Force-Delete': force.toString()
        }
      });

      this.log('info', 'Tag deleted', {
        tagId: id,
        force
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to delete tag', { tagId: id, error });
      throw error;
    }
  }

  /**
   * 批量操作标签
   */
  async batchOperation(operation: BatchTagOperation): Promise<ApiResponse<BatchOperationResult<Tag>>> {
    try {
      if (!operation.tagIds || !Array.isArray(operation.tagIds) || operation.tagIds.length === 0) {
        throw new ValidationError('Invalid tag IDs for batch operation');
      }

      if (operation.tagIds.length > 100) {
        throw new ValidationError('Maximum 100 tags allowed per batch operation');
      }

      // 验证操作类型
      const validOperations = ['merge', 'delete', 'archive', 'activate', 'deactivate', 'updateCategory'];
      if (!validOperations.includes(operation.operation)) {
        throw new ValidationError(`Invalid operation: ${operation.operation}`);
      }

      const response = await this.post<BatchOperationResult<Tag>>('/tags/batch', operation, {
        customHeaders: {
          'X-Batch-Operation': operation.operation,
          'X-Batch-Size': operation.tagIds.length.toString()
        }
      });

      this.log('info', 'Batch operation completed', {
        operation: operation.operation,
        totalTags: operation.tagIds.length,
        successRate: response.data?.successRate
      });

      return response;

    } catch (error) {
      this.log('error', 'Batch operation failed', {
        operation: operation.operation,
        tagCount: operation.tagIds.length,
        error
      });
      throw error;
    }
  }

  /**
   * 搜索标签
   */
  async searchTags(
    query: string,
    filters: Partial<TagFilters> = {},
    options: {
      limit?: number;
      offset?: number;
      includeInactive?: boolean;
    } = {}
  ): Promise<ApiResponse<Tag[]>> {
    try {
      if (!query || typeof query !== 'string') {
        throw new ValidationError('Invalid search query');
      }

      const searchRequest = {
        query: query.trim(),
        filters: {
          ...filters,
          isActive: options.includeInactive ? undefined : true
        },
        options: {
          limit: options.limit || 20,
          offset: options.offset || 0,
          includeMetadata: true,
          fuzzy: true
        }
      };

      const response = await this.post<any>('/tags/search', searchRequest);

      // 提取标签结果
      const tags = response.data?.results?.map((result: any) => result.item) || [];

      this.log('info', 'Tag search completed', {
        query,
        resultCount: tags.length,
        filters: Object.keys(filters).length
      });

      return this.createApiResponse(tags);

    } catch (error) {
      this.log('error', 'Tag search failed', { query, error });
      throw error;
    }
  }

  /**
   * 获取标签建议
   */
  async getTagSuggestions(
    content: string,
    options: {
      limit?: number;
      categories?: string[];
      excludeExisting?: string[];
    } = {}
  ): Promise<ApiResponse<TagSuggestion[]>> {
    try {
      if (!content || typeof content !== 'string') {
        throw new ValidationError('Invalid content for tag suggestions');
      }

      if (!this.enableTagSuggestions) {
        return this.createApiResponse([]);
      }

      const suggestionRequest = {
        content: content.substring(0, 1000), // 限制内容长度
        options: {
          limit: Math.min(options.limit || 10, 20),
          categories: options.categories,
          excludeTags: options.excludeExisting,
          includeCategories: true,
          minRelevance: 0.3
        }
      };

      const response = await this.post<TagSuggestion[]>('/tags/suggest', suggestionRequest);

      this.log('info', 'Tag suggestions generated', {
        contentLength: content.length,
        suggestionCount: response.data?.length
      });

      return response;

    } catch (error) {
      this.log('warn', 'Failed to get tag suggestions', { contentLength: content.length, error });
      return this.createApiResponse([]);
    }
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(
    timeRange: '7d' | '30d' | '90d' | '1y' = '30d',
    limit: number = 20,
    category?: string
  ): Promise<ApiResponse<Tag[]>> {
    try {
      const params = new URLSearchParams({
        timeRange,
        limit: limit.toString()
      });

      if (category) {
        params.set('category', category);
      }

      const response = await this.get<Tag[]>(`/tags/popular?${params}`);

      this.log('info', 'Retrieved popular tags', {
        timeRange,
        limit,
        category,
        count: response.data?.length
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get popular tags', { timeRange, limit, category, error });
      throw error;
    }
  }

  /**
   * 获取趋势标签
   */
  async getTrendingTags(
    timeRange: '24h' | '7d' | '30d' = '7d',
    limit: number = 10
  ): Promise<ApiResponse<Array<{ tag: Tag; trend: 'up' | 'down' | 'stable'; changePercent: number }>>> {
    try {
      const params = new URLSearchParams({
        timeRange,
        limit: limit.toString()
      });

      const response = await this.get<any>(`/tags/trending?${params}`);

      this.log('info', 'Retrieved trending tags', {
        timeRange,
        limit,
        count: response.data?.length
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get trending tags', { timeRange, limit, error });
      throw error;
    }
  }

  /**
   * 获取标签使用统计
   */
  async getTagUsage(id: string): Promise<ApiResponse<{ count: number; notes: string[]; lastUsed: string }>> {
    try {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Invalid tag ID');
      }

      const response = await this.get<any>(`/tags/${id}/usage`);

      this.log('info', 'Retrieved tag usage', { tagId: id });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get tag usage', { tagId: id, error });
      throw error;
    }
  }

  /**
   * 合并标签
   */
  async mergeTags(
    sourceTagIds: string[],
    targetTagId: string,
    options: {
      keepSourceTags?: boolean;
      updateNotes?: boolean;
    } = {}
  ): Promise<ApiResponse<any>> {
    try {
      if (!sourceTagIds || !Array.isArray(sourceTagIds) || sourceTagIds.length === 0) {
        throw new ValidationError('Invalid source tag IDs');
      }

      if (!targetTagId || typeof targetTagId !== 'string') {
        throw new ValidationError('Invalid target tag ID');
      }

      if (sourceTagIds.includes(targetTagId)) {
        throw new ValidationError('Target tag cannot be in source tags');
      }

      const mergeRequest = {
        sourceTagIds,
        targetTagId,
        options: {
          keepSourceTags: options.keepSourceTags || false,
          updateNotes: options.updateNotes !== false,
          mergeTime: new Date().toISOString()
        }
      };

      const response = await this.post<any>('/tags/merge', mergeRequest, {
        customHeaders: {
          'X-Merge-Operation': 'tag_merge',
          'X-Source-Tags-Count': sourceTagIds.length.toString()
        }
      });

      this.log('info', 'Tags merged successfully', {
        sourceTagIds,
        targetTagId,
        keepSourceTags: options.keepSourceTags
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to merge tags', { sourceTagIds, targetTagId, error });
      throw error;
    }
  }

  /**
   * 导入标签
   */
  async importTags(
    tags: Array<{ name: string; category?: string; description?: string }>,
    options: {
      skipDuplicates?: boolean;
      autoCategorize?: boolean;
    } = {}
  ): Promise<ApiResponse<BatchOperationResult<Tag>>> {
    try {
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        throw new ValidationError('Invalid tags data');
      }

      if (tags.length > 1000) {
        throw new ValidationError('Maximum 1000 tags allowed per import');
      }

      const importRequest = {
        tags,
        options: {
          skipDuplicates: options.skipDuplicates ?? true,
          autoCategorize: options.autoCategorize ?? this.enableAutoCategorization,
          generateColors: true,
          validateNames: true
        }
      };

      const response = await this.post<BatchOperationResult<Tag>>('/tags/import', importRequest, {
        customHeaders: {
          'X-Import-Operation': 'tag_import',
          'X-Import-Tags-Count': tags.length.toString()
        }
      });

      this.log('info', 'Tags imported successfully', {
        totalTags: tags.length,
        successRate: response.data?.successRate
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to import tags', { tagCount: tags.length, error });
      throw error;
    }
  }

  /**
   * 导出标签
   */
  async exportTags(
    format: 'json' | 'csv' | 'xlsx' = 'json',
    filters: TagFilters = {}
  ): Promise<ApiResponse<{ url: string; filename: string; expiresAt: string }>> {
    try {
      const params = {
        format,
        ...filters
      };

      // 处理数组参数
      if (filters.categories) {
        params.categories = filters.categories.join(',');
      }
      if (filters.source) {
        params.source = filters.source.join(',');
      }

      const response = await this.get<any>(`/tags/export?${new URLSearchParams(params)}`);

      this.log('info', 'Tags export initiated', {
        format,
        filters: Object.keys(filters).length
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to export tags', { format, filters, error });
      throw error;
    }
  }

  /**
   * 获取标签分类
   */
  async getTagCategories(): Promise<ApiResponse<TagCategory[]>> {
    try {
      const response = await this.get<TagCategory[]>('/tags/categories');

      this.log('info', 'Retrieved tag categories', {
        count: response.data?.length
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get tag categories', { error });
      throw error;
    }
  }

  /**
   * 创建标签分类
   */
  async createTagCategory(category: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parentId?: string;
  }): Promise<ApiResponse<TagCategory>> {
    try {
      const rules = {
        name: {
          required: true,
          type: 'string',
          minLength: 1,
          maxLength: 50
        },
        parentId: {
          type: 'string',
          validate: async (value: any) => {
            if (value) {
              // 验证父分类是否存在和深度限制
              const parentCategory = await this.getTagCategoryPath(value);
              if (parentCategory.data && parentCategory.data.length >= this.maxTagDepth) {
                return 'Maximum category depth exceeded';
              }
            }
            return null;
          }
        }
      };

      this.validateParams(category, rules);

      let processedCategory = { ...category };

      // 自动生成颜色（如果没有提供）
      if (!processedCategory.color) {
        processedCategory.color = this.generateCategoryColor();
      }

      const response = await this.post<TagCategory>('/tags/categories', processedCategory);

      this.log('info', 'Tag category created', {
        categoryId: response.data?.id,
        name: category.name
      });

      return response;

    } catch (error) {
      this.log('error', 'Failed to create tag category', { name: category.name, error });
      throw error;
    }
  }

  /**
   * 获取标签分类路径
   */
  async getTagCategoryPath(categoryId: string): Promise<ApiResponse<TagCategory[]>> {
    try {
      if (!categoryId || typeof categoryId !== 'string') {
        throw new ValidationError('Invalid category ID');
      }

      const response = await this.get<TagCategory[]>(`/tags/categories/${categoryId}/path`);

      this.log('info', 'Retrieved category path', { categoryId });

      return response;

    } catch (error) {
      this.log('error', 'Failed to get category path', { categoryId, error });
      throw error;
    }
  }

  /**
   * 生成标签颜色
   */
  private generateTagColor(): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
      '#06B6D4', '#A855F7', '#F43F5E', '#22D3EE', '#A3E635'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 生成分类颜色
   */
  private generateCategoryColor(): string {
    const colors = [
      '#1E40AF', '#14532D', '#A16207', '#991B1B', '#581C87',
      '#831843', '#115E59', '#C2410C', '#4338CA', '#65A30D',
      '#0E7490', '#7C3AED', '#B91C1C', '#0E7490', '#4D7C0F'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 建议标签分类（AI服务）
   */
  private async suggestCategory(tagName: string): Promise<string | null> {
    if (!this.aiServiceUrl) {
      return null;
    }

    try {
      const response = await fetch(`${this.aiServiceUrl}/categorization/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemName: tagName,
          itemType: 'tag',
          context: 'tag_management'
        })
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      return data.suggestedCategoryId || null;

    } catch (error) {
      this.log('warn', 'Failed to suggest category via AI service', { error });
      return null;
    }
  }

  /**
   * 获取标签统计
   */
  async getTagsStatistics(): Promise<ApiResponse<{
    totalTags: number;
    activeTags: number;
    inactiveTags: number;
    categories: number;
    averageUsage: number;
    mostUsedTags: Array<{ tag: Tag; usageCount: number }>;
    recentlyCreated: Array<{ tag: Tag; createdAt: string }>;
  }>> {
    try {
      const response = await this.get<any>('/tags/statistics');

      this.log('info', 'Retrieved tags statistics');

      return response;

    } catch (error) {
      this.log('error', 'Failed to get tags statistics', { error });
      throw error;
    }
  }
}

/**
 * 创建标签服务实例
 */
export function createTagsService(config: TagsServiceConfig): TagsService {
  return new TagsService(config);
}

/**
 * 默认标签服务配置
 */
export const defaultTagsServiceConfig: TagsServiceConfig = {
  baseUrl: '/api/v1',
  aiServiceUrl: '/api/v1/ai',
  enableAutoCategorization: true,
  enableTagSuggestions: true,
  maxTagsPerCategory: 1000,
  maxTagDepth: 5
};