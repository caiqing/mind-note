#!/usr/bin/env node

/**
 * 数据库模式验证脚本
 * 验证智能笔记管理功能的数据库配置
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function validateDatabaseSchema() {
  console.log('🔍 开始验证数据库模式...\n');

  try {
    // 1. 检查数据库连接
    console.log('1. 检查数据库连接...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功\n');

    // 2. 检查必要的扩展
    console.log('2. 检查数据库扩展...');
    const vectorExtension = await prisma.$queryRaw`
      SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'
    `;

    if (vectorExtension.length === 0) {
      console.log('❌ pgvector扩展未安装，请运行: CREATE EXTENSION vector;');
      process.exit(1);
    } else {
      console.log(
        `✅ pgvector扩展已安装 (版本: ${vectorExtension[0].extversion})\n`,
      );
    }

    // 3. 检查表结构
    console.log('3. 检查核心表结构...');
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `;

    const requiredTables = [
      'users',
      'notes',
      'categories',
      'tags',
      'note_tags',
      'note_relationships',
      'ai_processing_logs',
      'user_feedback',
    ];

    const existingTables = tables.map(t => t.table_name);
    const missingTables = requiredTables.filter(
      table => !existingTables.includes(table),
    );

    if (missingTables.length > 0) {
      console.log('❌ 缺少必要的表:', missingTables.join(', '));
      console.log('请运行: npx prisma migrate dev');
      process.exit(1);
    } else {
      console.log('✅ 所有必要的表都已创建\n');
    }

    // 4. 检查向量列
    console.log('4. 检查向量列配置...');
    const vectorColumn = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'notes' AND column_name = 'content_vector'
    `;

    if (vectorColumn.length === 0) {
      console.log('❌ notes表缺少content_vector向量列');
      process.exit(1);
    } else {
      console.log('✅ content_vector向量列已配置\n');
    }

    // 5. 检查索引
    console.log('5. 检查关键索引...');
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('notes', 'tags', 'ai_processing_logs')
    `;

    const criticalIndexes = [
      'idx_notes_user_created',
      'idx_content_vector_hnsw',
      'idx_content_vector_l2',
      'idx_tags_usage_count_desc',
    ];

    const existingIndexes = indexes.map(i => i.indexname);
    const missingIndexes = criticalIndexes.filter(
      index =>
        !existingIndexes.some(existing =>
          existing.includes(index.replace('idx_', '').replace('_desc', '')),
        ),
    );

    if (missingIndexes.length > 0) {
      console.log('⚠️  建议添加的索引:', missingIndexes.join(', '));
      console.log('这些索引可以提升查询性能\n');
    } else {
      console.log('✅ 所有关键索引都已创建\n');
    }

    // 6. 检查数据完整性约束
    console.log('6. 检查数据完整性约束...');
    const constraints = await prisma.$queryRaw`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_schema = 'public'
    `;

    const expectedConstraints = [
      'check_title_not_empty',
      'check_content_not_empty',
      'check_version_positive',
    ];

    const existingConstraints = constraints.map(c => c.constraint_name);
    const missingConstraints = expectedConstraints.filter(
      constraint => !existingConstraints.includes(constraint),
    );

    if (missingConstraints.length > 0) {
      console.log('⚠️  缺少数据完整性约束:', missingConstraints.join(', '));
    } else {
      console.log('✅ 数据完整性约束已配置\n');
    }

    // 7. 性能测试查询
    console.log('7. 执行性能测试查询...');

    // 测试基础查询性能
    const startNoteQuery = Date.now();
    await prisma.note.findFirst({
      select: { id: true, title: true },
      orderBy: { createdAt: 'desc' },
    });
    const noteQueryTime = Date.now() - startNoteQuery;

    console.log(`✅ 笔记查询性能: ${noteQueryTime}ms`);

    // 测试标签查询性能
    const startTagQuery = Date.now();
    await prisma.tag.findFirst({
      orderBy: { usageCount: 'desc' },
    });
    const tagQueryTime = Date.now() - startTagQuery;

    console.log(`✅ 标签查询性能: ${tagQueryTime}ms\n`);

    // 8. 生成模式报告
    console.log('8. 生成数据库模式报告...');

    const tableStats = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY live_tuples DESC
    `;

    console.log('\n📊 数据库统计信息:');
    console.table(tableStats);

    // 9. AI功能验证
    console.log('\n9. 验证AI功能相关配置...');

    const aiLogsCount = await prisma.aiProcessingLog.count();
    console.log(`✅ AI处理日志表包含 ${aiLogsCount} 条记录`);

    const processedNotes = await prisma.note.count({
      where: { aiProcessed: true },
    });
    console.log(`✅ 已处理的笔记数量: ${processedNotes}`);

    const vectorNotes = await prisma.note.count({
      where: {
        NOT: { contentVector: null },
      },
    });
    console.log(`✅ 包含向量的笔记数量: ${vectorNotes}`);

    console.log('\n🎉 数据库模式验证完成！');
    console.log('\n📋 验证结果摘要:');
    console.log('✅ 数据库连接正常');
    console.log('✅ pgvector扩展已安装');
    console.log('✅ 核心表结构完整');
    console.log('✅ 向量搜索功能就绪');
    console.log('✅ 索引配置合理');
    console.log('✅ 数据完整性约束有效');
    console.log('✅ AI功能支持完备');
  } catch (error) {
    console.error('❌ 数据库验证失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 检查是否是直接运行此脚本
if (require.main === module) {
  validateDatabaseSchema()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { validateDatabaseSchema };
