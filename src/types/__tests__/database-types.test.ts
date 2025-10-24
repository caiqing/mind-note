/**
 * 数据库类型定义测试
 * 验证数据库相关类型的正确性和完整性
 */

import { describe, it, expect } from 'vitest';
import type {
  DatabaseSetupRequest,
  DatabaseSetupResponse,
  DatabaseHealthResponse,
  DatabaseError,
  DatabaseConfig,
} from '../database';

describe('Database Types', () => {
  describe('DatabaseSetupRequest', () => {
    it('should validate setup request structure', () => {
      const request: DatabaseSetupRequest = {
        action: 'setup',
        environment: 'test',
        options: {
          createSchema: true,
          seedData: true,
          forceReset: false,
        },
      };

      expect(request.action).toBe('setup');
      expect(request.environment).toBe('test');
      expect(request.options.createSchema).toBe(true);
      expect(request.options.seedData).toBe(true);
      expect(request.options.forceReset).toBe(false);
    });

    it('should validate all possible actions', () => {
      const actions: DatabaseSetupRequest['action'][] = ['setup', 'reset', 'migrate', 'seed'];

      actions.forEach(action => {
        const request: DatabaseSetupRequest = {
          action,
          environment: 'development',
          options: {},
        };
        expect(['setup', 'reset', 'migrate', 'seed']).toContain(request.action);
      });
    });

    it('should validate all possible environments', () => {
      const environments: DatabaseSetupRequest['environment'][] = [
        'development',
        'test',
        'staging',
        'production',
      ];

      environments.forEach(environment => {
        const request: DatabaseSetupRequest = {
          action: 'setup',
          environment,
          options: {},
        };
        expect(['development', 'test', 'staging', 'production']).toContain(request.environment);
      });
    });
  });

  describe('DatabaseSetupResponse', () => {
    it('should validate success response structure', () => {
      const successResponse: DatabaseSetupResponse = {
        success: true,
        message: 'Database setup completed successfully',
        data: {
          connectionStatus: 'connected',
          schemaVersion: '1.0.0',
          tablesCreated: ['users', 'notes', 'categories'],
          seedDataInserted: {
            users: 5,
            categories: 3,
            notes: 10,
          },
          migrationsApplied: [
            {
              id: '001_initial',
              name: 'Initial migration',
              version: '1.0.0',
              appliedAt: '2025-10-24T12:00:00Z',
              executionTime: 1500,
            },
          ],
          executionTime: 2500,
        },
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBeDefined();
      expect(successResponse.data?.connectionStatus).toBe('connected');
      expect(successResponse.data?.tablesCreated).toHaveLength(3);
      expect(Object.keys(successResponse.data?.seedDataInserted || {})).toHaveLength(3);
      expect(successResponse.data?.migrationsApplied).toHaveLength(1);
    });

    it('should validate error response structure', () => {
      const errorResponse: DatabaseSetupResponse = {
        success: false,
        message: 'Database setup failed',
        error: {
          code: 'CONNECTION_ERROR',
          message: 'Unable to connect to database',
          details: {
            host: 'localhost',
            port: 5432,
            database: 'mindnote_test',
          },
        },
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error?.code).toBe('CONNECTION_ERROR');
      expect(errorResponse.error?.message).toBe('Unable to connect to database');
      expect(errorResponse.error?.details).toBeDefined();
    });

    it('should validate all possible error codes', () => {
      const errorCodes: DatabaseError['code'][] = [
        'CONNECTION_ERROR',
        'TIMEOUT',
        'PERMISSION_DENIED',
        'SCHEMA_ERROR',
        'MIGRATION_ERROR',
        'VALIDATION_ERROR',
        'INVALID_REQUEST',
        'INTERNAL_ERROR',
      ];

      errorCodes.forEach(code => {
        const error: DatabaseError = {
          code,
          message: `Error: ${code}`,
        };
        expect(errorCodes).toContain(error.code);
      });
    });
  });

  describe('DatabaseHealthResponse', () => {
    it('should validate health response structure', () => {
      const healthResponse: DatabaseHealthResponse = {
        success: true,
        data: {
          status: 'healthy',
          connectionPool: {
            active: 2,
            idle: 8,
            total: 10,
            max: 20,
            min: 2,
            waiting: 0,
          },
          database: {
            version: 'PostgreSQL 15.0',
            size: '125MB',
            lastBackup: '2025-10-24T10:00:00Z',
            uptime: 86400,
            host: 'localhost',
            port: 5432,
            database: 'mindnote_test',
          },
          performance: {
            avgResponseTime: 45,
            queryCount: 1250,
            errorRate: 0.01,
            slowQueries: 2,
            cacheHitRate: 0.95,
            throughput: 125,
          },
          lastCheck: '2025-10-24T12:30:00Z',
        },
        timestamp: '2025-10-24T12:30:00Z',
      };

      expect(healthResponse.success).toBe(true);
      expect(healthResponse.data.status).toBe('healthy');
      expect(healthResponse.data.connectionPool.total).toBe(10);
      expect(healthResponse.data.database.version).toBe('PostgreSQL 15.0');
      expect(healthResponse.data.performance.avgResponseTime).toBe(45);
      expect(healthResponse.data.performance.errorRate).toBe(0.01);
      expect(typeof healthResponse.timestamp).toBe('string');
    });

    it('should validate all possible health statuses', () => {
      const statuses: DatabaseHealthResponse['data']['status'][] = ['healthy', 'unhealthy', 'degraded'];

      statuses.forEach(status => {
        const healthData = {
          status,
          connectionPool: {
            active: 1,
            idle: 1,
            total: 2,
            max: 10,
            min: 1,
            waiting: 0,
          },
          database: {
            version: 'PostgreSQL 15.0',
            size: '100MB',
            uptime: 3600,
            host: 'localhost',
            port: 5432,
            database: 'test',
          },
          performance: {
            avgResponseTime: 50,
            queryCount: 100,
            errorRate: 0,
            slowQueries: 0,
            cacheHitRate: 0.9,
            throughput: 50,
          },
          lastCheck: new Date().toISOString(),
        };

        expect(statuses).toContain(healthData.status);
      });
    });
  });

  describe('DatabaseConfig', () => {
    it('should validate database config structure', () => {
      const config: DatabaseConfig = {
        host: 'localhost',
        port: 5432,
        database: 'mindnote_test',
        username: 'test_user',
        password: 'test_password',
        ssl: false,
        pool: {
          min: 2,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
        logging: true,
        timezone: 'UTC',
      };

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('mindnote_test');
      expect(config.username).toBe('test_user');
      expect(config.password).toBe('test_password');
      expect(config.ssl).toBe(false);
      expect(config.pool?.min).toBe(2);
      expect(config.pool?.max).toBe(10);
      expect(config.logging).toBe(true);
      expect(config.timezone).toBe('UTC');
    });

    it('should validate minimal config', () => {
      const minimalConfig: DatabaseConfig = {
        host: 'localhost',
        port: 5432,
        database: 'mindnote_test',
        username: 'test_user',
        password: 'test_password',
      };

      expect(minimalConfig.host).toBe('localhost');
      expect(minimalConfig.port).toBe(5432);
      expect(minimalConfig.database).toBe('mindnote_test');
      expect(minimalConfig.username).toBe('test_user');
      expect(minimalConfig.password).toBe('test_password');
      expect(minimalConfig.ssl).toBeUndefined();
      expect(minimalConfig.pool).toBeUndefined();
      expect(minimalConfig.logging).toBeUndefined();
      expect(minimalConfig.timezone).toBeUndefined();
    });
  });

  describe('Type Safety and Validation', () => {
    it('should enforce required fields in setup request', () => {
      // TypeScript 编译时检查 - 如果缺少必需字段会报错
      const validRequest: DatabaseSetupRequest = {
        action: 'setup',
        environment: 'test',
        options: {},
      };

      expect(typeof validRequest.action).toBe('string');
      expect(typeof validRequest.environment).toBe('string');
      expect(typeof validRequest.options).toBe('object');
    });

    it('should validate response data types', () => {
      const response: DatabaseSetupResponse = {
        success: true,
        message: 'Test message',
        data: {
          connectionStatus: 'connected',
          schemaVersion: '1.0.0',
          tablesCreated: [],
          seedDataInserted: {},
          migrationsApplied: [],
          executionTime: 1000,
        },
      };

      expect(typeof response.success).toBe('boolean');
      expect(typeof response.message).toBe('string');
      expect(typeof response.data?.connectionStatus).toBe('string');
      expect(typeof response.data?.schemaVersion).toBe('string');
      expect(Array.isArray(response.data?.tablesCreated)).toBe(true);
      expect(typeof response.data?.seedDataInserted).toBe('object');
      expect(Array.isArray(response.data?.migrationsApplied)).toBe(true);
      expect(typeof response.data?.executionTime).toBe('number');
    });

    it('should handle optional fields gracefully', () => {
      const response: DatabaseSetupResponse = {
        success: false,
        message: 'Error occurred',
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
        // data 字段是可选的，在错误响应中可能不存在
      };

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.data).toBeUndefined();
    });
  });
});
