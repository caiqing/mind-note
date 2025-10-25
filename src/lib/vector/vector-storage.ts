import { PrismaClient } from '@prisma/client';
import {
  VectorStorageProvider,
  VectorEmbedding,
  VectorSearchResult,
  VectorSearchOptions,
  VectorBatchOperation,
  VectorStorageStats,
  VectorIndexStats
} from '@/types/vector';
import { vectorConfig } from './vector-config';

export class PostgreSQLVectorStorage implements VectorStorageProvider {
  private prisma: PrismaClient;
  private config = vectorConfig;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // 存储向量
  async storeVector(
    noteId: string,
    vector: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // 验证向量维度
      const config = this.config.getConfig();
      if (vector.length !== config.dimensions) {
        throw new Error(
          `Vector dimension mismatch: expected ${config.dimensions}, got ${vector.length}`
        );
      }

      // 将向量转换为pgvector格式
      const vectorString = `[${vector.join(',')}]`;

      const result = await this.prisma.$executeRaw`
        UPDATE notes
        SET
          content_vector = ${vectorString}::vector,
          ai_processed = true,
          ai_processed_at = NOW(),
          updated_at = NOW()
        WHERE id = ${noteId}
      `;

      if (result === 0) {
        throw new Error(`Note with id ${noteId} not found`);
      }

      console.log(`Vector stored for note ${noteId}`);
    } catch (error) {
      console.error('Error storing vector:', error);
      throw new Error(`Failed to store vector for note ${noteId}: ${error}`);
    }
  }

  // 更新向量
  async updateVector(
    noteId: string,
    vector: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.storeVector(noteId, vector, metadata);
  }

  // 删除向量
  async deleteVector(noteId: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        UPDATE notes
        SET
          content_vector = NULL,
          ai_processed = false,
          ai_processed_at = NULL,
          updated_at = NOW()
        WHERE id = ${noteId}
      `;

      console.log(`Vector deleted for note ${noteId}`);
    } catch (error) {
      console.error('Error deleting vector:', error);
      throw new Error(`Failed to delete vector for note ${noteId}: ${error}`);
    }
  }

  // 获取向量
  async getVector(noteId: string): Promise<VectorEmbedding | null> {
    try {
      const result = await this.prisma.$queryRaw<Array<{
        id: string;
        content_vector: string;
        created_at: Date;
        updated_at: Date;
      }>>`
        SELECT
          id,
          content_vector::text,
          created_at,
          updated_at
        FROM notes
        WHERE id = ${noteId} AND content_vector IS NOT NULL
      `;

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      // 解析向量字符串
      const vectorString = row.content_vector.replace(/[\[\]]/g, '');
      const vector = vectorString.split(',').map(Number);

      return {
        id: row.id,
        noteId: row.id,
        vector,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error getting vector:', error);
      throw new Error(`Failed to get vector for note ${noteId}: ${error}`);
    }
  }

  // 向量搜索 - 安全的参数化查询实现
  async searchSimilar(
    queryVector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const {
        limit = 10,
        threshold = 0.7,
        includeMetadata = true,
        filterCategories,
        filterTags,
        dateRange
      } = options;

      const config = this.config.getConfig();

      // 验证输入参数
      this.validateSearchInputs(queryVector, config, limit, threshold);

      // 设置搜索参数（针对HNSW索引）
      if (config.indexType === 'hnsw' && config.efSearch) {
        await this.prisma.$executeRaw`SET hnsw.ef_search = ${config.efSearch}`;
      }

      // 根据距离度量类型构建查询
      let results;
      switch (config.distanceMetric) {
        case 'cosine':
          results = await this.searchWithCosineSimilarity(
            queryVector, limit, filterCategories, filterTags, dateRange
          );
          break;
        case 'l2':
          results = await this.searchWithL2Distance(
            queryVector, limit, filterCategories, filterTags, dateRange
          );
          break;
        case 'innerproduct':
          results = await this.searchWithInnerProduct(
            queryVector, limit, filterCategories, filterTags, dateRange
          );
          break;
        default:
          results = await this.searchWithCosineSimilarity(
            queryVector, limit, filterCategories, filterTags, dateRange
          );
      }

      // 过滤结果并格式化
      return results
        .filter(result => result.similarity >= threshold)
        .map(result => ({
          noteId: result.note_id,
          similarity: result.similarity,
          note: includeMetadata ? {
            id: result.note_id,
            title: result.title,
            summary: result.ai_summary || undefined,
            category: result.ai_category || undefined,
            tags: result.ai_tags || [],
          } : undefined,
        }));

    } catch (error) {
      console.error('Error searching similar vectors:', error);
      throw new Error(`Failed to search similar vectors: ${error}`);
    }
  }

  // 输入验证
  private validateSearchInputs(
    queryVector: number[],
    config: any,
    limit: number,
    threshold: number
  ): void {
    if (queryVector.length !== config.dimensions) {
      throw new Error(
        `Query vector dimension mismatch: expected ${config.dimensions}, got ${queryVector.length}`
      );
    }

    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }

    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }

    // 检查向量值是否为有效数字
    for (const value of queryVector) {
      if (typeof value !== 'number' || !isFinite(value)) {
        throw new Error('Vector must contain only finite numbers');
      }
    }
  }

  // 余弦相似度搜索
  private async searchWithCosineSimilarity(
    queryVector: number[],
    limit: number,
    filterCategories?: string[],
    filterTags?: string[],
    dateRange?: { start: Date; end: Date }
  ) {
    const vectorString = `[${queryVector.join(',')}]`;

    let query = this.prisma.$queryRaw<Array<{
      note_id: string;
      similarity: number;
      title: string;
      ai_summary: string | null;
      ai_category: string;
      ai_tags: string[];
      created_at: Date;
      updated_at: Date;
    }>>`
      SELECT
        n.id as note_id,
        (1 - (n.content_vector <=> ${vectorString}::vector)) as similarity,
        n.title,
        n.ai_summary,
        n.ai_category,
        n.ai_tags,
        n.created_at,
        n.updated_at
      FROM notes n
      WHERE n.content_vector IS NOT NULL
        ${filterCategories && filterCategories.length > 0
          ? Prisma.sql`AND n.ai_category = ANY(${filterCategories})`
          : Prisma.empty}
        ${filterTags && filterTags.length > 0
          ? Prisma.sql`AND n.ai_tags && ${filterTags}`
          : Prisma.empty}
        ${dateRange
          ? Prisma.sql`AND n.created_at BETWEEN ${dateRange.start} AND ${dateRange.end}`
          : Prisma.empty}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return query;
  }

  // L2距离搜索
  private async searchWithL2Distance(
    queryVector: number[],
    limit: number,
    filterCategories?: string[],
    filterTags?: string[],
    dateRange?: { start: Date; end: Date }
  ) {
    const vectorString = `[${queryVector.join(',')}]`;

    return this.prisma.$queryRaw<Array<{
      note_id: string;
      similarity: number;
      title: string;
      ai_summary: string | null;
      ai_category: string;
      ai_tags: string[];
      created_at: Date;
      updated_at: Date;
    }>>`
      SELECT
        n.id as note_id,
        (n.content_vector <-> ${vectorString}::vector) as similarity,
        n.title,
        n.ai_summary,
        n.ai_category,
        n.ai_tags,
        n.created_at,
        n.updated_at
      FROM notes n
      WHERE n.content_vector IS NOT NULL
        ${filterCategories && filterCategories.length > 0
          ? Prisma.sql`AND n.ai_category = ANY(${filterCategories})`
          : Prisma.empty}
        ${filterTags && filterTags.length > 0
          ? Prisma.sql`AND n.ai_tags && ${filterTags}`
          : Prisma.empty}
        ${dateRange
          ? Prisma.sql`AND n.created_at BETWEEN ${dateRange.start} AND ${dateRange.end}`
          : Prisma.empty}
      ORDER BY similarity ASC
      LIMIT ${limit}
    `;
  }

  // 内积搜索
  private async searchWithInnerProduct(
    queryVector: number[],
    limit: number,
    filterCategories?: string[],
    filterTags?: string[],
    dateRange?: { start: Date; end: Date }
  ) {
    const vectorString = `[${queryVector.join(',')}]`;

    return this.prisma.$queryRaw<Array<{
      note_id: string;
      similarity: number;
      title: string;
      ai_summary: string | null;
      ai_category: string;
      ai_tags: string[];
      created_at: Date;
      updated_at: Date;
    }>>`
      SELECT
        n.id as note_id,
        -(n.content_vector <#> ${vectorString}::vector) as similarity,
        n.title,
        n.ai_summary,
        n.ai_category,
        n.ai_tags,
        n.created_at,
        n.updated_at
      FROM notes n
      WHERE n.content_vector IS NOT NULL
        ${filterCategories && filterCategories.length > 0
          ? Prisma.sql`AND n.ai_category = ANY(${filterCategories})`
          : Prisma.empty}
        ${filterTags && filterTags.length > 0
          ? Prisma.sql`AND n.ai_tags && ${filterTags}`
          : Prisma.empty}
        ${dateRange
          ? Prisma.sql`AND n.created_at BETWEEN ${dateRange.start} AND ${dateRange.end}`
          : Prisma.empty}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;
  }

  // 批量操作
  async batchOperations(operations: VectorBatchOperation[]): Promise<void> {
    const transaction = await this.prisma.$transaction();

    try {
      for (const operation of operations) {
        switch (operation.operation) {
          case 'insert':
          case 'update':
            if (operation.vector) {
              await this.storeVector(operation.noteId, operation.vector, operation.metadata);
            }
            break;

          case 'delete':
            await this.deleteVector(operation.noteId);
            break;
        }
      }

      await transaction.commit();
      console.log(`Batch operations completed: ${operations.length} operations`);
    } catch (error) {
      await transaction.rollback();
      console.error('Error in batch operations:', error);
      throw new Error(`Failed to execute batch operations: ${error}`);
    }
  }

  // 创建索引
  async createIndex(config?: VectorStorageConfig): Promise<void> {
    try {
      if (config) {
        this.config.updateConfig(config);
      }

      const currentConfig = this.config.getConfig();
      const indexName = 'idx_content_vector_hnsw';
      const sql = this.config.getCreateIndexSQL(indexName);

      await this.prisma.$executeRawUnsafe(sql);
      console.log(`Vector index created: ${indexName}`);
    } catch (error) {
      console.error('Error creating vector index:', error);
      throw new Error(`Failed to create vector index: ${error}`);
    }
  }

  // 优化索引
  async optimizeIndex(): Promise<void> {
    try {
      const indexName = 'idx_content_vector_hnsw';
      const sql = this.config.getOptimizeIndexSQL(indexName);

      await this.prisma.$executeRawUnsafe(sql);
      console.log(`Vector index optimized: ${indexName}`);
    } catch (error) {
      console.error('Error optimizing vector index:', error);
      throw new Error(`Failed to optimize vector index: ${error}`);
    }
  }

  // 重建索引
  async rebuildIndex(): Promise<void> {
    try {
      const indexName = 'idx_content_vector_hnsw';

      // 删除现有索引
      await this.prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS ${indexName}`);

      // 重新创建索引
      await this.createIndex();

      console.log(`Vector index rebuilt: ${indexName}`);
    } catch (error) {
      console.error('Error rebuilding vector index:', error);
      throw new Error(`Failed to rebuild vector index: ${error}`);
    }
  }

  // 获取统计信息
  async getStats(): Promise<VectorStorageStats> {
    try {
      // 获取总向量数量
      const vectorCountResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM notes
        WHERE content_vector IS NOT NULL
      `;
      const totalVectors = Number(vectorCountResult[0].count);

      // 获取总笔记数量
      const notesCountResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM notes
      `;
      const totalNotes = Number(notesCountResult[0].count);

      // 获取索引统计信息
      const indexStatsResult = await this.prisma.$queryRaw<Array<{
        indexname: string;
        indexdef: string;
      }>>`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'notes' AND indexname LIKE '%vector%'
      `;

      const indexStats: VectorIndexStats[] = indexStatsResult.map(row => ({
        indexName: row.indexname,
        indexType: row.indexdef.includes('hnsw') ? 'hnsw' : 'ivfflat',
        totalVectors,
        indexSize: 'Unknown', // 需要额外的查询来获取大小
        buildTime: 0, // 需要额外的查询来获取构建时间
        lastOptimized: new Date(),
      }));

      return {
        totalVectors,
        totalNotes,
        indexStats,
        averageQueryTime: 0, // 需要实际监控数据
        queriesPerSecond: 0, // 需要实际监控数据
      };
    } catch (error) {
      console.error('Error getting vector storage stats:', error);
      throw new Error(`Failed to get vector storage stats: ${error}`);
    }
  }

  // 健康检查
  async checkHealth(): Promise<boolean> {
    try {
      // 检查数据库连接
      await this.prisma.$queryRaw`SELECT 1`;

      // 检查向量扩展
      const extensionResult = await this.prisma.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname = 'vector'
      `;
      if (extensionResult.length === 0) {
        throw new Error('pgvector extension not found');
      }

      // 检查向量索引
      const indexResult = await this.prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'notes' AND indexname LIKE '%vector%'
        LIMIT 1
      `;
      if (indexResult.length === 0) {
        console.warn('No vector index found');
      }

      // 执行一个简单的向量查询测试
      await this.prisma.$queryRaw`
        SELECT COUNT(*) FROM notes WHERE content_vector IS NOT NULL LIMIT 1
      `;

      return true;
    } catch (error) {
      console.error('Vector storage health check failed:', error);
      return false;
    }
  }
}

// 工厂函数
export function createVectorStorage(prisma: PrismaClient): VectorStorageProvider {
  return new PostgreSQLVectorStorage(prisma);
}