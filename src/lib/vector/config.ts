// 向量存储配置

export interface VectorConfig {
  // 嵌入模型配置
  embeddingModel: string
  dimensions: number
  maxBatchSize: number

  // 搜索配置
  defaultThreshold: number
  maxSearchResults: number
  enableCaching: boolean
  cacheTTL: number // 秒

  // 索引配置
  indexType: 'ivfflat' | 'hnsw'
  indexParameters: {
    lists?: number
    m?: number
    efConstruction?: number
  }

  // 存储配置
  compressionEnabled: boolean
  compressionLevel: number

  // 性能配置
  connectionPoolSize: number
  queryTimeout: number
  indexBuildTimeout: number
}

export const defaultVectorConfig: VectorConfig = {
  // 嵌入模型配置
  embeddingModel: 'text-embedding-3-small',
  dimensions: 1536,
  maxBatchSize: 100,

  // 搜索配置
  defaultThreshold: 0.7,
  maxSearchResults: 50,
  enableCaching: true,
  cacheTTL: 3600, // 1小时

  // 索引配置
  indexType: 'ivfflat',
  indexParameters: {
    lists: 100
  },

  // 存储配置
  compressionEnabled: false,
  compressionLevel: 6,

  // 性能配置
  connectionPoolSize: 10,
  queryTimeout: 30000, // 30秒
  indexBuildTimeout: 300000 // 5分钟
}

// 环境特定的配置
export const getVectorConfig = (): VectorConfig => {
  const config = { ...defaultVectorConfig }

  // 从环境变量覆盖配置
  if (process.env.AI_EMBEDDING_MODEL) {
    config.embeddingModel = process.env.AI_EMBEDDING_MODEL
  }

  if (process.env.AI_EMBEDDING_DIMENSIONS) {
    config.dimensions = parseInt(process.env.AI_EMBEDDING_DIMENSIONS)
  }

  if (process.env.AI_SIMILARITY_THRESHOLD) {
    config.defaultThreshold = parseFloat(process.env.AI_SIMILARITY_THRESHOLD)
  }

  if (process.env.AI_BATCH_SIZE) {
    config.maxBatchSize = parseInt(process.env.AI_BATCH_SIZE)
  }

  // 开发环境配置
  if (process.env.NODE_ENV === 'development') {
    config.maxBatchSize = Math.min(config.maxBatchSize, 10)
    config.connectionPoolSize = Math.min(config.connectionPoolSize, 3)
  }

  // 生产环境配置
  if (process.env.NODE_ENV === 'production') {
    config.enableCaching = true
    config.cacheTTL = 7200 // 2小时
    config.connectionPoolSize = 20
  }

  return config
}

// 向量索引配置
export interface VectorIndexConfig {
  name: string
  type: 'ivfflat' | 'hnsw'
  dimensions: number
  distance: 'l2' | 'ip' | 'cosine'
  parameters: {
    lists?: number // for ivfflat
    m?: number // for hnsw
    efConstruction?: number // for hnsw
  }
}

export const createIndexConfig = (
  name: string,
  dimensions: number,
  type: VectorIndexConfig['type'] = 'ivfflat'
): VectorIndexConfig => {
  const config: VectorIndexConfig = {
    name,
    type,
    dimensions,
    distance: 'cosine',
    parameters: {}
  }

  if (type === 'ivfflat') {
    config.parameters.lists = Math.min(100, Math.max(10, Math.floor(dimensions / 10)))
  } else if (type === 'hnsw') {
    config.parameters.m = 16
    config.parameters.efConstruction = 64
  }

  return config
}

// 索引创建SQL生成器
export const generateIndexSQL = (config: VectorIndexConfig): string => {
  const { name, type, dimensions, distance, parameters } = config

  let distanceOp = ''
  switch (distance) {
    case 'l2':
      distanceOp = 'vector_l2_ops'
      break
    case 'ip':
      distanceOp = 'vector_ip_ops'
      break
    case 'cosine':
      distanceOp = 'vector_cosine_ops'
      break
    default:
      throw new Error(`Unsupported distance metric: ${distance}`)
  }

  let indexSQL = `CREATE INDEX IF NOT EXISTS ${name} ON embedding_vectors `
  indexSQL += `USING ${type} (embedding ${distanceOp})`

  if (type === 'ivfflat' && parameters.lists) {
    indexSQL += ` WITH (lists = ${parameters.lists})`
  } else if (type === 'hnsw' && parameters.m && parameters.efConstruction) {
    indexSQL += ` WITH (m = ${parameters.m}, ef_construction = ${parameters.efConstruction})`
  }

  return indexSQL
}

// 向量性能监控配置
export interface VectorPerformanceConfig {
  enableMonitoring: boolean
  slowQueryThreshold: number // 毫秒
  errorRateThreshold: number // 百分比
  metricsRetentionDays: number
  alerting: {
    enabled: boolean
    slowQueryAlert: boolean
    errorRateAlert: boolean
    storageUsageAlert: boolean
  }
}

export const vectorPerformanceConfig: VectorPerformanceConfig = {
  enableMonitoring: process.env.NODE_ENV === 'production',
  slowQueryThreshold: 5000, // 5秒
  errorRateThreshold: 5, // 5%
  metricsRetentionDays: 30,
  alerting: {
    enabled: process.env.NODE_ENV === 'production',
    slowQueryAlert: true,
    errorRateAlert: true,
    storageUsageAlert: true
  }
}