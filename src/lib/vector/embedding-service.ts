/**
 * 向量嵌入服务
 * 提供文本向量化和向量搜索功能
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from '@/lib/utils/logger';
import { getPrismaClient } from '../db/connection';

export interface EmbeddingRequest {
  text: string;
  model?: string;
  dimensions?: number;
  metadata?: Record<string, any>;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  tokens: number;
  cost?: number;
  processingTime: number;
}

export interface VectorSearchRequest {
  query: string | number[];
  limit?: number;
  threshold?: number;
  filters?: {
    userId?: string;
    categoryId?: string;
    tags?: string[];
    status?: string;
  };
  includeMetadata?: boolean;
}

export interface VectorSearchResult {
  noteId: string;
  title: string;
  content: string;
  similarity: number;
  metadata?: {
    userId: string;
    categoryId: string;
    tags: string[];
    status: string;
    wordCount: number;
    createdAt: Date;
  };
}

export interface EmbeddingStats {
  totalEmbeddings: number;
  averageDimensions: number;
  modelUsage: Record<string, number>;
  totalTokens: number;
  totalCost: number;
  averageProcessingTime: number;
}

/**
 * 向量嵌入服务类
 */
export class EmbeddingService {
  private static instance: EmbeddingService;
  private prisma: PrismaClient;
  private defaultModel: string;
  private defaultDimensions: number;

  private constructor() {
    this.prisma = getPrismaClient();
    this.defaultModel = 'text-embedding-ada-002';
    this.defaultDimensions = 1536;
  }

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * 生成文本向量嵌入
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const model = request.model || this.defaultModel;
    const dimensions = request.dimensions || this.defaultDimensions;

    try {
      // 这里集成实际的嵌入服务提供商
      // 目前使用模拟数据，实际项目中应该调用OpenAI、Anthropic或其他API
      const embedding = await this.callEmbeddingAPI(request.text, model);

      const processingTime = Date.now() - startTime;

      // 保存向量嵌入到数据库
      if (request.metadata?.noteId) {
        await this.saveEmbedding({
          noteId: request.metadata.noteId,
          embedding,
          model,
          dimensions,
          createdAt: new Date(),
        });
      }

      const result: EmbeddingResult = {
        embedding,
        dimensions,
        model,
        tokens: this.estimateTokens(request.text),
        cost: this.calculateCost(model, this.estimateTokens(request.text)),
        processingTime,
      };

      Logger.info('向量嵌入生成成功', {
        model,
        dimensions,
        processingTime,
        tokens: result.tokens,
      });

      return result;

    } catch (error) {
      Logger.error('向量嵌入生成失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
        textLength: request.text.length,
      });

