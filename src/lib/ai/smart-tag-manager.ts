/**
 * 智能标签管理器
 *
 * 提供标签的创建、管理、分析和优化功能
 */

import { SmartTag } from '@/components/ai/smart-tag-display'

export interface TagAnalytics {
  totalTags: number
  categoryDistribution: Record<string, number>
  averageRelevance: number
  averageConfidence: number
  mostUsedTags: Array<{
    tag: SmartTag
    usageCount: number
  }>
  trendingTags: Array<{
    tag: SmartTag
    trend: 'up' | 'down' | 'stable'
    changePercent: number
  }>
  unusedTags: SmartTag[]
}

export interface TagSuggestion {
  name: string
  category: SmartTag['category']
  confidence: number
  relevance: number
  reason: string
  source: 'ai' | 'user' | 'similarity'
}

export interface TagFilter {
  categories?: SmartTag['category'][]
  minRelevance?: number
  minConfidence?: number
  dateRange?: {
    start: Date
    end: Date
  }
  userGenerated?: boolean
}

export class SmartTagManager {
  private tags: Map<string, SmartTag> = new Map()
  private tagUsage: Map<string, number> = new Map()
  private tagHistory: Array<{
    tagId: string
    action: 'create' | 'delete' | 'update'
    timestamp: Date
  }> = []

  constructor() {
    this.initializeDefaultTags()
  }

  /**
   * 初始化默认标签
   */
  private initializeDefaultTags(): void {
    const defaultTags: SmartTag[] = [
      {
        id: 'default-1',
        name: '技术文档',
        category: 'content',
        color: 'blue',
        relevance: 0.8,
        confidence: 0.9,
        description: '技术相关的文档内容',
        createdAt: new Date().toISOString(),
        isUserGenerated: false,
      },
      {
        id: 'default-2',
        name: '积极情感',
        category: 'emotion',
        color: 'pink',
        relevance: 0.7,
        confidence: 0.85,
        description: '正面的情感倾向',
        createdAt: new Date().toISOString(),
        isUserGenerated: false,
      },
      {
        id: 'default-3',
        name: '重要',
        category: 'priority',
        color: 'red',
        relevance: 0.9,
        confidence: 0.95,
        description: '高优先级内容',
        createdAt: new Date().toISOString(),
        isUserGenerated: false,
      },
    ]

    defaultTags.forEach(tag => {
      this.tags.set(tag.id, tag)
      this.tagUsage.set(tag.id, 0)
    })
  }

  /**
   * 创建新标签
   */
  async createTag(
    name: string,
    category: SmartTag['category'],
    options: Partial<SmartTag> = {}
  ): Promise<SmartTag | null> {
    try {
      // 检查标签是否已存在
      const existingTag = this.findTagByName(name, category)
      if (existingTag) {
        return existingTag
      }

      const newTag: SmartTag = {
        id: this.generateTagId(name, category),
        name: name.trim(),
        category,
        color: this.getCategoryColor(category),
        relevance: options.relevance || 0.8,
        confidence: options.confidence || 0.8,
        description: options.description,
        createdAt: new Date().toISOString(),
        isUserGenerated: true,
        metadata: options.metadata,
      }

      this.tags.set(newTag.id, newTag)
      this.tagUsage.set(newTag.id, 0)

      this.recordTagAction(newTag.id, 'create')

      return newTag
    } catch (error) {
      console.error('Failed to create tag:', error)
      return null
    }
  }

  /**
   * 更新标签
   */
  async updateTag(tagId: string, updates: Partial<SmartTag>): Promise<SmartTag | null> {
    const existingTag = this.tags.get(tagId)
    if (!existingTag) {
      return null
    }

    const updatedTag: SmartTag = {
      ...existingTag,
      ...updates,
      id: tagId, // 确保ID不被更改
    }

    this.tags.set(tagId, updatedTag)
    this.recordTagAction(tagId, 'update')

    return updatedTag
  }

  /**
   * 删除标签
   */
  async deleteTag(tagId: string): Promise<boolean> {
    const tag = this.tags.get(tagId)
    if (!tag) {
      return false
    }

    this.tags.delete(tagId)
    this.tagUsage.delete(tagId)
    this.recordTagAction(tagId, 'delete')

    return true
  }

