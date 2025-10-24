/**
 * 向量存储服务
 *
 * 提供向量数据的存储、检索和管理功能
 */

import { PrismaClient } from '@prisma/client';
import { vectorConfig, VectorConfig } from './vector-config';

export interface VectorSearchResult {
  id: string;
  content: string;
  title: string;
  distance: number;
  similarity?: number;
  metadata?: any;
}

export interface VectorStorageOptions {
  useCache?: boolean;
  cacheTimeout?: number;
  maxResults?: number;
  minSimilarity?: number;
}

export class VectorStorageService {
  private prisma: PrismaClient;
  private config: VectorConfig;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTimeout: number;

  constructor(options: VectorStorageOptions = {}) {
    this.prisma = new PrismaClient();
    this.config = vectorConfig.getConfig();
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5分钟
  }

  /**
   * 存储向量
   */
  public async storeVector(
    noteId: string,
    vector: number[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _metadata?: any
  ): Promise<boolean> {
    try {
      // 验证向量维度
      if (!vectorConfig.validateVectorDimensions(vector)) {
        throw new Error(`Invalid vector dimensions. Expected ${this.config.dimensions}, got ${vector.length}`);
      }

      // 归一化向量（如果使用余弦距离）
      let normalizedVector = vector;
      if (this.config.distanceFunction === 'cosine') {
        normalizedVector = vectorConfig.normalizeVector(vector);
      }

      await this.prisma.$executeRaw`
        UPDATE notes
        SET
          content_vector = ${normalizedVector}::vector,
          ai_processed = true,
          ai_processed_at = NOW(),
          metadata = COALESCE(metadata, metadata::jsonb)
        WHERE id = ${noteId}
      `;

      return true;
    } catch (error) {
      console.error('Error storing vector:', error);
      throw error;
    }
  }

  /**
   * 批量存储向量
   */
  public async storeVectors(
    vectors: Array<{ noteId: string; vector: number[]; metadata?: any }>
  ): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };

    for (const item of vectors) {
      try {
        await this.storeVector(item.noteId, item.vector, item.metadata);
        results.success++;
      } catch (error) {
        console.error(`Failed to store vector for note ${item.noteId}:`, error);
        results.failed++;
      }
    }

