const { Client } = require('pg');

async function testDatabaseConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://mindnote:mindnote_dev_123@localhost:5432/mindnote_dev',
  });

  try {
    console.log('🔍 正在测试数据库连接...');
    await client.connect();
    console.log('✅ 数据库连接成功！');

    // 测试基本查询
    const result = await client.query('SELECT version() as version, current_database() as database, current_user as user');
    console.log('📊 数据库信息:');
    console.log(`   版本: ${result.rows[0].version}`);
    console.log(`   数据库: ${result.rows[0].database}`);
    console.log(`   用户: ${result.rows[0].user}`);

    // 检查pgvector扩展
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✅ pgvector扩展已安装');

      // 测试向量功能
      await client.query(`
        CREATE TABLE IF NOT EXISTS vector_test (
          id SERIAL PRIMARY KEY,
          embedding VECTOR(3)
        );
      `);
      console.log('✅ 向量表创建成功');

      // 插入测试向量
      await client.query(`
        INSERT INTO vector_test (embedding)
        VALUES ('[1,2,3]'), ('[4,5,6]')
        ON CONFLICT DO NOTHING;
      `);
      console.log('✅ 向量数据插入成功');

      // 测试向量相似性搜索
      const searchResult = await client.query(`
        SELECT id, embedding <=> '[1,2,3]' as distance
        FROM vector_test
        ORDER BY embedding <=> '[1,2,3]'
        LIMIT 5;
      `);
      console.log('🔍 向量搜索测试结果:');
      searchResult.rows.forEach(row => {
        console.log(`   ID: ${row.id}, 距离: ${row.distance}`);
      });

      // 清理测试表
      await client.query('DROP TABLE IF EXISTS vector_test;');
      console.log('🧹 测试表已清理');

    } catch (vectorError) {
      console.error('❌ 向量功能测试失败:', vectorError.message);
    }

    console.log('\n🎉 数据库环境配置验证完成！');

  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testDatabaseConnection();