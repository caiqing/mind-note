/**
 * 数据库连接管理器
 *
 * 提供智能的数据库连接管理，包括重连机制、降级策略和健康检查
 */

import { PrismaClient } from '@prisma/client';

export interface DatabaseStatus {
  connected: boolean;
  mode: 'database' | 'memory' | 'hybrid';
  lastCheck: Date;
  error?: string;
  retryCount: number;
}

class DatabaseManager {
  private prisma: PrismaClient | null = null;
  private status: DatabaseStatus = {
    connected: false,
    mode: 'memory',
    lastCheck: new Date(),
    retryCount: 0,
  };
  private retryDelay = 1000; // 1秒
  private maxRetries = 3;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDatabase();
    this.startHealthCheck();
  }

  /**
   * 初始化数据库连接
   */
  private async initializeDatabase(): Promise<void> {
    try {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        log:
          process.env.NODE_ENV === 'development'
            ? ['error', 'warn']
            : ['error'],
        // 添加连接池配置
        __internal: {
          engine: {
            connectionLimit: 10,
            poolTimeout: 10000,
          },
        },
      });

      // 测试连接
      await this.prisma.$queryRaw`SELECT 1`;

      this.status = {
        connected: true,
        mode: 'database',
        lastCheck: new Date(),
        retryCount: 0,
      };

      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      this.status.connected = false;
      this.status.mode = 'memory';
      this.status.error =
        error instanceof Error ? error.message : 'Unknown error';

      // 启动重连机制
      this.scheduleReconnect();
    }
  }

  /**
   * 获取Prisma客户端实例
   */
  getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('数据库未初始化');
    }
    return this.prisma;
  }

  /**
   * 检查数据库健康状态
   */
  async checkHealth(): Promise<DatabaseStatus> {
    this.status.lastCheck = new Date();

    if (!this.prisma) {
      this.status.connected = false;
      this.status.mode = 'memory';
      return this.status;
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      if (!this.status.connected) {
        console.log('✅ 数据库连接已恢复');
        this.status.retryCount = 0;
      }

      this.status.connected = true;
      this.status.mode = 'database';
      this.status.error = undefined;
    } catch (error) {
      this.status.connected = false;
      this.status.mode = 'memory';
      this.status.error =
        error instanceof Error ? error.message : 'Unknown error';

      console.warn('⚠️ 数据库健康检查失败，切换到内存模式:', this.status.error);

      // 如果重试次数未达上限，尝试重连
      if (this.status.retryCount < this.maxRetries) {
        this.scheduleReconnect();
      }
    }

    return this.status;
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.status.retryCount++;
    const delay = this.retryDelay * Math.pow(2, this.status.retryCount - 1); // 指数退避

    console.log(
      `🔄 将在 ${delay / 1000} 秒后尝试第 ${this.status.retryCount} 次重连...`,
    );

    setTimeout(async () => {
      try {
        if (this.prisma) {
          await this.prisma.$disconnect();
        }
        await this.initializeDatabase();
      } catch (error) {
        console.error('重连失败:', error);
      }
    }, delay);
  }

  /**
   * 启动定期健康检查
   */
  private startHealthCheck(): void {
    // 每30秒检查一次数据库健康状态
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, 30000);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * 执行数据库操作的安全包装器
   */
  async execute<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const status = await this.checkHealth();

    if (status.connected && this.prisma) {
      try {
        return await operation(this.prisma);
      } catch (error) {
        console.error('数据库操作失败:', error);

        // 如果提供了降级方案，使用降级方案
        if (fallback) {
          console.log('使用降级方案处理请求');
          return await fallback();
        }

        throw error;
      }
    } else {
      // 数据库不可用，使用降级方案
      if (fallback) {
        console.log('数据库不可用，使用降级方案');
        return await fallback();
      }

      throw new Error('数据库不可用且未提供降级方案');
    }
  }

  /**
   * 获取当前数据库状态
   */
  getStatus(): DatabaseStatus {
    return { ...this.status };
  }

  /**
   * 强制重新连接数据库
   */
  async forceReconnect(): Promise<void> {
    console.log('🔄 强制重新连接数据库...');

    if (this.prisma) {
      try {
        await this.prisma.$disconnect();
      } catch (error) {
        console.error('断开连接时出错:', error);
      }
    }

    this.status.retryCount = 0;
    await this.initializeDatabase();
  }

  /**
   * 优雅关闭数据库连接
   */
  async shutdown(): Promise<void> {
    this.stopHealthCheck();

    if (this.prisma) {
      try {
        await this.prisma.$disconnect();
        console.log('✅ 数据库连接已关闭');
      } catch (error) {
        console.error('关闭数据库连接时出错:', error);
      }
    }
  }
}

// 创建全局单例
const globalForDbManager = globalThis as unknown as {
  dbManager: DatabaseManager | undefined;
};

export const dbManager = globalForDbManager.dbManager ?? new DatabaseManager();

if (process.env.NODE_ENV !== 'production') {
  globalForDbManager.dbManager = dbManager;
}

// 导出便捷方法
export const getClient = () => dbManager.getClient();
export const checkDatabaseHealth = () => dbManager.checkHealth();
export const getDatabaseStatus = () => dbManager.getStatus();
export const executeWithDatabase = <T>(
  operation: (prisma: PrismaClient) => Promise<T>,
  fallback?: () => Promise<T>,
) => dbManager.execute(operation, fallback);

// 优雅关闭处理
process.on('SIGINT', async () => {
  console.log('收到 SIGINT 信号，正在关闭数据库连接...');
  await dbManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，正在关闭数据库连接...');
  await dbManager.shutdown();
  process.exit(0);
});

export default dbManager;