    return results;
  }

  /**
   * 相似性搜索
   */
  public async similaritySearch(
    queryVector: number[],
    options: VectorStorageOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const {
        maxResults = 10,
        minSimilarity = 0.7,
        useCache = true
      } = options;

      // 验证查询向量
      if (!vectorConfig.validateVectorDimensions(queryVector)) {
        throw new Error(`Invalid query vector dimensions. Expected ${this.config.dimensions}, got ${queryVector.length}`);
      }

      // 生成缓存键
      const cacheKey = this.generateCacheKey(queryVector, maxResults, minSimilarity);

      // 检查缓存
      if (useCache) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // 归一化查询向量（如果使用余弦距离）
      let normalizedQuery = queryVector;
      if (this.config.distanceFunction === 'cosine') {
        normalizedQuery = vectorConfig.normalizeVector(queryVector);
      }

      // 构建搜索查询
      const searchSQL = this.buildSearchQuery(normalizedQuery, maxResults, minSimilarity);

      // 执行搜索
      const results = await this.prisma.$queryRawUnsafe(searchSQL);

      // 处理结果
      const processedResults = this.processSearchResults(results, this.config.distanceFunction);

      // 缓存结果
      if (useCache) {
        this.setCache(cacheKey, processedResults);
      }

      return processedResults;
    } catch (error) {
      console.error('Error performing similarity search:', error);
      throw error;
    }
  }

  /**
   * 混合搜索（关键词 + 向量搜索）
   */
  public async hybridSearch(
    keywords: string,
    queryVector?: number[],
    options: VectorStorageOptions & { keywordWeight?: number; vectorWeight?: number } = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const {
        keywordWeight = 0.3,
        vectorWeight = 0.7,
        maxResults = 10
      } = options;

      // 关键词搜索
      const keywordResults = await this.keywordSearch(keywords, maxResults * 2);

      // 向量搜索
      let vectorResults: VectorSearchResult[] = [];
      if (queryVector) {
        vectorResults = await this.similaritySearch(queryVector, { ...options, maxResults: maxResults * 2 });
      }

      // 合并和重排序结果
      return this.combineSearchResults(keywordResults, vectorResults, keywordWeight, vectorWeight, maxResults);
    } catch (error) {
      console.error('Error performing hybrid search:', error);
      throw error;
    }
  }

  /**
   * 关键词搜索
   */
  private async keywordSearch(keywords: string, limit: number): Promise<VectorSearchResult[]> {
    const results = await this.prisma.note.findMany({
      where: {
        OR: [
          { title: { contains: keywords, mode: 'insensitive' } },
          { content: { contains: keywords, mode: 'insensitive' } },
          { aiSummary: { contains: keywords, mode: 'insensitive' } },
        ]
      },
      select: {
        id: true,
        title: true,
        content: true,
        metadata: true,
      },
      take: limit,
    });

    return results.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      distance: 0, // 关键词搜索的默认距离
      similarity: 1, // 关键词匹配的默认相似度
      metadata: note.metadata,
    }));
  }

  /**
   * 构建搜索查询
   */
  private buildSearchQuery(
    queryVector: number[],
    limit: number,
    minSimilarity: number
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ): string {
    const vectorStr = `[${queryVector.join(',')}]`;
    const threshold = 1 - minSimilarity;

    let distanceOperator: string;
    let orderByClause: string;

    switch (this.config.distanceFunction) {
      case 'cosine':
        distanceOperator = '<=>';
        orderByClause = 'ORDER BY distance ASC';
        break;
      case 'l2':
        distanceOperator = '<->';
        orderByClause = 'ORDER BY distance ASC';
        break;
      case 'ip':
        distanceOperator = '<#>';
        orderByClause = 'ORDER BY distance DESC';
        break;
      default:
        throw new Error(`Unsupported distance function: ${this.config.distanceFunction}`);
    }

    // 设置HNSW搜索参数
    const setSearchParams = this.config.indexType === 'hnsw' && this.config.hnswParams?.efSearch
      ? `SET hnsw.ef_search = ${this.config.hnswParams.efSearch};`
      : '';

    return `
      ${setSearchParams}
      SELECT
        id,
        title,
        content,
        metadata,
        (content_vector ${distanceOperator} '${vectorStr}'::vector) as distance,
        CASE
          WHEN content_vector ${distanceOperator} '${vectorStr}'::vector < ${threshold}
          THEN 1 - (content_vector ${distanceOperator} '${vectorStr}'::vector)
          ELSE 0
        END as similarity
      FROM notes
      WHERE content_vector IS NOT NULL
        AND ai_processed = true
        AND (content_vector ${distanceOperator} '${vectorStr}'::vector) < ${threshold}
      ${orderByClause}
      LIMIT ${limit};
    `;
  }

  /**
   * 处理搜索结果
   */
  private processSearchResults(results: any[], distanceFunction: string): VectorSearchResult[] {
    return results.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      distance: parseFloat(row.distance),
      similarity: parseFloat(row.similarity || row.distance),
      metadata: row.metadata,
    }));
  }

  /**
   * 合并搜索结果
   */
  private combineSearchResults(
    keywordResults: VectorSearchResult[],
    vectorResults: VectorSearchResult[],
    keywordWeight: number,
    vectorWeight: number,
    limit: number
  ): VectorSearchResult[] {
    const combinedScores = new Map<string, VectorSearchResult>();

    // 处理关键词结果
    keywordResults.forEach(result => {
      combinedScores.set(result.id, {
        ...result,
        similarity: (result.similarity || 0) * keywordWeight,
      });
    });

    // 处理向量结果
    vectorResults.forEach(result => {
      const existing = combinedScores.get(result.id);
      if (existing) {
        // 合并分数
        existing.similarity += (result.similarity || 0) * vectorWeight;
        existing.distance = Math.min(existing.distance, result.distance);
      } else {
        combinedScores.set(result.id, {
          ...result,
          similarity: (result.similarity || 0) * vectorWeight,
        });
      }
    });

    // 排序并返回前N个结果
    return Array.from(combinedScores.values())
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);
  }

  /**
   * 缓存管理
   */
  private generateCacheKey(vector: number[], limit: number, minSimilarity: number): string {
    const vectorHash = vector.slice(0, 10).join(','); // 使用前10个维度作为哈希
    return `${vectorHash}_${limit}_${minSimilarity}`;
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // 清理过期缓存
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 删除向量
   */
  public async deleteVector(noteId: string): Promise<boolean> {
    try {
      await this.prisma.note.update({
        where: { id: noteId },
        data: {
          contentVector: null,
          aiProcessed: false,
        },
      });
      return true;
    } catch (error) {
      console.error('Error deleting vector:', error);
      return false;
    }
  }

  /**
   * 获取存储统计信息
   */
  public async getStats(): Promise<any> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT
          COUNT(*) as total_vectors,
          COUNT(CASE WHEN content_vector IS NOT NULL THEN 1 END) as vectors_with_data,
          pg_size_pretty(pg_total_relation_size('notes')) as table_size,
          pg_size_pretty(pg_relation_size('idx_content_vector_hnsw')) as index_size
        FROM notes
      `;

      return stats[0];
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  /**
   * 清理资源
   */
  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    this.cache.clear();
  }
}

// 导出单例实例
export const vectorStorage = new VectorStorageService();