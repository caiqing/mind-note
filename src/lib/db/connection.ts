import { PrismaClient } from '@prisma/client';
import { Logger } from '@/lib/utils/logger';
import { poolConfigManager } from './pool-config';

// 数据库连接配置接口
interface DatabaseConfig {
  url: string;
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };
  log?: any;
  errorFormat?: 'pretty' | 'minimal' | 'colorless';
}

// 连接状态管理
class ConnectionManager {
  private prisma: PrismaClient | null = null;
  private config: DatabaseConfig;
  private isConnected: boolean = false;
  private lastHealthCheck: Date | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(config: DatabaseConfig) {
    this.config = {
      pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      },
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
      ...config,
    };
  }

  /**
   * 获取数据库连接
   */
  async getConnection(): Promise<PrismaClient> {
    if (!this.prisma || !this.isConnected) {
      await this.connect();
    }
    return this.prisma!;
  }

  /**
   * 建立数据库连接
   */
  private async connect(): Promise<void> {
    try {
      Logger.info('建立数据库连接...');

      this.prisma = new PrismaClient(this.config);

      // 测试连接
      await this.prisma.$queryRaw`SELECT 1`;

      this.isConnected = true;
      this.reconnectAttempts = 0;

      Logger.success('数据库连接成功');

      // 启动健康检查
      this.startHealthCheck();

    } catch (error) {
      Logger.error('数据库连接失败:', error);
      this.isConnected = false;

      // 尝试重连
      await this.reconnect();
    }
  }

  /**
   * 重连数据库
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      Logger.error('达到最大重连次数，停止重连');
      throw new Error('数据库连接失败');
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    Logger.info(`${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`);

    await new Promise(resolve => setTimeout(resolve, delay));

    await this.connect();
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // 每30秒检查一次
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    try {
      if (this.prisma) {
        await this.prisma.$queryRaw`SELECT 1`;
        this.lastHealthCheck = new Date();

        if (!this.isConnected) {
          Logger.info('数据库连接已恢复');
          this.isConnected = true;
          this.reconnectAttempts = 0;
        }
      }
    } catch (error) {
      Logger.warn('数据库健康检查失败:', error);
      this.isConnected = false;
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      if (this.prisma) {
        await this.prisma.$disconnect();
        this.prisma = null;
      }

      this.isConnected = false;
      Logger.info('数据库连接已断开');
    } catch (error) {
      Logger.error('断开数据库连接时出错:', error);
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): {
    isConnected: boolean;
    lastHealthCheck: Date | null;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * 获取连接池统计信息
   */
  async getPoolStats(): Promise<any> {
    if (!this.prisma) {
      return null;
    }

    try {
      const result = await this.prisma.$queryRaw`
        SELECT
          COUNT(*) as total_connections,
          COUNT(*) FILTER (WHERE state = 'active') as active_connections,
          COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      return result;
    } catch (error) {
      Logger.error('获取连接池统计失败:', error);
      return null;
    }
  }
}

// 创建全局连接管理器实例
const databaseConfig: DatabaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev',
  pool: {
    min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
    max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
    idleTimeoutMillis: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DATABASE_POOL_CONNECTION_TIMEOUT || '5000'),
  },
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  errorFormat: 'pretty',
};

const connectionManager = new ConnectionManager(databaseConfig);

// 全局 Prisma 实例
let prisma: PrismaClient | null = null;

/**
 * 获取 Prisma 客户端实例
 */
export async function getPrismaClient(): Promise<PrismaClient> {
  return connectionManager.getConnection();
}

/**
 * 带事务的数据库操作
 */
export async function withTransaction<T>(
  operations: (tx: PrismaClient) => Promise<T>,
  options?: {
    timeout?: number;
    isolationLevel?: any;
  }
): Promise<T> {
  const client = await getPrismaClient();

  return client.$transaction(async (tx) => {
    return operations(tx);
  }, {
    timeout: options?.timeout || 10000,
    isolationLevel: options?.isolationLevel,
  });
}

/**
 * 带重试的数据库操作
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    errorMessage?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 10000,
    errorMessage = 'Database operation failed'
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeout);
      });

      return await Promise.race([
        operation(),
        timeoutPromise
      ]);

    } catch (error) {
      lastError = error as Error;

      if (attempt <= maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        Logger.warn(`操作失败，${delay}ms 后重试 (${attempt}/${maxRetries}): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }

  Logger.error(`${errorMessage}: ${lastError.message}`);
  throw new Error(`${errorMessage}: ${lastError.message}`);
}