  /**
   * 获取所有标签
   */
  getAllTags(): SmartTag[] {
    return Array.from(this.tags.values())
  }

  /**
   * 根据ID获取标签
   */
  getTagById(tagId: string): SmartTag | undefined {
    return this.tags.get(tagId)
  }

  /**
   * 根据名称和分类查找标签
   */
  findTagByName(name: string, category?: SmartTag['category']): SmartTag | undefined {
    return Array.from(this.tags.values()).find(tag =>
      tag.name.toLowerCase() === name.toLowerCase() &&
      (!category || tag.category === category)
    )
  }

  /**
   * 过滤标签
   */
  filterTags(filter: TagFilter): SmartTag[] {
    return Array.from(this.tags.values()).filter(tag => {
      // 分类过滤
      if (filter.categories && !filter.categories.includes(tag.category)) {
        return false
      }

      // 相关性过滤
      if (filter.minRelevance !== undefined && tag.relevance < filter.minRelevance) {
        return false
      }

      // 置信度过滤
      if (filter.minConfidence !== undefined && tag.confidence < filter.minConfidence) {
        return false
      }

      // 用户生成过滤
      if (filter.userGenerated !== undefined && tag.isUserGenerated !== filter.userGenerated) {
        return false
      }

      // 日期范围过滤
      if (filter.dateRange) {
        const tagDate = new Date(tag.createdAt)
        if (tagDate < filter.dateRange.start || tagDate > filter.dateRange.end) {
          return false
        }
      }

      return true
    })
  }

