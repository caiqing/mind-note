#!/usr/bin/env node

/**
 * 安全密钥生成脚本
 *
 * 为生产环境生成强密码和API密钥
 */

const crypto = require('crypto');

// 生成强密码的函数
function generateStrongPassword(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';

  // 确保包含各种字符类型
  const hasUpperCase = /[A-Z]/;
  const hasLowerCase = /[a-z]/;
  const hasNumbers = /[0-9]/;
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/;

  do {
    password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(crypto.randomInt(0, charset.length));
    }
  } while (!hasUpperCase.test(password) ||
           !hasLowerCase.test(password) ||
           !hasNumbers.test(password) ||
           !hasSpecial.test(password));

  return password;
}

// 生成NextAuth密钥
function generateNextAuthSecret() {
  return crypto.randomBytes(32).toString('base64');
}

// 生成数据库强密码
function generateDatabasePassword() {
  return generateStrongPassword(32);
}

// 生成Redis密码
function generateRedisPassword() {
  return generateStrongPassword(24);
}

// 生成应用密钥
function generateAppSecret() {
  return crypto.randomBytes(64).toString('hex');
}

console.log('🔐 MindNote 安全密钥生成器\n');
console.log('请将以下生成的安全配置复制到您的 .env.local 文件中：\n');

console.log('# =============================================================================
# MindNote 生产环境安全配置
# 请妥善保管这些密钥，不要提交到版本控制系统
# =============================================================================\n');

console.log('# 数据库配置');
console.log(`POSTGRES_PASSWORD="${generateDatabasePassword()}"`);
console.log(`TEST_DATABASE_PASSWORD="${generateStrongPassword(24)}}"\n`);

console.log('# Redis配置');
console.log(`REDIS_PASSWORD="${generateRedisPassword()}"\n`);

console.log('# NextAuth.js配置');
console.log(`NEXTAUTH_SECRET="${generateNextAuthSecret()}"\n`);

console.log('# 应用安全密钥');
console.log(`APP_SECRET="${generateAppSecret()}"`);
console.log(`ENCRYPTION_KEY="${crypto.randomBytes(32).toString('hex')}"\n`);

console.log('# JWT配置');
console.log(`JWT_SECRET="${generateAppSecret()}"`);
console.log(`JWT_REFRESH_SECRET="${generateAppSecret()}"\n`);

console.log('# =============================================================================
# 安全提醒：
# 1. 请立即更改这些生成的密钥
# 2. 将 .env.local 添加到 .gitignore
# 3. 在生产环境中使用环境变量管理服务
# 4. 定期轮换密钥（建议每90天）
# 5. 使用强密码管理器存储这些密钥
# =============================================================================');