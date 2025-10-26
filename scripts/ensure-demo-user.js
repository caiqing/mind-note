#!/usr/bin/env node

/**
 * 确保数据库中有demo用户
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 确保demo用户存在...');

    // 检查用户是否存在
    let user = await prisma.user.findUnique({
      where: { id: 'demo-user' },
    });

    if (!user) {
      // 创建demo用户
      user = await prisma.user.create({
        data: {
          id: 'demo-user',
          email: 'demo@example.com',
          username: 'demo',
          passwordHash: 'demo-password-hash',
          fullName: 'Demo User',
          emailVerified: true,
        },
      });
      console.log('✅ Demo用户创建成功:', user.username);
    } else {
      console.log('✅ Demo用户已存在:', user.username);
    }

    console.log('用户ID:', user.id);
    console.log('用户名:', user.username);
    console.log('邮箱:', user.email);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
