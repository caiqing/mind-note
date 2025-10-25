// 向量存储相关类型定义

export interface VectorEmbedding {
  id: string;
  noteId: string;
  vector: number[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface VectorSearchResult {
  noteId: string;
  similarity: number;
  note?: {
    id: string;
    title: string;
    summary?: string;
    category?: string;
    tags?: string[];
  };
}

export interface VectorStorageConfig {
  dimensions: number;
  indexType: 'hnsw' | 'ivfflat';
  distanceMetric: 'cosine' | 'l2' | 'innerproduct';
  efConstruction?: number;
  efSearch?: number;
  m?: number; // HNSW-specific
  lists?: number; // IVFFlat-specific
}

export interface VectorIndexStats {
  indexName: string;
  indexType: string;
  totalVectors: number;
  indexSize: string;
  buildTime: number;
  lastOptimized: Date;
}

export interface VectorStorageStats {
  totalVectors: number;
  totalNotes: number;
  indexStats: VectorIndexStats[];
  averageQueryTime: number;
  queriesPerSecond: number;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
  filterCategories?: string[];
  filterTags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface VectorBatchOperation {
  operation: 'insert' | 'update' | 'delete';
  noteId: string;
  vector?: number[];
  metadata?: Record<string, any>;
}

export interface VectorStorageProvider {
  // 基础向量操作
  storeVector(noteId: string, vector: number[], metadata?: Record<string, any>): Promise<void>;
  updateVector(noteId: string, vector: number[], metadata?: Record<string, any>): Promise<void>;
  deleteVector(noteId: string): Promise<void>;
  getVector(noteId: string): Promise<VectorEmbedding | null>;

  // 向量搜索
  searchSimilar(queryVector: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]>;

  // 批量操作
  batchOperations(operations: VectorBatchOperation[]): Promise<void>;

  // 索引管理
  createIndex(config: VectorStorageConfig): Promise<void>;
  optimizeIndex(): Promise<void>;
  rebuildIndex(): Promise<void>;

  // 统计和监控
  getStats(): Promise<VectorStorageStats>;
  checkHealth(): Promise<boolean>;
}

export interface VectorGenerationOptions {
  model?: string;
  provider?: string;
  dimensions?: number;
  batchSize?: number;
}

export interface VectorGenerationProvider {
  generateEmbedding(text: string, options?: VectorGenerationOptions): Promise<number[]>;
  batchGenerateEmbeddings(texts: string[], options?: VectorGenerationOptions): Promise<number[][]>;
  getModelInfo(): Promise<{
    model: string;
    dimensions: number;
    maxTokens: number;
    costPerToken: number;
  }>;
}

// 预定义的向量配置
export const DEFAULT_VECTOR_CONFIG: VectorStorageConfig = {
  dimensions: 1536, // OpenAI embedding dimensions
  indexType: 'hnsw',
  distanceMetric: 'cosine',
  efConstruction: 200,
  efSearch: 50,
  m: 16,
};

export const VECTOR_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  ZHIPU: 'zhipu',
  DEEPSEEK: 'deepseek',
  KIMI: 'kimi',
  QWEN: 'qwen',
  OLLAMA: 'ollama',
} as const;

export type VectorProvider = typeof VECTOR_PROVIDERS[keyof typeof VECTOR_PROVIDERS];