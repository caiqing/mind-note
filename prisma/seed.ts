/**
 * 数据库种子数据脚本
 * 用于开发和测试环境的基础数据初始化
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化种子数据...');

  // 创建用户
  const hashedPassword = await bcrypt.hash('password123', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@mindnote.com' },
    update: {},
    create: {
      email: 'demo@mindnote.com',
      name: 'Demo User',
      password: hashedPassword,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mindnote.com' },
    update: {},
    create: {
      email: 'admin@mindnote.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('✅ 用户创建完成');
  console.log('📊 创建的数据统计:');
  console.log(`- 用户: 2`);
  console.log('');
  console.log('🔑 测试账号信息:');
  console.log('- 邮箱: demo@mindnote.com');
  console.log('- 密码: password123');
  console.log('');
  console.log('- 邮箱: admin@mindnote.com');
  console.log('- 密码: password123');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });