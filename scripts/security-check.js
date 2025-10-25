#!/usr/bin/env node

/**
 * MindNote 安全检查工具
 *
 * 检查环境变量安全性并提供修复建议
 */

const fs = require('fs');
const path = require('path');

// 模拟环境验证器 (简化版本)
class SecurityChecker {
  static checkPasswordStrength(password) {
    if (!password || password.length < 8) return false;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecial;
  }

  static checkSecurityIssues(content) {
    const issues = [];

    // 检查明文密码
    if (content.includes('sk-example') || content.includes('example-key')) {
      issues.push({
        type: 'critical',
        message: '发现示例API密钥',
        line: this.findLineNumber(content, 'sk-example')
      });
    }

    if (content.includes('dev_password') || content.includes('test_password')) {
      issues.push({
        type: 'high',
        message: '发现开发/测试密码',
        line: this.findLineNumber(content, 'dev_password')
      });
    }

    if (content.includes('localhost:3000') && !content.includes('localhost:3000')) {
      // 这是正常情况，不算问题
    }

    return issues;
  }

  static findLineNumber(content, pattern) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pattern)) {
        return i + 1;
      }
    }
    return null;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🔒 MindNote 安全检查工具\n');

  switch (command) {
    case 'check':
      await checkEnvironment();
      break;
    case 'generate':
      generateSecureConfig();
      break;
    case 'fix':
      await fixSecurityIssues();
      break;
    default:
      showUsage();
  }
}

function showUsage() {
  console.log('用法:');
  console.log('  node scripts/security-check.js check    - 检查环境变量安全性');
  console.log('  node scripts/security-check.js generate - 生成安全配置');
  console.log('  node scripts/security-check.js fix      - 修复安全问题');
  console.log('');
  console.log('示例:');
  console.log('  node scripts/security-check.js check .env.local');
  console.log('  node scripts/security-check.js generate');
}

async function checkEnvironment() {
  const envFile = process.argv[3] || '.env.local';

  if (!fs.existsSync(envFile)) {
    console.log(`❌ 文件不存在: ${envFile}`);
    console.log('💡 提示: 使用 "node scripts/security-check.js generate" 生成安全配置模板');
    return;
  }

  try {
    const content = fs.readFileSync(envFile, 'utf-8');
    const issues = SecurityChecker.checkSecurityIssues(content);

    console.log(`📄 检查文件: ${envFile}\n`);

    if (issues.length === 0) {
      console.log('✅ 未发现明显的安全问题');
      console.log('🎉 您的环境配置看起来是安全的！');
      return;
    }

    console.log(`⚠️ 发现 ${issues.length} 个安全问题:\n`);

    issues.forEach((issue, index) => {
      const icon = issue.type === 'critical' ? '🚨' : issue.type === 'high' ? '⚠️' : '💡';
      console.log(`${icon} ${index + 1}. ${issue.message} (行 ${issue.line || '?'})`);
    });

    console.log('\n🛠️ 修复建议:');
    console.log('1. 运行 "node scripts/security-check.js generate" 生成安全配置');
    console.log('2. 使用生成的配置替换现有配置');
    console.log('3. 配置真实的AI服务API密钥');
    console.log('4. 确保 .env.local 已添加到 .gitignore');

  } catch (error) {
    console.log(`❌ 读取文件失败: ${error.message}`);
  }
}

function generateSecureConfig() {
  const crypto = require('crypto');

  const generatePassword = (length = 32) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(crypto.randomInt(0, charset.length));
    }
    return password;
  };

  const secureConfig = `# =============================================================================
# MindNote 安全环境配置
# 由安全工具自动生成 - 请根据需要调整
# =============================================================================

# 数据库配置
POSTGRES_PASSWORD="${generatePassword(32)}"
TEST_DATABASE_PASSWORD="${generatePassword(24)}"

# Redis配置
REDIS_PASSWORD="${generatePassword(24)}"

# NextAuth.js配置
NEXTAUTH_SECRET="${crypto.randomBytes(32).toString('base64')}"

# 应用安全密钥
APP_SECRET="${crypto.randomBytes(64).toString('hex')}"
ENCRYPTION_KEY="${crypto.randomBytes(32).toString('hex')}"
JWT_SECRET="${crypto.randomBytes(64).toString('hex')}"

# AI服务配置 (请配置真实API密钥)
# 推荐使用本地Ollama: http://localhost:11434
# 或配置以下服务之一:
# ZHIPU_API_KEY="your-zhipu-api-key"
# DEEPSEEK_API_KEY="your-deepseek-api-key"
# OPENAI_API_KEY="your-openai-api-key"
# ANTHROPIC_API_KEY="your-anthropic-api-key"

# AI服务优先级
AI_PROVIDERS_PRIORITY="ollama,zhipu,deepseek,openai,anthropic"
AI_PRIMARY_PROVIDER="ollama"
AI_FALLBACK_PROVIDER="zhipu"

# =============================================================================
# 安全提醒:
# 1. 请立即配置真实的AI服务API密钥
# 2. 将此配置保存到 .env.local 文件
# 3. 确保 .env.local 已添加到 .gitignore
# 4. 定期轮换密钥 (建议每90天)
# =============================================================================
`;

  const outputFile = '.env.local.secure';
  fs.writeFileSync(outputFile, secureConfig);

  console.log(`✅ 安全配置已生成: ${outputFile}`);
  console.log('');
  console.log('📋 下一步操作:');
  console.log(`1. 检查生成的配置: cat ${outputFile}`);
  console.log('2. 配置真实的AI服务API密钥');
  console.log(`3. 复制到环境文件: cp ${outputFile} .env.local`);
  console.log('4. 重启开发服务器');
  console.log('');
  console.log('🔐 安全提示:');
  console.log('- 请妥善保管这些密钥');
  console.log('- 不要将包含真实密钥的文件提交到Git');
  console.log('- 生产环境请使用环境变量管理服务');
}

async function fixSecurityIssues() {
  const envFile = '.env.local';
  const templateFile = '.env.local.template';

  console.log('🔧 开始修复安全问题...\n');

  // 备份原文件
  if (fs.existsSync(envFile)) {
    const backupFile = `${envFile}.backup.${Date.now()}`;
    fs.copyFileSync(envFile, backupFile);
    console.log(`✅ 原文件已备份: ${backupFile}`);
  }

  // 检查是否存在模板文件
  if (!fs.existsSync(templateFile)) {
    console.log('❌ 模板文件不存在，请先生成安全配置');
    console.log('💡 运行: node scripts/security-check.js generate');
    return;
  }

  console.log('📝 安全问题修复建议:');
  console.log('');
  console.log('1. 使用安全配置模板替换现有配置');
  console.log('2. 配置真实的AI服务API密钥');
  console.log('3. 验证所有密钥都已正确配置');
  console.log('');
  console.log('🚀 执行修复:');
  console.log(`cp ${templateFile} ${envFile}`);
  console.log('# 然后编辑 .env.local 文件，配置真实的API密钥');
  console.log('npm run dev  # 重启开发服务器');
}

// 运行主函数
main().catch(console.error);