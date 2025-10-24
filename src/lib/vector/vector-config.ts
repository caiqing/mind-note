/**
 * 向量存储配置模块
 *
 * 提供pgvector的配置管理和连接优化
 */

export interface VectorConfig {
  dimensions: number;
  indexType: 'hnsw' | 'ivfflat';
  distanceFunction: 'cosine' | 'l2' | 'ip';
  hnswParams?: {
    m: number;
    efConstruction: number;
    efSearch?: number;
  };
  ivfflatParams?: {
    lists: number;
    probes?: number;
  };
}

export interface VectorStorageStats {
  totalVectors: number;
  indexSize: string;
  averageQueryTime: number;
  cacheHitRate: number;
  dimension: number;
}

export class VectorConfigManager {
  private static instance: VectorConfigManager;
  private config: VectorConfig;
  private connectionPool: any;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): VectorConfigManager {
    if (!VectorConfigManager.instance) {
      VectorConfigManager.instance = new VectorConfigManager();
    }
    return VectorConfigManager.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): VectorConfig {
    return {
      dimensions: 1536, // OpenAI text-embedding-3-small的维度
      indexType: 'hnsw', // 默认使用HNSW索引，适合大多数场景
      distanceFunction: 'cosine', // 余弦距离，适合文本语义搜索
      hnswParams: {
        m: 16, // 连接数，影响内存使用和构建时间
        efConstruction: 64, // 构建时的候选数量，影响索引质量
        efSearch: 40, // 搜索时的候选数量，影响召回率和速度
      },
      ivfflatParams: {
        lists: 100, // 聚类数量，适合小数据集
        probes: 10, // 搜索时检查的聚类数量
      },
    };
  }

  /**
   * 获取当前配置
   */
  public getConfig(): VectorConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<VectorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 根据数据集大小推荐最佳配置
   */
  public getRecommendedConfig(datasetSize: number): VectorConfig {
    if (datasetSize < 1000) {
      // 小数据集：使用IVFFlat索引
      return {
        ...this.config,
        indexType: 'ivfflat',
        ivfflatParams: {
          lists: Math.min(datasetSize / 10, 100),
          probes: Math.min(10, datasetSize),
        },
      };
    } else if (datasetSize < 100000) {
      // 中等数据集：使用HNSW索引，中等参数
      return {
        ...this.config,
        indexType: 'hnsw',
        hnswParams: {
          m: 16,
          efConstruction: 64,
          efSearch: 40,
        },
      };
    } else {
      // 大数据集：使用HNSW索引，高性能参数
      return {
        ...this.config,
        indexType: 'hnsw',
        hnswParams: {
          m: 32,
          efConstruction: 128,
          efSearch: 64,
        },
      };
    }
  }

  /**
   * 生成向量索引创建SQL
   */
  public generateIndexSQL(tableName: string = 'notes', columnName: string = 'content_vector'): string {
    const { indexType, distanceFunction, hnswParams, ivfflatParams } = this.config;

    const indexName = `idx_${tableName}_${columnName}_${indexType}`;
    const vectorOps = `${columnName} vector_${distanceFunction}_ops`;

    if (indexType === 'hnsw') {
      const params = hnswParams!;
      return `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
ON ${tableName} USING hnsw (${vectorOps})
WITH (m = ${params.m}, ef_construction = ${params.efConstruction});`;
    } else {
      const params = ivfflatParams!;
      return `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}
ON ${tableName} USING ivfflat (${vectorOps})
WITH (lists = ${params.lists});`;
    }
  }

  /**
   * 生成向量搜索查询SQL
   */
  public generateSearchSQL(
    tableName: string = 'notes',
    columnName: string = 'content_vector',
    queryVector: number[],
    limit: number = 10,
    threshold: number = 0.7
  ): string {
    const { distanceFunction, hnswParams } = this.config;

    let distanceOperator: string;
    let orderByClause: string;

    switch (distanceFunction) {
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
        throw new Error(`Unsupported distance function: ${distanceFunction}`);
    }

    // 设置ef_search参数（仅适用于HNSW）
    const setEfClause = this.config.indexType === 'hnsw' && hnswParams?.efSearch
      ? `SET hnsw.ef_search = ${hnswParams.efSearch};`
      : '';

    return `${setEfClause}
SELECT *, ${columnName} ${distanceOperator} '[${queryVector.join(',')}]'::vector as distance
FROM ${tableName}
WHERE ${columnName} IS NOT NULL
  AND (${columnName} ${distanceOperator} '[${queryVector.join(',')}]'::vector) < ${1 - threshold}
${orderByClause}
LIMIT ${limit};`;
  }

  /**
   * 验证向量维度
   */
  public validateVectorDimensions(vector: number[]): boolean {
    return Array.isArray(vector) &&
           vector.length === this.config.dimensions &&
           vector.every(v => typeof v === 'number' && !isNaN(v));
  }

  /**
   * 计算向量相似度
   */
  public static calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 归一化向量（用于余弦相似度）
   */
  public static normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

    if (norm === 0) {
      return vector;
    }

    return vector.map(val => val / norm);
  }

  /**
   * 获取存储统计信息
   */
  public async getStorageStats(): Promise<VectorStorageStats> {
    // 这里应该连接到数据库获取实际统计信息
    // 暂时返回模拟数据
    return {
      totalVectors: 0,
      indexSize: '0 kB',
      averageQueryTime: 0,
      cacheHitRate: 0,
      dimension: this.config.dimensions,
    };
  }
}

// 导出单例实例
export const vectorConfig = VectorConfigManager.getInstance();