/**
 * 简化的数据库操作包装器
 */
export async function withDatabase<T>(
  operation: (client: PrismaClient) => Promise<T>,
  options?: {
    useTransaction?: boolean;
    maxRetries?: number;
    timeout?: number;
    errorMessage?: string;
  }
): Promise<T> {
  const {
    useTransaction = false,
    maxRetries = 3,
    timeout = 10000,
    errorMessage = 'Database operation failed'
  } = options;

  if (useTransaction) {
    return withRetry(
      () => withTransaction(operation, { timeout }),
      { maxRetries, timeout, errorMessage }
    );
  } else {
    return withRetry(
      () => {
        return getPrismaClient().then(client => operation(client));
      },
      { maxRetries, timeout, errorMessage }
    );
  }
}

/**
 * 数据库健康检查
 */
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean;
  status: ConnectionStatus;
  details: any;
}> {
  try {
    const client = await getPrismaClient();

    // 基础连接测试
    await client.$queryRaw`SELECT 1`;

    // 获取连接统计
    const poolStats = await connectionManager.getPoolStats();

    // 测试关键表
    const tableCount = await client.$queryRaw`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    const status = connectionManager.getConnectionStatus();

    return {
      isHealthy: status.isConnected,
      status: {
        connected: status.isConnected,
        lastCheck: status.lastHealthCheck,
        reconnects: status.reconnectAttempts,
      },
      details: {
        poolStats,
        tableCount,
        timestamp: new Date().toISOString(),
      }
    };

  } catch (error) {
    Logger.error('数据库健康检查失败:', error);

    return {
      isHealthy: false,
      status: connectionManager.getConnectionStatus(),
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    };
  }
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<{
  tables: number;
  users: number;
  notes: number;
  categories: number;
  tags: number;
  connections: number;
  size: string;
}> {
  try {
    const client = await getPrismaClient();

    const [tables, users, notes, categories, tags, size, connections] = await Promise.all([
      client.$queryRaw`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`,
      client.user.count(),
      client.note.count(),
      client.category.count(),
      client.tag.count(),
      client.$queryRaw`SELECT pg_size_pretty(pg_database_size(current_database()))`,
      connectionManager.getPoolStats(),
    ]);

    return {
      tables: parseInt(tables.rows[0].count),
      users,
      notes,
      categories,
      tags,
      connections: connections ? parseInt(connections.rows[0].active_connections) : 0,
      size: size.rows[0].pg_size_pretty,
    };

  } catch (error) {
    Logger.error('获取数据库统计失败:', error);
    throw error;
  }
}

/**
 * 应用关闭时清理连接
 */
export async function cleanup(): Promise<void> {
  await connectionManager.disconnect();
}

// 应用启动时连接数据库
async function initializeDatabase(): Promise<void> {
  Logger.info('初始化数据库连接...');
  await getPrismaClient();
  Logger.success('数据库初始化完成');
}

// 类型定义
export interface ConnectionStatus {
  connected: boolean;
  lastCheck: Date | null;
  reconnects: number;
}

export interface DatabaseStats {
  tables: number;
  users: number;
  notes: number;
  categories: number;
  tags: number;
  connections: number;
  size: string;
}

// 导出连接管理器（用于测试）
export { connectionManager };
