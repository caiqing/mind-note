/**
 * 向量搜索服务
 *
 * 基于向量相似度的高级搜索功能
 */

import { PrismaClient } from '@prisma/client';
import {
  VectorEmbeddingService,
  type SimilaritySearchRequest,
  type SimilaritySearchResult,
} from '@/lib/ai/vector-embeddings';

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  includeContent?: boolean;
  boostRecent?: boolean;
  weightDecayDays?: number;
  searchMode?: 'cosine' | 'euclidean' | 'hybrid';
}

export interface SearchIndexConfig {
  indexType: 'hnsw' | 'ivfflat' | 'exact';
  dimensions: number;
  efConstruction?: number;
  efSearch?: number;
  lists?: number;
}

export interface SearchResultEnhanced {
  id: string;
  title: string;
  content: string;
  snippet: string;
  similarity: number;
  distance: number;
  relevanceScore: number;
  category?: {
    id: number;
    name: string;
    color: string;
  };
  tags: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  aiSummary?: string;
  aiKeywords: string[];
  highlights: string[];
}

export interface VectorSearchStats {
  totalIndexed: number;
  averageDimension: number;
  indexSize: number;
  searchCount: number;
  averageSearchTime: number;
  cacheHitRate: number;
}

/**
 * 向量搜索服务类
 */
