/**
 * 向量存储服务测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VectorStorageService } from '../vector-storage';
import { vectorConfig, VectorConfigManager } from '../vector-config';

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    note: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  })),
}));

describe('VectorStorageService', () => {
  let vectorStorage: VectorStorageService;

  beforeEach(() => {
    vectorStorage = new VectorStorageService();
  });

  afterEach(async () => {
    await vectorStorage.disconnect();
  });

  describe('向量存储功能', () => {
    it('应该能够存储向量', async () => {
      const noteId = 'test-note-1';
      const vector = Array.from({ length: 1536 }, () => Math.random());
      const metadata = { test: true };

      const mockExecuteRaw = vi.mocked(vectorStorage['prisma'].$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      const result = await vectorStorage.storeVector(noteId, vector, metadata);

      expect(result).toBe(true);
      expect(mockExecuteRaw).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notes')
      );
    });

    it('应该拒绝维度不正确的向量', async () => {
      const noteId = 'test-note-1';
      const invalidVector = Array.from({ length: 100 }, () => Math.random());

      await expect(vectorStorage.storeVector(noteId, invalidVector))
        .rejects.toThrow('Invalid vector dimensions');
    });

    it('应该能够批量存储向量', async () => {
      const vectors = [
        { noteId: 'note-1', vector: Array.from({ length: 1536 }, () => Math.random()) },
        { noteId: 'note-2', vector: Array.from({ length: 1536 }, () => Math.random()) },
      ];

      const mockExecuteRaw = vi.mocked(vectorStorage['prisma'].$executeRaw);
      mockExecuteRaw.mockResolvedValue(1);

      const result = await vectorStorage.storeVectors(vectors);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('相似性搜索功能', () => {
    it('应该能够执行相似性搜索', async () => {
      const queryVector = Array.from({ length: 1536 }, () => Math.random());
      const mockResults = [
        {
          id: 'note-1',
          title: 'Test Note 1',
          content: 'Test content 1',
          distance: 0.1,
          similarity: 0.9,
          metadata: null,
        },
      ];

      const mockQueryRaw = vi.mocked(vectorStorage['prisma'].$queryRawUnsafe);
      mockQueryRaw.mockResolvedValue(mockResults);

      const results = await vectorStorage.similaritySearch(queryVector);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('note-1');
      expect(results[0].similarity).toBe(0.9);
    });

    it('应该使用缓存来提高性能', async () => {
      const queryVector = Array.from({ length: 1536 }, () => Math.random());
      const mockResults = [
        {
          id: 'note-1',
          title: 'Test Note 1',
          content: 'Test content 1',
          distance: 0.1,
          similarity: 0.9,
          metadata: null,
        },
      ];

      const mockQueryRaw = vi.mocked(vectorStorage['prisma'].$queryRawUnsafe);
      mockQueryRaw.mockResolvedValue(mockResults);

      // 第一次搜索
      await vectorStorage.similaritySearch(queryVector);
      // 第二次搜索应该使用缓存
      await vectorStorage.similaritySearch(queryVector);

      // 应该只调用一次数据库查询
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });

    it('应该能够执行混合搜索', async () => {
      const keywords = 'test';
      const queryVector = Array.from({ length: 1536 }, () => Math.random());

      const mockNoteResults = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Test content',
          metadata: null,
        },
      ];

      const mockVectorResults = [
        {
          id: 'note-2',
          title: 'Vector Note',
          content: 'Vector content',
          distance: 0.2,
          similarity: 0.8,
          metadata: null,
        },
      ];

      const mockFindMany = vi.mocked(vectorStorage['prisma'].note.findMany);
      const mockQueryRaw = vi.mocked(vectorStorage['prisma'].$queryRawUnsafe);

      mockFindMany.mockResolvedValue(mockNoteResults);
      mockQueryRaw.mockResolvedValue(mockVectorResults);

      const results = await vectorStorage.hybridSearch(keywords, queryVector);

      expect(results).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalled();
      expect(mockQueryRaw).toHaveBeenCalled();
    });
  });

  describe('缓存管理', () => {
    it('应该能够生成缓存键', () => {
      const vector = Array.from({ length: 1536 }, (_, i) => i);

      // 通过反射访问私有方法来测试
      const cacheKey = (vectorStorage as any).generateCacheKey(vector, 10, 0.7);

      expect(cacheKey).toContain('0_1_2_3_4_5_6_7_8_9');
      expect(cacheKey).toContain('10_0.7');
    });

    it('应该能够清理过期缓存', async () => {
      // 添加一些缓存数据
      const queryVector = Array.from({ length: 1536 }, () => Math.random());
      const mockResults = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Test content',
          distance: 0.1,
          similarity: 0.9,
          metadata: null,
        },
      ];

      const mockQueryRaw = vi.mocked(vectorStorage['prisma'].$queryRawUnsafe);
      mockQueryRaw.mockResolvedValue(mockResults);

      await vectorStorage.similaritySearch(queryVector);

      // 手动设置过期时间
      const cache = (vectorStorage as any).cache;
      const cacheKey = Array.from(cache.keys())[0];
      if (cacheKey) {
        cache.set(cacheKey, {
          data: cache.get(cacheKey).data,
          timestamp: Date.now() - 400000, // 设置为超过缓存超时时间
        });
      }

      // 执行下一次搜索，应该清理过期缓存
      await vectorStorage.similaritySearch(queryVector);

      expect(mockQueryRaw).toHaveBeenCalledTimes(2); // 应该重新查询数据库
    });
  });

  describe('统计信息', () => {
    it('应该能够获取存储统计信息', async () => {
      const mockStats = [
        {
          total_vectors: 100,
          vectors_with_data: 80,
          table_size: '10 MB',
          index_size: '2 MB',
        },
      ];

      const mockQueryRaw = vi.mocked(vectorStorage['prisma'].$queryRaw);
      mockQueryRaw.mockResolvedValue(mockStats);

      const stats = await vectorStorage.getStats();

      expect(stats).toEqual(mockStats[0]);
      expect(stats.total_vectors).toBe(100);
      expect(stats.vectors_with_data).toBe(80);
    });

    it('应该能够删除向量', async () => {
      const noteId = 'test-note-1';

      const mockUpdate = vi.mocked(vectorStorage['prisma'].note.update);
      mockUpdate.mockResolvedValue({});

      const result = await vectorStorage.deleteVector(noteId);

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: noteId },
        data: {
          contentVector: null,
          aiProcessed: false,
        },
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      const queryVector = Array.from({ length: 1536 }, () => Math.random());

      const mockQueryRaw = vi.mocked(vectorStorage['prisma'].$queryRawUnsafe);
      mockQueryRaw.mockRejectedValue(new Error('Database connection failed'));

      await expect(vectorStorage.similaritySearch(queryVector))
        .rejects.toThrow('Database connection failed');
    });

    it('应该处理无效的查询向量', async () => {
      const invalidVector = [1, 2, 3]; // 维度不正确

      await expect(vectorStorage.similaritySearch(invalidVector))
        .rejects.toThrow('Invalid query vector dimensions');
    });
  });
});

describe('VectorConfigManager', () => {
  it('应该能够获取默认配置', () => {
    const config = vectorConfig.getConfig();

    expect(config.dimensions).toBe(1536);
    expect(config.indexType).toBe('hnsw');
    expect(config.distanceFunction).toBe('cosine');
  });

  it('应该能够更新配置', () => {
    const newConfig = {
      dimensions: 768,
      indexType: 'ivfflat' as const,
    };

    vectorConfig.updateConfig(newConfig);
    const updatedConfig = vectorConfig.getConfig();

    expect(updatedConfig.dimensions).toBe(768);
    expect(updatedConfig.indexType).toBe('ivfflat');
  });

  it('应该能够根据数据集大小推荐配置', () => {
    const smallDatasetConfig = vectorConfig.getRecommendedConfig(500);
    expect(smallDatasetConfig.indexType).toBe('ivfflat');

    const largeDatasetConfig = vectorConfig.getRecommendedConfig(1000000);
    expect(largeDatasetConfig.indexType).toBe('hnsw');
    expect(largeDatasetConfig.hnswParams?.m).toBe(32);
  });

  it('应该能够生成索引SQL', () => {
    const sql = vectorConfig.generateIndexSQL('notes', 'content_vector');

    expect(sql).toContain('CREATE INDEX');
    expect(sql).toContain('notes');
    expect(sql).toContain('content_vector');
  });

  it('应该能够生成搜索SQL', () => {
    const queryVector = Array.from({ length: 1536 }, () => Math.random());
    const sql = vectorConfig.generateSearchSQL('notes', 'content_vector', queryVector, 10, 0.7);

    expect(sql).toContain('SELECT');
    expect(sql).toContain('notes');
    expect(sql).toContain('ORDER BY');
    expect(sql).toContain('LIMIT 10');
  });

  it('应该能够验证向量维度', () => {
    const validVector = Array.from({ length: 1536 }, () => Math.random());
    const invalidVector = Array.from({ length: 100 }, () => Math.random());

    expect(vectorConfig.validateVectorDimensions(validVector)).toBe(true);
    expect(vectorConfig.validateVectorDimensions(invalidVector)).toBe(false);
  });
});

describe('向量计算工具函数', () => {
  it('应该能够计算余弦相似度', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    const vec3 = [1, 0, 0];

    const similarity12 = VectorConfigManager.calculateCosineSimilarity(vec1, vec2);
    const similarity13 = VectorConfigManager.calculateCosineSimilarity(vec1, vec3);

    expect(similarity12).toBe(0); // 正交向量
    expect(similarity13).toBe(1); // 相同向量
  });

  it('应该能够归一化向量', () => {
    const vector = [3, 4];
    const normalized = VectorConfigManager.normalizeVector(vector);

    const norm = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));
    expect(norm).toBeCloseTo(1, 10);
  });

  it('应该处理零向量', () => {
    const zeroVector = [0, 0, 0];
    const normalized = VectorConfigManager.normalizeVector(zeroVector);

    expect(normalized).toEqual(zeroVector);
  });
});