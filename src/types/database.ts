/**
 * 数据库相关的类型定义
 * 用于数据库设置、健康检查和管理的接口规范
 */

// 数据库设置请求选项
export interface DatabaseSetupRequest {
  action: 'setup' | 'reset' | 'migrate' | 'seed';
  environment: 'development' | 'test' | 'staging' | 'production';
  options: {
    createSchema?: boolean;
    seedData?: boolean;
    forceReset?: boolean;
    migrationTarget?: string;
    timeout?: number;
  };
}

// 数据库设置响应
export interface DatabaseSetupResponse {
  success: boolean;
  message: string;
  data?: {
    connectionStatus: DatabaseConnectionStatus;
    schemaVersion: string;
    tablesCreated: string[];
    seedDataInserted: Record<string, number>;
    migrationsApplied: MigrationInfo[];
    executionTime: number;
  };
  error?: DatabaseError;
}

// 数据库连接状态
export type DatabaseConnectionStatus = 'connected' | 'disconnected' | 'error';

// 迁移信息
export interface MigrationInfo {
  id: string;
  name: string;
  version: string;
  appliedAt: string;
  executionTime: number;
}

// 数据库错误
export interface DatabaseError {
  code: DatabaseErrorCode;
  message: string;
  details?: any;
  stack?: string;
}

// 数据库错误代码
export type DatabaseErrorCode =
  | 'CONNECTION_ERROR'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'SCHEMA_ERROR'
  | 'MIGRATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'INVALID_REQUEST'
  | 'INTERNAL_ERROR';

// 数据库健康检查响应
export interface DatabaseHealthResponse {
  success: boolean;
  data: DatabaseHealthData;
  timestamp: string;
}

// 数据库健康数据
export interface DatabaseHealthData {
  status: DatabaseHealthStatus;
  connectionPool: ConnectionPoolInfo;
  database: DatabaseInfo;
  performance: PerformanceMetrics;
  lastCheck: string;
}

// 数据库健康状态
export type DatabaseHealthStatus = 'healthy' | 'unhealthy' | 'degraded';

// 连接池信息
export interface ConnectionPoolInfo {
  active: number;
  idle: number;
  total: number;
  max: number;
  min: number;
  waiting: number;
}

// 数据库信息
export interface DatabaseInfo {
  version: string;
  size: string;
  lastBackup?: string;
  uptime: number;
  host: string;
  port: number;
  database: string;
}

// 性能指标
export interface PerformanceMetrics {
  avgResponseTime: number;
  queryCount: number;
  errorRate: number;
  slowQueries: number;
  cacheHitRate: number;
  throughput: number;
}

// 数据库Schema信息
export interface DatabaseSchemaResponse {
  success: boolean;
  data: {
    version: string;
    tables: Record<string, TableInfo>;
    relationships: RelationshipInfo[];
    indexes: IndexInfo[];
  };
}

// 表信息
export interface TableInfo {
  name: string;
  columns: Record<string, ColumnInfo>;
  indexes: IndexInfo[];
  constraints: ConstraintInfo[];
  estimatedRows: number;
}

// 列信息
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  autoIncrement?: boolean;
  description?: string;
}

// 索引信息
export interface IndexInfo {
  name: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gist' | 'gin' | 'partial';
  unique: boolean;
  primary?: boolean;
}

// 关系信息
export interface RelationshipInfo {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

// 约束信息
export interface ConstraintInfo {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check' | 'not_null';
  columns: string[];
  references?: {
    table: string;
    column: string;
  };
}

// 数据库权限信息
export interface DatabasePermissionsResponse {
  success: boolean;
  data: {
    permissions: DatabasePermission[];
    roles: string[];
    currentRole: string;
  };
}

// 数据库权限
export interface DatabasePermission {
  permission: DatabasePermissionType;
  objectType: string;
  objectName: string;
  granted: boolean;
  grantor?: string;
}

// 数据库权限类型
export type DatabasePermissionType =
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'CREATE'
  | 'ALTER'
  | 'DROP'
  | 'INDEX'
  | 'TEMPORARY'
  | 'EXECUTE';

// 数据库配置选项
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  logging?: boolean;
  timezone?: string;
}

// 环境特定的数据库配置
export interface DatabaseEnvironmentConfig {
  development: DatabaseConfig;
  test: DatabaseConfig;
  staging: DatabaseConfig;
  production: DatabaseConfig;
}

// 数据库迁移状态
export interface MigrationStatusResponse {
  success: boolean;
  data: {
    currentVersion: string;
    latestVersion: string;
    pendingMigrations: MigrationInfo[];
    appliedMigrations: MigrationInfo[];
    needsMigration: boolean;
  };
}

// 数据库备份信息
export interface DatabaseBackupInfo {
  id: string;
  createdAt: string;
  size: number;
  type: 'full' | 'incremental' | 'differential';
  status: 'creating' | 'completed' | 'failed';
  location: string;
  description?: string;
}

// 数据库统计信息
export interface DatabaseStatistics {
  totalTables: number;
  totalIndexes: number;
  totalRows: number;
  totalSize: string;
  indexSize: string;
  largestTable: string;
  mostActiveTable: string;
  slowestQuery: string;
  cacheEfficiency: number;
}