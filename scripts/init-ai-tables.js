// 初始化AI分析相关表

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function initAITables() {
  try {
    console.log('🚀 开始初始化AI分析相关表...')

    // 启用pgvector扩展
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`
    console.log('✅ pgvector扩展已启用')

    // 创建AI分析结果表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ai_analysis (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        summary TEXT,
        sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
        key_concepts TEXT[] DEFAULT '{}',
        categories JSONB DEFAULT '{}',
        tags JSONB DEFAULT '{}',
        ai_provider_id TEXT NOT NULL,
        model_version TEXT,
        confidence DECIMAL(3,2) DEFAULT 0,
        processing_time INTEGER DEFAULT 0,
        token_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        error TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✅ AI分析结果表已创建')

    // 创建向量嵌入表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS embedding_vectors (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        embedding bytea,
        model TEXT DEFAULT 'text-embedding-3-small',
        dimensions INTEGER DEFAULT 1536,
        checksum TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✅ 向量嵌入表已创建')

    // 创建内容分类表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS content_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#6B7280',
        icon TEXT,
        parent_id TEXT,
        level INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        note_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✅ 内容分类表已创建')

    // 创建分析日志表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS analysis_logs (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        ai_provider_id TEXT NOT NULL,
        model_version TEXT,
        request_type TEXT NOT NULL,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        cost DECIMAL(10,6) DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        response_time INTEGER,
        processing_time INTEGER,
        success BOOLEAN DEFAULT FALSE,
        error_code TEXT,
        error_message TEXT,
        quality JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✅ 分析日志表已创建')

    // 创建AI服务提供商表
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ai_providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        api_key_encrypted TEXT NOT NULL,
        endpoint TEXT,
        default_model TEXT,
        rate_limit INTEGER DEFAULT 60,
        cost_limit DECIMAL(10,4) DEFAULT 1.0,
        max_tokens INTEGER DEFAULT 4096,
        priority INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        fallback_enabled BOOLEAN DEFAULT TRUE,
        total_requests BIGINT DEFAULT 0,
        total_cost DECIMAL(12,6) DEFAULT 0,
        success_rate DECIMAL(5,4) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✅ AI服务提供商表已创建')

    // 创建向量索引
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_embedding_vectors_embedding
        ON embedding_vectors
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `
      console.log('✅ 向量索引已创建')
    } catch (error) {
      console.log('⚠️ 向量索引创建失败 (可能需要手动创建):', error.message)
    }

    // 插入默认内容分类
    await prisma.$executeRaw`
      INSERT INTO content_categories (id, name, description, color, icon, level, sort_order, is_active)
      VALUES
        ('tech', '技术', '技术相关内容', '#3B82F6', 'cpu', 1, 1, TRUE),
        ('work', '工作', '工作相关内容', '#10B981', 'briefcase', 1, 2, TRUE),
        ('personal', '个人', '个人生活记录', '#F59E0B', 'user', 1, 3, TRUE),
        ('study', '学习', '学习笔记和资料', '#8B5CF6', 'book', 1, 4, TRUE),
        ('idea', '想法', '创意和灵感', '#EC4899', 'lightbulb', 1, 5, TRUE),
        ('health', '健康', '健康相关内容', '#EF4444', 'heart', 1, 6, TRUE),
        ('finance', '财务', '财务和投资', '#059669', 'dollar-sign', 1, 7, TRUE),
        ('travel', '旅行', '旅行计划和记录', '#7C3AED', 'plane', 1, 8, TRUE),
        ('food', '美食', '美食和食谱', '#DC2626', 'utensils', 1, 9, TRUE),
        ('entertainment', '娱乐', '娱乐和休闲', '#EA580C', 'tv', 1, 10, TRUE)
      ON CONFLICT (id) DO NOTHING
    `
    console.log('✅ 默认内容分类已插入')

    console.log('🎉 AI分析功能数据库初始化完成!')

  } catch (error) {
    console.error('❌ 初始化失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

initAITables()
  .then(() => {
    console.log('✨ 初始化脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 初始化脚本执行失败:', error)
    process.exit(1)
  })