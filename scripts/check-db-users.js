#!/usr/bin/env node

/**
 * 查询数据库用户信息
 */

const { Client } = require('pg');

const client = new Client({
  connectionString:
    'postgresql://mindnote:dev_password@localhost:5432/mindnote_dev',
});

async function main() {
  try {
    await client.connect();

    console.log('📋 查询数据库用户信息...\n');

    // 查询用户
    const usersResult = await client.query(
      'SELECT id, username, email FROM users ORDER BY created_at DESC LIMIT 5',
    );

    if (usersResult.rows.length === 0) {
      console.log('❌ 数据库中没有用户');

      // 创建测试用户
      console.log('\n🔧 创建测试用户...');
      const createUserResult = await client.query(`
        INSERT INTO users (id, email, username, password_hash, full_name, email_verified)
        VALUES ('demo-user', 'demo@example.com', 'demo', 'hashed_password', 'Demo User', true)
        ON CONFLICT (id) DO NOTHING
        RETURNING id, username, email
      `);

      if (createUserResult.rows.length > 0) {
        console.log('✅ 测试用户创建成功:', createUserResult.rows[0]);
      } else {
        console.log('ℹ️ 测试用户已存在');
      }
    } else {
      console.log('✅ 找到以下用户:');
      usersResult.rows.forEach((user, index) => {
        console.log(
          `  ${index + 1}. ID: ${user.id}, 用户名: ${user.username}, 邮箱: ${user.email}`,
        );
      });
    }

    // 查询笔记数量
    const notesCountResult = await client.query(
      'SELECT COUNT(*) as count FROM notes',
    );
    console.log(`\n📝 数据库中共有 ${notesCountResult.rows[0].count} 条笔记`);

    await client.end();
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  }
}

main();
