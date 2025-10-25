// 向量存储服务

import { PrismaClient } from '@prisma/client'
import { aiConfig } from '@/lib/ai/config'
import { logger } from '@/lib/ai/services'

export interface VectorEmbedding {
  id: string
  noteId: string
  userId: string
  embedding: number[]
  model: string
  dimensions: number
  checksum: string
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface SimilarityResult {
  noteId: string
  title: string
  summary: string
  similarity: number
  categories: string[]
  tags: string[]
  updatedAt: Date
}

export interface VectorSearchOptions {
  threshold?: number
  limit?: number
  categories?: string[]
  tags?: string[]
  excludeNoteId?: string
}

export class VectorService {
  private prisma: PrismaClient
  private embeddingModel: string
  private dimensions: number

  constructor() {
    this.prisma = new PrismaClient()
    this.embeddingModel = aiConfig.settings.embeddingModel
    this.dimensions = aiConfig.settings.embeddingDimensions
  }

  /**
   * 生成向量嵌入
   */
  async generateEmbedding(text: string, model?: string): Promise<number[]> {
    try {
      logger.info('开始生成向量嵌入', {
        textLength: text.length,
        model: model || this.embeddingModel
      })

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: model || this.embeddingModel,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const embedding = data.data[0].embedding

      logger.info('向量嵌入生成成功', {
        model: data.model,
        usage: data.usage,
        dimensions: embedding.length
      })

      return embedding
    } catch (error) {
      logger.error('向量嵌入生成失败', {
        error: error.message,
        textLength: text.length,
        model: model || this.embeddingModel
      })
      throw error
    }
  }