export class VectorSearchService {
  private prisma: PrismaClient;
  private embeddingService: VectorEmbeddingService;
  private searchCache: Map<string, SearchResultEnhanced[]> = new Map();
  private indexConfig: SearchIndexConfig;
  private stats: VectorSearchStats;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.embeddingService = new VectorEmbeddingService();
    this.indexConfig = {
      indexType: 'hnsw',
      dimensions: 1536,
      efConstruction: 200,
      efSearch: 50,
      lists: 100,
    };
    this.stats = {
      totalIndexed: 0,
      averageDimension: 1536,
      indexSize: 0,
      searchCount: 0,
      averageSearchTime: 0,
      cacheHitRate: 0,
    };
  }

  /**
   * 构建向量搜索索引
   */
  async buildIndex(): Promise<void> {
    console.log('Building vector search index...');

    try {
      // 1. 获取所有有向量嵌入的笔记
      const notesWithEmbeddings = await this.prisma.note.findMany({
        where: {
          contentVector: {
            not: null,
          },
        },
        select: {
          id: true,
          contentVector: true,
          title: true,
          content: true,
        },
      });

      console.log(`Found ${notesWithEmbeddings.length} notes with embeddings`);

      // 2. 验证和标准化向量
      const validNotes = notesWithEmbeddings.filter(note => {
        if (!note.contentVector) {
          return false;
        }

        try {
          const vector = JSON.parse(note.contentVector as string);
          return this.embeddingService.validateVector(vector);
        } catch (error) {
          console.error(`Invalid vector for note ${note.id}:`, error);
          return false;
        }
      });

      console.log(`${validNotes.length} notes have valid embeddings`);

      // 3. 更新统计信息
      this.stats.totalIndexed = validNotes.length;
      this.stats.indexSize = validNotes.reduce((size, note) => {
        const vector = JSON.parse(note.contentVector as string);
        return size + vector.length * 8; // 假设每个float64占用8字节
      }, 0);

      console.log('Vector search index built successfully');
    } catch (error) {
      console.error('Error building vector search index:', error);
      throw error;
    }
  }

  /**
   * 执行向量相似度搜索
   */
  async similaritySearch(
    query: string,
    options: VectorSearchOptions = {},
  ): Promise<SimilaritySearchResult> {
    const startTime = Date.now();
    const {
      limit = 10,
      threshold = 0.7,
      includeContent = false,
      boostRecent = true,
      weightDecayDays = 30,
      searchMode = 'cosine',
    } = options;

    try {
      // 1. 生成查询向量
      const embeddingResponse = await this.embeddingService.generateEmbedding({
        content: query,
        dimensions: this.indexConfig.dimensions,
      });

      if (!embeddingResponse.success) {
        throw new Error(
          `Failed to generate query embedding: ${embeddingResponse.error}`,
        );
      }

      const queryEmbedding = embeddingResponse.embedding;

      // 2. 检查缓存
      const cacheKey = this.generateCacheKey(query, options);
      if (this.searchCache.has(cacheKey)) {
        const cachedResults = this.searchCache.get(cacheKey)!;
        return this.formatSearchResults(
          cachedResults,
          queryEmbedding,
          Date.now() - startTime,
        );
      }

      // 3. 执行向量搜索
      const searchResults = await this.performVectorSearch(queryEmbedding, {
        limit,
        threshold,
        includeContent,
        boostRecent,
        weightDecayDays,
        searchMode,
      });

      const searchTime = Date.now() - startTime;

      // 4. 更新统计信息
      this.updateSearchStats(searchTime);

      // 5. 缓存结果
      this.searchCache.set(cacheKey, searchResults);

      return this.formatSearchResults(
        searchResults,
        queryEmbedding,
        searchTime,
      );
    } catch (error) {
      console.error('Error performing similarity search:', error);
      throw error;
    }
  }

  /**
   * 混合搜索（文本 + 向量）
   */
  async hybridSearch(
    textQuery: string,
    options: VectorSearchOptions & {
      textWeight?: number;
      vectorWeight?: number;
    } = {},
  ): Promise<SimilaritySearchResult> {
    const { textWeight = 0.3, vectorWeight = 0.7, ...vectorOptions } = options;

    try {
      // 1. 执行文本搜索
      const textResults = await this.performTextSearch(
        textQuery,
        vectorOptions,
      );

      // 2. 执行向量搜索
      const vectorResults = await this.similaritySearch(
        textQuery,
        vectorOptions,
      );

      // 3. 合并和重排序结果
      const combinedResults = this.combineSearchResults(
        textResults,
        vectorResults,
        textWeight,
        vectorWeight,
      );

      return combinedResults;
    } catch (error) {
      console.error('Error performing hybrid search:', error);
      throw error;
    }
  }

  /**
   * 为笔记生成向量嵌入
   */
  async generateEmbeddingForNote(noteId: string): Promise<void> {
    try {
      // 1. 获取笔记内容
      const note = await this.prisma.note.findUnique({
        where: { id: noteId },
        select: { title: true, content: true },
      });

      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      // 2. 生成嵌入
      const combinedContent = `${note.title}\n\n${note.content}`;
      const embeddingResponse = await this.embeddingService.generateEmbedding({
        content: combinedContent,
        dimensions: this.indexConfig.dimensions,
      });

      if (!embeddingResponse.success) {
        throw new Error(
          `Failed to generate embedding: ${embeddingResponse.error}`,
        );
      }

      // 3. 保存嵌入到数据库
      await this.prisma.note.update({
        where: { id: noteId },
        data: {
          contentVector: JSON.stringify(embeddingResponse.embedding),
        },
      });

      console.log(`Generated embedding for note ${noteId}`);
    } catch (error) {
      console.error(`Error generating embedding for note ${noteId}:`, error);
      throw error;
    }
  }

  /**
   * 批量生成向量嵌入
   */
  async generateBatchEmbeddings(noteIds: string[]): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    console.log(`Generating embeddings for ${noteIds.length} notes`);

    // 分批处理
    const batchSize = 5;
    for (let i = 0; i < noteIds.length; i += batchSize) {
      const batch = noteIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async noteId => {
        try {
          await this.generateEmbeddingForNote(noteId);
          return { id: noteId, success: true };
        } catch (error) {
          return {
            id: noteId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(result => {
        if (result.success) {
          successful.push(result.id);
        } else {
          failed.push({ id: result.id, error: result.error });
        }
      });

      // 添加延迟以避免速率限制
      if (i + batchSize < noteIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `Batch embedding generation completed: ${successful.length} successful, ${failed.length} failed`,
    );

    return { successful, failed };
  }

  /**
   * 更新笔记的向量嵌入
   */
  async updateNoteEmbedding(noteId: string): Promise<void> {
    try {
      // 检查笔记是否存在
      const note = await this.prisma.note.findUnique({
        where: { id: noteId },
      });

      if (!note) {
        throw new Error(`Note ${noteId} not found`);
      }

      // 重新生成嵌入
      await this.generateEmbeddingForNote(noteId);
    } catch (error) {
      console.error(`Error updating embedding for note ${noteId}:`, error);
      throw error;
    }
  }

  /**
   * 获取搜索统计信息
   */
  getSearchStats(): VectorSearchStats {
    return { ...this.stats };
  }

  /**
   * 清空搜索缓存
   */
  clearCache(): void {
    this.searchCache.clear();
  }

  /**
   * 重建索引
   */
  async rebuildIndex(): Promise<void> {
    console.log('Rebuilding vector search index...');

    this.clearCache();
    await this.buildIndex();

    console.log('Vector search index rebuilt successfully');
  }

  // 私有方法

  private async performVectorSearch(
    queryEmbedding: number[],
    options: VectorSearchOptions,
  ): Promise<SearchResultEnhanced[]> {
    const {
      limit = 10,
      threshold = 0.7,
      includeContent = false,
      boostRecent = true,
      weightDecayDays = 30,
      searchMode = 'cosine',
    } = options;

    // 1. 获取所有有嵌入的笔记
    const notes = await this.prisma.note.findMany({
      where: {
        contentVector: {
          not: null,
        },
      },
      include: {
        category: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    // 2. 计算相似度
    const results: SearchResultEnhanced[] = [];

    for (const note of notes) {
      try {
        const noteEmbedding = JSON.parse(note.contentVector as string);

        if (!this.embeddingService.validateVector(noteEmbedding)) {
          continue;
        }

        let similarity: number;
        let distance: number;

        switch (searchMode) {
        case 'cosine':
          similarity = this.embeddingService.calculateCosineSimilarity(
            queryEmbedding,
            noteEmbedding,
          );
          distance = 1 - similarity;
          break;
        case 'euclidean':
          distance = this.embeddingService.calculateEuclideanDistance(
            queryEmbedding,
            noteEmbedding,
          );
          similarity = 1 / (1 + distance);
          break;
        case 'hybrid':
          const cosineSim = this.embeddingService.calculateCosineSimilarity(
            queryEmbedding,
            noteEmbedding,
          );
          const euclDist = this.embeddingService.calculateEuclideanDistance(
            queryEmbedding,
            noteEmbedding,
          );
          similarity = (cosineSim + 1 / (1 + euclDist)) / 2;
          distance = 1 - similarity;
          break;
        default:
          similarity = this.embeddingService.calculateCosineSimilarity(
            queryEmbedding,
            noteEmbedding,
          );
          distance = 1 - similarity;
        }

        if (similarity < threshold) {
          continue;
        }

        // 时间衰减权重
        let timeWeight = 1;
        if (boostRecent) {
          const daysSinceCreation =
            (Date.now() - note.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          timeWeight = Math.exp(-daysSinceCreation / weightDecayDays);
        }

        const relevanceScore = similarity * timeWeight;

        const snippet = includeContent
          ? note.content.substring(0, 200) +
            (note.content.length > 200 ? '...' : '')
          : '';

        const highlights = this.generateHighlights(
          note.title + ' ' + note.content,
          queryEmbedding,
        );

        results.push({
          id: note.id,
          title: note.title,
          content: includeContent ? note.content : '',
          snippet,
          similarity,
          distance,
          relevanceScore,
          category: note.category
            ? {
              id: note.category.id,
              name: note.category.name,
              color: note.category.color || '',
            }
            : undefined,
          tags: note.tags.map(nt => ({
            id: nt.tag.id,
            name: nt.tag.name,
            color: nt.tag.color || '',
          })),
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          viewCount: note.viewCount,
          aiSummary: note.aiSummary || undefined,
          aiKeywords: note.aiKeywords,
          highlights,
        });
      } catch (error) {
        console.error(`Error processing note ${note.id}:`, error);
        continue;
      }
    }

    // 3. 排序并返回结果
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  private async performTextSearch(
    query: string,
    options: VectorSearchOptions,
  ): Promise<SimilaritySearchResult> {
    // 简化的文本搜索实现
    const { limit = 10 } = options;

    const notes = await this.prisma.note.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { aiSummary: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
      take: limit * 2, // 获取更多结果以便重排序
    });

    const results = notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      similarity: 0.5, // 简化的相似度
      distance: 0.5,
      category: note.category
        ? {
          id: note.category.id,
          name: note.category.name,
          color: note.category.color || '',
        }
        : undefined,
      tags: note.tags.map(nt => ({
        id: nt.tag.id,
        name: nt.tag.name,
        color: nt.tag.color || '',
      })),
      createdAt: note.createdAt,
    }));

    return {
      notes: results.slice(0, limit),
      totalFound: results.length,
      searchTime: 0,
      queryInfo: {
        dimensions: 0,
        threshold: 0.5,
        limit,
      },
    };
  }

  private combineSearchResults(
    textResults: SimilaritySearchResult,
    vectorResults: SimilaritySearchResult,
    textWeight: number,
    vectorWeight: number,
  ): SimilaritySearchResult {
    // 合并结果并重新评分
    const combinedNotes = new Map<string, any>();

    // 添加文本搜索结果
    textResults.notes.forEach(note => {
      combinedNotes.set(note.id, {
        ...note,
        textScore: note.similarity,
        vectorScore: 0,
        combinedScore: note.similarity * textWeight,
      });
    });

    // 添加向量搜索结果
    vectorResults.notes.forEach(note => {
      if (combinedNotes.has(note.id)) {
        const existing = combinedNotes.get(note.id);
        existing.vectorScore = note.similarity;
        existing.combinedScore += note.similarity * vectorWeight;
      } else {
        combinedNotes.set(note.id, {
          ...note,
          textScore: 0,
          vectorScore: note.similarity,
          combinedScore: note.similarity * vectorWeight,
        });
      }
    });

    // 排序并返回
    const sortedResults = Array.from(combinedNotes.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 10)
      .map(({ textScore, vectorScore, combinedScore, ...note }) => ({
        ...note,
        similarity: combinedScore,
        distance: 1 - combinedScore,
      }));

    return {
      notes: sortedResults,
      totalFound: combinedNotes.size,
      searchTime: textResults.searchTime + vectorResults.searchTime,
      queryInfo: {
        dimensions: vectorResults.queryInfo.dimensions,
        threshold: 0.5,
        limit: 10,
      },
    };
  }

  private formatSearchResults(
    results: SearchResultEnhanced[],
    queryEmbedding: number[],
    searchTime: number,
  ): SimilaritySearchResult {
    return {
      notes: results.map(result => ({
        id: result.id,
        title: result.title,
        content: result.content,
        similarity: result.similarity,
        distance: result.distance,
        category: result.category,
        tags: result.tags,
        createdAt: result.createdAt,
      })),
      totalFound: results.length,
      searchTime,
      queryInfo: {
        dimensions: queryEmbedding.length,
        threshold: 0.7,
        limit: results.length,
      },
    };
  }

  private generateCacheKey(
    query: string,
    options: VectorSearchOptions,
  ): string {
    const optionsStr = JSON.stringify(options);
    return `${query}:${optionsStr}`;
  }

  private updateSearchStats(searchTime: number): void {
    this.stats.searchCount++;
    this.stats.averageSearchTime =
      (this.stats.averageSearchTime * (this.stats.searchCount - 1) +
        searchTime) /
      this.stats.searchCount;

    // 计算缓存命中率
    const totalSearches = this.stats.searchCount;
    const cacheHits = totalSearches - this.searchCache.size; // 简化计算
    this.stats.cacheHitRate = cacheHits / totalSearches;
  }

  private generateHighlights(
    content: string,
    queryEmbedding: number[],
  ): string[] {
    // 简化的高亮生成
    const words = content.split(/\s+/).slice(0, 10);
    return words.map(word => word.trim()).filter(word => word.length > 0);
  }
}