  /**
   * 搜索标签
   */
  searchTags(query: string, category?: SmartTag['category']): SmartTag[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.tags.values()).filter(tag => {
      const matchesCategory = !category || tag.category === category
      const matchesQuery = tag.name.toLowerCase().includes(lowerQuery) ||
                          (tag.description && tag.description.toLowerCase().includes(lowerQuery))
      return matchesCategory && matchesQuery
    })
  }

  /**
   * 获取标签分析数据
   */
  getAnalytics(): TagAnalytics {
    const allTags = this.getAllTags()

    // 分类分布
    const categoryDistribution: Record<string, number> = {}
    allTags.forEach(tag => {
      categoryDistribution[tag.category] = (categoryDistribution[tag.category] || 0) + 1
    })

    // 平均相关性和置信度
    const averageRelevance = allTags.reduce((sum, tag) => sum + tag.relevance, 0) / allTags.length
    const averageConfidence = allTags.reduce((sum, tag) => sum + tag.confidence, 0) / allTags.length

    // 最常用标签
    const mostUsedTags = Array.from(this.tagUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tagId, usageCount]) => ({
        tag: this.tags.get(tagId)!,
        usageCount,
      }))

    // 趋势标签
    const trendingTags = this.calculateTrendingTags()

    // 未使用标签
    const unusedTags = allTags.filter(tag => (this.tagUsage.get(tag.id) || 0) === 0)

    return {
      totalTags: allTags.length,
      categoryDistribution,
      averageRelevance,
      averageConfidence,
      mostUsedTags,
      trendingTags,
      unusedTags,
    }
  }

  /**
   * 基于内容推荐标签
   */
  async suggestTags(
    content: string,
    existingTags: string[] = []
  ): Promise<TagSuggestion[]> {
    // 简化的标签推荐逻辑
    const suggestions: TagSuggestion[] = []

    // 基于关键词分析
    const keywords = this.extractKeywords(content)

    // 基于现有标签匹配
    const existingTagObjects = existingTags
      .map(name => this.findTagByName(name))
      .filter(Boolean) as SmartTag[]

    // 模拟AI推荐逻辑
    if (content.includes('技术') || content.includes('开发')) {
      suggestions.push({
        name: '技术文档',
        category: 'content',
        confidence: 0.9,
        relevance: 0.85,
        reason: '内容包含技术相关词汇',
        source: 'ai',
      })
    }

    if (content.length > 1000) {
      suggestions.push({
        name: '长文档',
        category: 'content',
        confidence: 0.8,
        relevance: 0.7,
        reason: '文档长度超过1000字符',
        source: 'ai',
      })
    }

    // 基于情感分析
    const sentiment = this.analyzeSentiment(content)
    if (sentiment > 0.5) {
      suggestions.push({
        name: '积极情感',
        category: 'emotion',
        confidence: sentiment,
        relevance: 0.8,
        reason: '内容表现出积极情感倾向',
        source: 'ai',
      })
    }

    return suggestions.slice(0, 5) // 限制推荐数量
  }

  /**
   * 增加标签使用次数
   */
  incrementTagUsage(tagId: string): void {
    const currentUsage = this.tagUsage.get(tagId) || 0
    this.tagUsage.set(tagId, currentUsage + 1)
  }

  /**
   * 批量操作标签
   */
  async batchOperation(action: string, tagIds: string[]): Promise<boolean> {
    try {
      switch (action) {
        case 'delete':
          for (const tagId of tagIds) {
            await this.deleteTag(tagId)
          }
          break
        case 'export':
          return this.exportTags(tagIds)
        default:
          return false
      }
      return true
    } catch (error) {
      console.error('Batch operation failed:', error)
      return false
    }
  }

  /**
   * 导出标签
   */
  exportTags(tagIds?: string[]): boolean {
    try {
      const tagsToExport = tagIds
        ? tagIds.map(id => this.tags.get(id)).filter(Boolean) as SmartTag[]
        : this.getAllTags()

      const exportData = {
        tags: tagsToExport,
        usage: Object.fromEntries(this.tagUsage),
        exportedAt: new Date().toISOString(),
      }

      // 这里可以实现实际的导出逻辑，如下载JSON文件
      console.log('Exported tags:', exportData)
      return true
    } catch (error) {
      console.error('Export failed:', error)
      return false
    }
  }

  /**
   * 清理未使用的标签
   */
  async cleanupUnusedTags(threshold: number = 30): Promise<number> {
    const unusedTags = Array.from(this.tagUsage.entries())
      .filter(([, usage]) => usage < threshold)
      .map(([tagId]) => tagId)

    for (const tagId of unusedTags) {
      await this.deleteTag(tagId)
    }

    return unusedTags.length
  }

  /**
   * 生成标签ID
   */
  private generateTagId(name: string, category: SmartTag['category']): string {
    const timestamp = Date.now().toString(36)
    const hash = name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)
    return `${category}-${hash}-${timestamp}`
  }

  /**
   * 获取分类颜色
   */
  private getCategoryColor(category: SmartTag['category']): string {
    const colors = {
      content: 'blue',
      emotion: 'pink',
      topic: 'green',
      priority: 'red',
      custom: 'purple',
      system: 'gray',
    }
    return colors[category] || 'gray'
  }

  /**
   * 记录标签操作
   */
  private recordTagAction(tagId: string, action: 'create' | 'delete' | 'update'): void {
    this.tagHistory.push({
      tagId,
      action,
      timestamp: new Date(),
    })

    // 保持历史记录在合理范围内
    if (this.tagHistory.length > 1000) {
      this.tagHistory = this.tagHistory.slice(-500)
    }
  }

  /**
   * 计算趋势标签
   */
  private calculateTrendingTags(): Array<{
    tag: SmartTag
    trend: 'up' | 'down' | 'stable'
    changePercent: number
  }> {
    // 简化的趋势计算逻辑
    return Array.from(this.tags.values())
      .map(tag => {
        const usage = this.tagUsage.get(tag.id) || 0
        // 这里应该基于历史数据计算趋势，暂时返回稳定状态
        return {
          tag,
          trend: 'stable' as const,
          changePercent: 0,
        }
      })
      .slice(0, 10)
  }

  /**
   * 提取关键词
   */
  private extractKeywords(content: string): string[] {
    // 简化的关键词提取
    return content
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 20)
  }

  /**
   * 分析情感
   */
  private analyzeSentiment(content: string): number {
    // 简化的情感分析
    const positiveWords = ['好', '优秀', '成功', '喜欢', '满意', 'excellent', 'good', 'success']
    const negativeWords = ['坏', '失败', '讨厌', '失望', '差', 'bad', 'fail', 'disappointed']

    const words = content.toLowerCase().split(/\s+/)
    let score = 0

    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) score += 0.1
      if (negativeWords.some(nw => word.includes(nw))) score -= 0.1
    })

    return Math.max(0, Math.min(1, 0.5 + score))
  }
}

// 全局标签管理器实例
export const smartTagManager = new SmartTagManager()

export default SmartTagManager