  /**
   * 存储向量嵌入
   */
  async storeVector(
    noteId: string,
    userId: string,
    content: string,
    model?: string
  ): Promise<VectorEmbedding> {
    try {
      logger.info('开始存储向量嵌入', {
        noteId,
        userId,
        contentLength: content.length,
        model: model || this.embeddingModel
      })

      // 计算内容校验和
      const checksum = this.calculateChecksum(content)

      // 检查是否已存在相同校验和的向量
      const existing = await this.prisma.embeddingVector.findUnique({
        where: { noteId }
      })

      if (existing && existing.checksum === checksum) {
        logger.info('向量已存在且内容未变化', { noteId })
        return {
          id: existing.id,
          noteId: existing.noteId,
          userId: existing.userId,
          embedding: Buffer.from(existing.embedding), // 转换字节数组为数字数组
          model: existing.model,
          dimensions: existing.dimensions,
          checksum: existing.checksum,
          version: existing.version,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt
        }
      }

      // 生成新的向量嵌入
      const embedding = await this.generateEmbedding(content, model)

      // 转换数字数组为字节数组（用于存储）
      const embeddingBytes = Buffer.from(new Float32Array(embedding).buffer)

      // 存储或更新向量
      const result = await this.prisma.embeddingVector.upsert({
        where: { noteId },
        update: {
          embedding: embeddingBytes,
          model: model || this.embeddingModel,
          dimensions: embedding.length,
          checksum,
          version: existing ? existing.version + 1 : 1,
          updatedAt: new Date()
        },
        create: {
          noteId,
          userId,
          embedding: embeddingBytes,
          model: model || this.embeddingModel,
          dimensions: embedding.length,
          checksum,
          version: 1
        }
      })

      logger.info('向量存储成功', {
        vectorId: result.id,
        noteId,
        model: result.model,
        dimensions: result.dimensions,
        version: result.version
      })

      return {
        id: result.id,
        noteId: result.noteId,
        userId: result.userId,
        embedding, // 返回数字数组
        model: result.model,
        dimensions: result.dimensions,
        checksum: result.checksum,
        version: result.version,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      }
    } catch (error) {
      logger.error('向量存储失败', {
        noteId,
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * 查找相似向量
   */
  async findSimilarVectors(
    noteId: string,
    options: VectorSearchOptions = {}
  ): Promise<SimilarityResult[]> {
    try {
      const {
        threshold = aiConfig.settings.similarityThreshold,
        limit = 10,
        categories,
        tags,
        excludeNoteId
      } = options

      logger.info('开始相似向量搜索', {
        noteId,
        threshold,
        limit,
        categories,
        tags,
        excludeNoteId
      })

      // 获取查询笔记的向量
      const queryVector = await this.prisma.embeddingVector.findUnique({
        where: { noteId }
      })

      if (!queryVector) {
        throw new Error(`Vector not found for note: ${noteId}`)
      }

      // 转换字节数组为向量
      const queryEmbedding = Buffer.from(queryVector.embedding).toString()

      // 构建SQL查询
      let sql = `
        SELECT
          n.id as noteId,
          n.title,
          n.content as summary,
          1 - (ev.embedding <=> $1::vector) as similarity,
          COALESCE(
            json_agg(DISTINCT cc.name) FILTER (WHERE cc.name IS NOT NULL),
            ARRAY[]::text[]
          ) as categories,
          COALESCE(
            json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
            ARRAY[]::text[]
          ) as tags,
          n.updated_at as updatedAt
        FROM embedding_vectors ev
        JOIN notes n ON ev.note_id = n.id
        LEFT JOIN note_tags nt ON n.id = nt.note_id
        LEFT JOIN tags t ON nt.tag_id = t.id
        LEFT JOIN ai_analysis ai ON n.id = ai.note_id
        LEFT JOIN jsonb_array_elements_text(ai.categories) as cc_name ON true
        LEFT JOIN content_categories cc ON cc.name = cc_name
        WHERE ev.note_id != $2
          AND 1 - (ev.embedding <=> $1::vector) > $3
      `

      const params = [queryEmbedding, noteId, threshold]

      // 添加分类过滤
      if (categories && categories.length > 0) {
        sql += ` AND cc.name = ANY($${params.length + 1})`
        params.push(categories)
      }

      // 添加标签过滤
      if (tags && tags.length > 0) {
        sql += ` AND t.name = ANY($${params.length + 1})`
        params.push(tags)
      }

      // 排除特定笔记
      if (excludeNoteId) {
        sql += ` AND n.id != $${params.length + 1}`
        params.push(excludeNoteId)
      }

      sql += `
        GROUP BY n.id, n.title, n.content, n.updated_at
        ORDER BY similarity DESC
        LIMIT $${params.length + 1}
      `
      params.push(limit)

      // 执行查询
      const results = await this.prisma.$queryRawUnsafe(sql, ...params)

      logger.info('相似向量搜索完成', {
        queryNoteId: noteId,
        resultCount: results.length,
        threshold
      })

      return results as SimilarityResult[]
    } catch (error) {
      logger.error('相似向量搜索失败', {
        noteId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * 删除向量
   */
  async deleteVector(noteId: string): Promise<boolean> {
    try {
      const result = await this.prisma.embeddingVector.delete({
        where: { noteId }
      })

      logger.info('向量删除成功', {
        noteId,
        vectorId: result.id
      })

      return true
    } catch (error) {
      logger.error('向量删除失败', {
        noteId,
        error: error.message
      })
      return false
    }
  }

  /**
   * 获取向量统计信息
   */
  async getVectorStats(userId?: string): Promise<{
    totalVectors: number
    totalStorage: number
    modelDistribution: Record<string, number>
    avgDimensions: number
  }> {
    try {
      const whereClause = userId ? { userId } : {}

      const [totalResult, modelStats, dimensionsResult] = await Promise.all([
        // 总向量数量
        this.prisma.embeddingVector.count({ where: whereClause }),

        // 按模型分布
        this.prisma.embeddingVector.groupBy({
          by: ['model'],
          where: whereClause,
          _count: true
        }),

        // 平均维度
        this.prisma.embeddingVector.aggregate({
          where: whereClause,
          _avg: {
            dimensions: true
          }
        })
      ])

      const modelDistribution: Record<string, number> = {}
      modelStats.forEach(stat => {
        modelDistribution[stat.model] = stat._count
      })

      const totalStorage = totalResult * this.dimensions * 4 // 假设每个维度4字节

      return {
        totalVectors: totalResult,
        totalStorage,
        modelDistribution,
        avgDimensions: Math.round(dimensionsResult._avg.dimensions || 0)
      }
    } catch (error) {
      logger.error('获取向量统计信息失败', {
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * 计算内容校验和
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * 批量生成向量嵌入
   */
  async batchGenerateEmbeddings(
    items: Array<{ id: string; content: string }>,
    model?: string
  ): Promise<Array<{ id: string; embedding: number[]; error?: string }>> {
    const results: Array<{ id: string; embedding: number[]; error?: string }> = []

    // 分批处理，避免API限制
    const batchSize = aiConfig.settings.batchSize
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)

      logger.info('批量生成向量嵌入', {
        batchIndex: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
        totalBatches: Math.ceil(items.length / batchSize)
      })

      // 并行处理当前批次
      const batchPromises = batch.map(async (item) => {
        try {
          const embedding = await this.generateEmbedding(item.content, model)
          return { id: item.id, embedding }
        } catch (error) {
          logger.error('单个向量生成失败', {
            id: item.id,
            error: error.message
          })
          return { id: item.id, embedding: [], error: error.message }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // 添加延迟以避免速率限制
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const successCount = results.filter(r => !r.error).length
    const errorCount = results.filter(r => r.error).length

    logger.info('批量向量生成完成', {
      totalItems: items.length,
      successCount,
      errorCount,
      model: model || this.embeddingModel
    })

    return results
  }

  /**
   * 清理无效向量
   */
  async cleanupInvalidVectors(): Promise<number> {
    try {
      // 删除没有对应笔记的向量
      const result = await this.prisma.$executeRaw`
        DELETE FROM embedding_vectors
        WHERE note_id NOT IN (SELECT id FROM notes)
      `

      const deletedCount = Array.isArray(result) ? result.length : result.rowCount || 0

      logger.info('清理无效向量完成', {
        deletedCount
      })

      return deletedCount
    } catch (error) {
      logger.error('清理无效向量失败', {
        error: error.message
      })
      throw error
    }
  }
}

// 导出单例实例
export const vectorService = new VectorService()