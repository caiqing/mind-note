// AI功能数据库迁移脚本

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function runMigration() {
  try {
    console.log('🚀 开始执行AI分析功能数据库迁移...')

    // 读取SQL迁移文件
    const sqlContent = readFileSync(
      join(process.cwd(), 'prisma/migrations/001_add_ai_analysis.sql'),
      'utf-8'
    )

    // 分割SQL语句并逐个执行
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📝 找到 ${statements.length} 个SQL语句`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      if (statement.trim()) {
        try {
          console.log(`⚡ 执行语句 ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
          await prisma.$executeRawUnsafe(statement)
          console.log(`✅ 语句 ${i + 1} 执行成功`)
        } catch (error) {
          // 某些语句可能已经存在，忽略相关错误
          if (error.message.includes('already exists') ||
              error.message.includes('does not exist')) {
            console.log(`⚠️ 语句 ${i + 1} 已存在或忽略: ${error.message}`)
          } else {
            console.error(`❌ 语句 ${i + 1} 执行失败:`, error.message)
            throw error
          }
        }
      }
    }

    console.log('🎉 AI分析功能数据库迁移完成!')

    // 验证表是否创建成功
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('ai_analysis', 'embedding_vectors', 'content_categories', 'analysis_logs', 'ai_providers')
    `

    console.log('📋 验证表创建情况:')
    console.table(tables)

    // 验证分类数据是否插入成功
    const categories = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM content_categories WHERE is_active = true
    `
    console.log(`📊 插入了 ${categories[0].count} 个默认分类`)

  } catch (error) {
    console.error('❌ 迁移失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 运行迁移
runMigration()
  .then(() => {
    console.log('✨ 迁移脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 迁移脚本执行失败:', error)
    process.exit(1)
  })