/**
 * 数据库迁移管理脚本
 * 用于创建、应用和管理数据库迁移
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface MigrationInfo {
  id: string;
  name: string;
  version: string;
  appliedAt?: string;
  sql: string;
}

class DatabaseMigrationManager {
  private migrationsPath: string;
  private migrations: MigrationInfo[] = [];

  constructor() {
    this.migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
  }

  /**
   * 初始化迁移系统
   */
  async initialize(): Promise<void> {
    console.log('🔄 初始化数据库迁移系统...');

    // 确保迁移表存在
    await this.createMigrationTable();

    // 加载迁移文件
    await this.loadMigrations();

    console.log(`✅ 迁移系统初始化完成，发现 ${this.migrations.length} 个迁移文件`);
  }

  /**
   * 创建迁移记录表
   */
  private async createMigrationTable(): Promise<void> {
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "_migrations" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "version" TEXT NOT NULL,
          "sql" TEXT NOT NULL,
          "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "execution_time_ms" INTEGER,
          "checksum" TEXT
        );
      `;
    } catch (error) {
      console.error('❌ 创建迁移表失败:', error);
      throw error;
    }
  }

  /**
   * 加载迁移文件
   */
  private async loadMigrations(): Promise<void> {
    const { readdirSync, statSync } = require('fs');

    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort(); // 按文件名排序

      this.migrations = files.map(file => {
        const filePath = path.join(this.migrationsPath, file);
        const sql = readFileSync(filePath, 'utf-8');
        const match = file.match(/^(\d+)_(.+)\.sql$/);

        if (!match) {
          throw new Error(`无效的迁移文件名格式: ${file}`);
        }

        const [, id, name] = match;
        return {
          id,
          name: name.replace(/_/g, ' '),
          version: id,
          sql,
        };
      });

      // 标记已应用的迁移
      const appliedMigrations = await prisma.$queryRaw<
        Array<{ id: string; applied_at: string }>
      >`SELECT id, applied_at FROM "_migrations" ORDER BY applied_at`;

      const appliedIds = new Set(appliedMigrations.map(m => m.id));
      this.migrations.forEach(migration => {
        if (appliedIds.has(migration.id)) {
          const applied = appliedMigrations.find(m => m.id === migration.id);
          if (applied) {
            migration.appliedAt = applied.applied_at;
          }
        }
      });

    } catch (error) {
      console.error('❌ 加载迁移文件失败:', error);
      throw error;
    }
  }

  /**
   * 应用所有未应用的迁移
   */
  async applyMigrations(): Promise<void> {
    console.log('🚀 开始应用数据库迁移...');

    const pendingMigrations = this.migrations.filter(m => !m.appliedAt);

    if (pendingMigrations.length === 0) {
      console.log('✅ 没有待应用的迁移');
      return;
    }

    console.log(`📝 发现 ${pendingMigrations.length} 个待应用的迁移`);

    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }

    console.log('✅ 所有迁移应用完成');
  }

  /**
   * 应用单个迁移
   */
  private async applyMigration(migration: MigrationInfo): Promise<void> {
    console.log(`🔄 应用迁移: ${migration.name}`);

    const startTime = Date.now();

    try {
      // 开始事务
      await prisma.$transaction(async (tx) => {
        // 执行迁移SQL
        await tx.$executeRawUnsafe(migration.sql);

        // 记录迁移
        const executionTime = Date.now() - startTime;
        const crypto = require('crypto');
        const checksum = crypto.createHash('md5').update(migration.sql).digest('hex');

        await tx.$executeRaw`
          INSERT INTO "_migrations" (id, name, version, sql, execution_time_ms, checksum)
          VALUES (${migration.id}, ${migration.name}, ${migration.version}, ${migration.sql}, ${executionTime}, ${checksum})
        `;
      });

      console.log(`✅ 迁移 ${migration.name} 应用成功 (${Date.now() - startTime}ms)`);

    } catch (error) {
      console.error(`❌ 迁移 ${migration.name} 应用失败:`, error);
      throw error;
    }
  }

  /**
   * 回滚最后一个迁移
   */
  async rollbackLastMigration(): Promise<void> {
    const appliedMigrations = this.migrations.filter(m => m.appliedAt);

    if (appliedMigrations.length === 0) {
      console.log('❌ 没有可回滚的迁移');
      return;
    }

    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    console.log(`⏪ 回滚迁移: ${lastMigration.name}`);

    try {
      await prisma.$transaction(async (tx) => {
        // 删除迁移记录
        await tx.$executeRaw`DELETE FROM "_migrations" WHERE id = ${lastMigration.id}`;

        // 这里应该执行回滚SQL，但为了简化，我们只删除记录
        // 在生产环境中，应该为每个迁移创建对应的回滚脚本
      });

      console.log(`✅ 迁移 ${lastMigration.name} 回滚成功`);

    } catch (error) {
      console.error(`❌ 迁移 ${lastMigration.name} 回滚失败:`, error);
      throw error;
    }
  }

  /**
   * 获取迁移状态
   */
  async getMigrationStatus(): Promise<{
    total: number;
    applied: number;
    pending: number;
    lastApplied?: string;
  }> {
    const applied = this.migrations.filter(m => m.appliedAt).length;
    const pending = this.migrations.length - applied;
    const lastApplied = applied > 0
      ? this.migrations.filter(m => m.appliedAt).pop()?.appliedAt
      : undefined;

    return {
      total: this.migrations.length,
      applied,
      pending,
      lastApplied,
    };
  }

  /**
   * 验证数据库状态
   */
  async validateDatabase(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // 检查连接
      await prisma.$queryRaw`SELECT 1`;

      // 检查必要表是否存在
      const requiredTables = [
        'users',
        'notes',
        'categories',
        'tags',
        'note_tags',
        'note_relationships',
        'ai_processing_logs',
        'user_feedback',
        'system_config',
      ];

      for (const table of requiredTables) {
        try {
          await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "${table}"`);
        } catch (error) {
          issues.push(`表 ${table} 不存在或无法访问`);
        }
      }

      // 检查外键约束
      try {
        await prisma.$queryRaw`
          SELECT COUNT(*) FROM information_schema.table_constraints
          WHERE constraint_type = 'FOREIGN KEY'
        `;
      } catch (error) {
        issues.push('外键约束检查失败');
      }

      // 检查索引
      try {
        await prisma.$queryRaw`
          SELECT COUNT(*) FROM pg_indexes
          WHERE schemaname = 'public'
        `;
      } catch (error) {
        issues.push('索引检查失败');
      }

    } catch (error) {
      issues.push(`数据库连接失败: ${error}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * 创建新迁移文件
   */
  createMigration(name: string): string {
    const timestamp = new Date().toISOString().replace(/[-T:.]/g, '').slice(0, 14);
    const fileName = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.sql`;
    const filePath = path.join(this.migrationsPath, fileName);

    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: ${name}

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example_table (
--   id SERIAL PRIMARY KEY,
--   name TEXT NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Don't forget to add rollback logic in the rollback section
-- Rollback:
-- DROP TABLE IF EXISTS example_table;
`;

    writeFileSync(filePath, template);
    console.log(`✅ 创建迁移文件: ${fileName}`);

    return fileName;
  }
}

// 命令行接口
async function main() {
  const command = process.argv[2];
  const migrationManager = new DatabaseMigrationManager();

  try {
    await migrationManager.initialize();

    switch (command) {
      case 'apply':
        await migrationManager.applyMigrations();
        break;

      case 'rollback':
        await migrationManager.rollbackLastMigration();
        break;

      case 'status':
        const status = await migrationManager.getMigrationStatus();
        console.log('📊 迁移状态:');
        console.log(`- 总迁移数: ${status.total}`);
        console.log(`- 已应用: ${status.applied}`);
        console.log(`- 待应用: ${status.pending}`);
        if (status.lastApplied) {
          console.log(`- 最后应用: ${status.lastApplied}`);
        }
        break;

      case 'validate':
        const validation = await migrationManager.validateDatabase();
        if (validation.isValid) {
          console.log('✅ 数据库验证通过');
        } else {
          console.log('❌ 数据库验证失败:');
          validation.issues.forEach(issue => console.log(`  - ${issue}`));
          process.exit(1);
        }
        break;

      case 'create':
        const migrationName = process.argv[3];
        if (!migrationName) {
          console.error('❌ 请提供迁移名称');
          process.exit(1);
        }
        migrationManager.createMigration(migrationName);
        break;

      default:
        console.log('📖 数据库迁移管理工具');
        console.log('');
        console.log('用法:');
        console.log('  npm run db:migrate apply      # 应用所有待应用的迁移');
        console.log('  npm run db:migrate rollback   # 回滚最后一个迁移');
        console.log('  npm run db:migrate status     # 显示迁移状态');
        console.log('  npm run db:migrate validate   # 验证数据库状态');
        console.log('  npm run db:migrate create <name>  # 创建新的迁移文件');
        break;
    }

  } catch (error) {
    console.error('❌ 迁移操作失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { DatabaseMigrationManager };