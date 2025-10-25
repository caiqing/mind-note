// 设置向量索引

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setupVectorIndex() {
  try {
    console.log('🚀 开始设置向量索引...')

    // 将embedding字段从bytea转换为vector类型
    try {
      await prisma.$executeRaw`
        ALTER TABLE embedding_vectors
        ALTER COLUMN embedding TYPE vector(1536)
        USING embedding::vector
      `
      console.log('✅ embedding字段类型已转换为vector')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ embedding字段已经是vector类型')
      } else {
        console.log('⚠️ embedding字段类型转换失败:', error.message)
      }
    }

    // 创建向量索引
    try {
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_embedding_vectors_embedding
        ON embedding_vectors
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `
      console.log('✅ 向量索引创建成功')
    } catch (error) {
      console.log('⚠️ 向量索引创建失败:', error.message)
      console.log('💡 提示：您可能需要手动创建向量索引')
    }

    // 验证表结构
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'embedding_vectors'
      AND column_name = 'embedding'
    `

    console.log('📋 embedding字段信息:')
    console.table(result)

    console.log('🎉 向量索引设置完成!')

  } catch (error) {
    console.error('❌ 设置失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setupVectorIndex()
  .then(() => {
    console.log('✨ 向量索引设置脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 向量索引设置脚本执行失败:', error)
    process.exit(1)
  })