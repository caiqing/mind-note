import { VectorStorageConfig, DEFAULT_VECTOR_CONFIG } from '@/types/vector';

// 向量存储配置管理
export class VectorConfig {
  private static instance: VectorConfig;
  private config: VectorStorageConfig;

  private constructor() {
    this.config = { ...DEFAULT_VECTOR_CONFIG };
  }

  public static getInstance(): VectorConfig {
    if (!VectorConfig.instance) {
      VectorConfig.instance = new VectorConfig();
    }
    return VectorConfig.instance;
  }

  // 获取当前配置
  public getConfig(): VectorStorageConfig {
    return { ...this.config };
  }

  // 更新配置
  public updateConfig(newConfig: Partial<VectorStorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  // 验证配置
  private validateConfig(): void {
    const { dimensions, indexType, distanceMetric } = this.config;

    if (dimensions <= 0 || dimensions > 20000) {
      throw new Error(`Invalid vector dimensions: ${dimensions}. Must be between 1 and 20000`);
    }

    if (!['hnsw', 'ivfflat'].includes(indexType)) {
      throw new Error(`Invalid index type: ${indexType}. Must be 'hnsw' or 'ivfflat'`);
    }

    if (!['cosine', 'l2', 'innerproduct'].includes(distanceMetric)) {
      throw new Error(`Invalid distance metric: ${distanceMetric}. Must be 'cosine', 'l2', or 'innerproduct'`);
    }

    // HNSW特定验证
    if (indexType === 'hnsw') {
      const { m, efConstruction, efSearch } = this.config;
      if (m !== undefined && (m < 2 || m > 100)) {
        throw new Error(`Invalid HNSW m parameter: ${m}. Must be between 2 and 100`);
      }
      if (efConstruction !== undefined && (efConstruction < 10 || efConstruction > 1000)) {
        throw new Error(`Invalid efConstruction parameter: ${efConstruction}. Must be between 10 and 1000`);
      }
      if (efSearch !== undefined && (efSearch < 10 || efSearch > 1000)) {
        throw new Error(`Invalid efSearch parameter: ${efSearch}. Must be between 10 and 1000`);
      }
    }

    // IVFFlat特定验证
    if (indexType === 'ivfflat') {
      const { lists } = this.config;
      if (lists !== undefined && (lists < 1 || lists > 10000)) {
        throw new Error(`Invalid IVFFlat lists parameter: ${lists}. Must be between 1 and 10000`);
      }
    }
  }

  // 获取索引创建SQL
  public getCreateIndexSQL(indexName: string, tableName: string = 'notes'): string {
    const { indexType, distanceMetric, m, efConstruction, lists } = this.config;

    const vectorColumn = 'content_vector';
    const indexMethod = indexType;
    let vectorOps = '';

    switch (distanceMetric) {
      case 'cosine':
        vectorOps = 'vector_cosine_ops';
        break;
      case 'l2':
        vectorOps = 'vector_l2_ops';
        break;
      case 'innerproduct':
        vectorOps = 'vector_ip_ops';
        break;
    }

    let sql = `CREATE INDEX ${indexName} ON ${tableName} USING ${indexMethod} ("${vectorColumn}" ${vectorOps})`;

    // 添加HNSW特定参数
    if (indexType === 'hnsw') {
      const hnswParams = [];
      if (m !== undefined) hnswParams.push(`m = ${m}`);
      if (efConstruction !== undefined) hnswParams.push(`ef_construction = ${efConstruction}`);
      if (hnswParams.length > 0) {
        sql += ` WITH (${hnswParams.join(', ')})`;
      }
    }

    // 添加IVFFlat特定参数
    if (indexType === 'ivfflat' && lists !== undefined) {
      sql += ` WITH (lists = ${lists})`;
    }

    return sql;
  }

  // 获取索引优化SQL
  public getOptimizeIndexSQL(indexName: string): string {
    return `ALTER INDEX ${indexName} SET (fast_update = on);`;
  }

  // 获取查询参数
  public getSearchParams(): {
    efSearch?: number;
    indexType: string;
    distanceMetric: string;
  } {
    const { indexType, distanceMetric, efSearch } = this.config;

    return {
      efSearch: indexType === 'hnsw' ? efSearch : undefined,
      indexType,
      distanceMetric,
    };
  }

  // 根据提供商配置自动调整
  public optimizeForProvider(provider: string): void {
    switch (provider) {
      case 'openai':
        this.updateConfig({
          dimensions: 1536,
          indexType: 'hnsw',
          distanceMetric: 'cosine',
          m: 16,
          efConstruction: 200,
          efSearch: 50,
        });
        break;

      case 'anthropic':
        this.updateConfig({
          dimensions: 1024,
          indexType: 'hnsw',
          distanceMetric: 'cosine',
          m: 12,
          efConstruction: 150,
          efSearch: 40,
        });
        break;

      case 'zhipu':
        this.updateConfig({
          dimensions: 1024,
          indexType: 'hnsw',
          distanceMetric: 'cosine',
          m: 12,
          efConstruction: 150,
          efSearch: 40,
        });
        break;

      default:
        // 保持默认配置
        break;
    }
  }

  // 根据数据量调整配置
  public optimizeForScale(totalVectors: number): void {
    if (totalVectors < 1000) {
      // 小数据集：较小的参数
      this.updateConfig({
        efConstruction: 100,
        efSearch: 20,
        m: 8,
      });
    } else if (totalVectors < 100000) {
      // 中等数据集：默认参数
      this.updateConfig({
        efConstruction: 200,
        efSearch: 50,
        m: 16,
      });
    } else {
      // 大数据集：较大的参数
      this.updateConfig({
        efConstruction: 400,
        efSearch: 100,
        m: 32,
      });
    }
  }

  // 导出配置为JSON
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  // 从JSON导入配置
  public importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      this.updateConfig(config);
    } catch (error) {
      throw new Error(`Invalid configuration JSON: ${error}`);
    }
  }
}

// 单例实例
export const vectorConfig = VectorConfig.getInstance();