      throw new Error(`向量嵌入生成失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 批量生成向量嵌入
   */
  async generateBatchEmbeddings(
    requests: EmbeddingRequest[],
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const batchSize = 10; // 控制并发数

    Logger.info('开始批量生成向量嵌入', {
      totalRequests: requests.length,
      batchSize,
    });

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.generateEmbedding(request));

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        Logger.info(`批次 ${Math.floor(i / batchSize) + 1} 完成`, {
          batchSize: batch.length,
          cumulativeResults: results.length,
        });

      } catch (error) {
        Logger.error(`批次 ${Math.floor(i / batchSize) + 1} 处理失败`, {
          batchSize: batch.length,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // 继续处理下一批次
        continue;
      }

      // 避免API限制，添加延迟
      if (i + batchSize < requests.length) {
        await this.delay(1000); // 1秒延迟
      }
    }

    Logger.info('批量向量嵌入生成完成', {
      totalRequested: requests.length,
      totalSuccessful: results.length,
      successRate: `${((results.length / requests.length) * 100).toFixed(2)}%`,
    });

    return results;
  }

  /**
   * 向量相似性搜索
   */
  async vectorSearch(request: VectorSearchRequest): Promise<VectorSearchResult[]> {
    const startTime = Date.now();
    const limit = Math.min(request.limit || 10, 100);
    const threshold = request.threshold || 0.7;

    try {
      let queryVector: number[];

      if (typeof request.query === 'string') {
        // 如果查询是文本，先生成向量嵌入
        const embedding = await this.generateEmbedding({
          text: request.query,
        });
        queryVector = embedding.embedding;
      } else {
        queryVector = request.query;
      }

      // 构建搜索查询
      const whereClause: any = {};

      // 应用过滤条件
      if (request.filters) {
        if (request.filters.userId) {
          whereClause.note = { userId: request.filters.userId };
        }
        if (request.filters.categoryId) {
          whereClause.note = {
            ...whereClause.note,
            categoryId: request.filters.categoryId,
          };
        }
        if (request.filters.status) {
          whereClause.note = {
            ...whereClause.note,
            status: request.filters.status,
          };
        }
        if (request.filters.tags && request.filters.tags.length > 0) {
          whereClause.note = {
            ...whereClause.note,
            tags: {
              some: {
                tag: {
                  name: { in: request.filters.tags },
                },
              },
            },
          };
        }
      }

      // 执行向量搜索（使用pgvector的相似性搜索）
      const searchResults = await this.prisma.$queryRaw`
        SELECT
          ve.note_id,
          n.title,
          n.content,
          1 - (ve.embedding <=> ${queryVector}::vector) as similarity,
          n.user_id as "userId",
          n.category_id as "categoryId",
          n.status,
          n.word_count as "wordCount",
          n.created_at as "createdAt"
        FROM vector_embeddings ve
        JOIN notes n ON ve.note_id = n.id
        WHERE 1 - (ve.embedding <=> ${queryVector}::vector) > ${threshold}
        ${whereClause.note ? sql`AND n.user_id = ${whereClause.note.userId}` : sql``}
        ${whereClause.note?.categoryId ? sql`AND n.category_id = ${whereClause.note.categoryId}` : sql``}
        ${whereClause.note?.status ? sql`AND n.status = ${whereClause.note.status}` : sql``}
        ORDER BY similarity DESC
        LIMIT ${limit}
      ` as any[];

      // 处理搜索结果
      const results: VectorSearchResult[] = [];

      for (const row of searchResults) {
        // 获取笔记的标签
        const tags = await this.prisma.noteTag.findMany({
          where: { noteId: row.note_id },
          include: {
            tag: {
              select: { name: true },
            },
          },
        });

        const result: VectorSearchResult = {
          noteId: row.note_id,
          title: row.title,
          content: this.truncateContent(row.content, 200),
          similarity: parseFloat(row.similarity),
          metadata: {
            userId: row.userId,
            categoryId: row.categoryId,
            tags: tags.map(t => t.tag.name),
            status: row.status,
            wordCount: row.wordCount,
            createdAt: row.createdAt,
          },
        };

        results.push(result);
      }

      const searchTime = Date.now() - startTime;

      Logger.info('向量搜索完成', {
        queryLength: typeof request.query === 'string' ? request.query.length : queryVector.length,
        results: results.length,
        threshold,
        searchTime,
      });

      return results;

    } catch (error) {
      Logger.error('向量搜索失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        queryType: typeof request.query,
        limit,
        threshold,
      });

      throw new Error(`向量搜索失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 更新笔记的向量嵌入
   */
  async updateNoteEmbedding(noteId: string, text: string): Promise<void> {
    try {
      // 删除现有嵌入
      await this.prisma.vectorEmbedding.deleteMany({
        where: { noteId },
      });

      // 生成新的嵌入
      await this.generateEmbedding({
        text,
        metadata: { noteId },
      });

      Logger.info('笔记向量嵌入更新成功', { noteId });

    } catch (error) {
      Logger.error('笔记向量嵌入更新失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        noteId,
      });

      throw new Error(`向量嵌入更新失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 删除笔记的向量嵌入
   */
  async deleteNoteEmbedding(noteId: string): Promise<void> {
    try {
      const result = await this.prisma.vectorEmbedding.deleteMany({
        where: { noteId },
      });

      Logger.info('笔记向量嵌入删除成功', {
        noteId,
        deletedCount: result.count,
      });

    } catch (error) {
      Logger.error('笔记向量嵌入删除失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        noteId,
      });

      throw new Error(`向量嵌入删除失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取向量嵌入统计信息
   */
  async getEmbeddingStats(): Promise<EmbeddingStats> {
    try {
      const [totalEmbeddings, dimensionStats, modelStats] = await Promise.all([
        this.prisma.vectorEmbedding.count(),
        this.prisma.vectorEmbedding.aggregate({
          _avg: { dimensions: true },
        }),
        this.prisma.vectorEmbedding.groupBy({
          by: ['model'],
          _count: true,
        }),
      ]);

      const modelUsage: Record<string, number> = {};
      modelStats.forEach(stat => {
        modelUsage[stat.model] = stat._count;
      });

      // 计算总token数和成本（模拟数据）
      const totalTokens = totalEmbeddings * 800; // 假设平均800 tokens
      const totalCost = totalTokens * 0.0001; // 假设每token成本

      // 计算平均处理时间（模拟数据）
      const averageProcessingTime = 1500; // 1.5秒

      return {
        totalEmbeddings,
        averageDimensions: Math.round(dimensionStats._avg.dimensions || 0),
        modelUsage,
        totalTokens,
        totalCost: parseFloat(totalCost.toFixed(4)),
        averageProcessingTime,
      };

    } catch (error) {
      Logger.error('获取向量嵌入统计失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(`获取统计信息失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 调用嵌入API（模拟实现）
   */
  private async callEmbeddingAPI(text: string, model: string): Promise<number[]> {
    // 模拟API调用延迟
    await this.delay(Math.random() * 1000 + 500); // 500-1500ms

    // 模拟向量生成
    const dimensions = this.getDimensionsForModel(model);
    const embedding = Array.from({ length: dimensions }, () => Math.random() - 0.5);

    // 归一化向量
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * 保存向量嵌入到数据库
   */
  private async saveEmbedding(data: {
    noteId: string;
    embedding: number[];
    model: string;
    dimensions: number;
    createdAt: Date;
  }): Promise<void> {
    try {
      await this.prisma.vectorEmbedding.create({
        data: {
          noteId: data.noteId,
          embedding: data.embedding,
          model: data.model,
          dimensions: data.dimensions,
          createdAt: data.createdAt,
        },
      });

    } catch (error) {
      Logger.error('保存向量嵌入失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        noteId: data.noteId,
      });

      throw error;
    }
  }

  /**
   * 估算token数量
   */
  private estimateTokens(text: string): number {
    // 简单的token估算：大约4个字符 = 1个token
    return Math.ceil(text.length / 4);
  }

  /**
   * 计算API调用成本
   */
  private calculateCost(model: string, tokens: number): number {
    // 简单的成本计算（模拟）
    const costPerToken = {
      'text-embedding-ada-002': 0.0001 / 1000,
      'text-embedding-3-small': 0.00002 / 1000,
      'text-embedding-3-large': 0.00013 / 1000,
    };

    const rate = costPerToken[model as keyof typeof costPerToken] || 0.0001 / 1000;
    return tokens * rate;
  }

  /**
   * 获取模型的向量维度
   */
  private getDimensionsForModel(model: string): number {
    const dimensions: Record<string, number> = {
      'text-embedding-ada-002': 1536,
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
    };

    return dimensions[model] || this.defaultDimensions;
  }

  /**
   * 截断内容
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查pgvector扩展是否可用
   */
  async checkVectorExtension(): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT 1 as exists
        FROM pg_extension
        WHERE extname = 'vector'
      ` as any[];

      return result.length > 0;

    } catch (error) {
      Logger.error('检查pgvector扩展失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  /**
   * 创建向量索引
   */
  async createVectorIndex(): Promise<void> {
    try {
      // 检查索引是否已存在
      const indexExists = await this.prisma.$queryRaw`
        SELECT 1 as exists
        FROM pg_indexes
        WHERE indexname = 'idx_vector_embeddings_embedding'
      ` as any[];

      if (indexExists.length === 0) {
        await this.prisma.$executeRaw`
          CREATE INDEX idx_vector_embeddings_embedding
          ON vector_embeddings
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `;

        Logger.info('向量索引创建成功');
      } else {
        Logger.info('向量索引已存在');
      }

    } catch (error) {
      Logger.error('创建向量索引失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(`向量索引创建失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 重新索引所有笔记
   */
  async reindexAllNotes(): Promise<{
    total: number;
    processed: number;
    failed: number;
    duration: number;
  }> {
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;

    try {
      const totalNotes = await this.prisma.note.count({
        where: { status: 'PUBLISHED' },
      });

      Logger.info('开始重新索引所有笔记', { totalNotes });

      // 分批处理笔记
      const batchSize = 50;
      for (let offset = 0; offset < totalNotes; offset += batchSize) {
        const notes = await this.prisma.note.findMany({
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            title: true,
            content: true,
          },
          skip: offset,
          take: batchSize,
        });

        for (const note of notes) {
          try {
            const combinedText = `${note.title}\n\n${note.content}`;
            await this.updateNoteEmbedding(note.id, combinedText);
            processed++;

            if (processed % 10 === 0) {
              Logger.info('重新索引进度', {
                processed,
                total: totalNotes,
                progress: `${((processed / totalNotes) * 100).toFixed(2)}%`,
              });
            }

          } catch (error) {
            failed++;
            Logger.error('笔记索引失败', {
              noteId: note.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        // 避免API限制
        await this.delay(2000);
      }

      const duration = Date.now() - startTime;

      Logger.info('重新索引完成', {
        total: totalNotes,
        processed,
        failed,
        duration: `${(duration / 1000).toFixed(2)}s`,
        successRate: `${((processed / totalNotes) * 100).toFixed(2)}%`,
      });

      return {
        total: totalNotes,
        processed,
        failed,
        duration,
      };

    } catch (error) {
      Logger.error('重新索引失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(`重新索引失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// 导出单例实例
export const embeddingService = EmbeddingService.getInstance();
