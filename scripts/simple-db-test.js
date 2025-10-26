#!/usr/bin/env node

/**
 * 简化的数据库连接测试
 * 使用系统工具而非npm包
 */

const { execSync } = require('child_process');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n🔍 ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

async function checkPortConnection() {
  logSection('端口连通性测试');

  try {
    execSync('nc -z localhost 5432', { timeout: 3000 });
    logSuccess('PostgreSQL端口5432可访问');
    return true;
  } catch (error) {
    logError('端口5432无法访问 - PostgreSQL可能未运行');
    return false;
  }
}

async function checkWithLsof() {
  logSection('端口占用检查');

  try {
    const result = execSync('lsof -i :5432', { encoding: 'utf8' });
    logSuccess('端口5432被占用:');
    logInfo(result.trim());
    return true;
  } catch (error) {
    logWarning('端口5432未被占用或无权限查看');
    return false;
  }
}

async function checkBrewServices() {
  logSection('Homebrew服务检查');

  try {
    const result = execSync('brew services list | grep postgresql', {
      encoding: 'utf8',
    });
    logInfo('PostgreSQL服务状态:');
    logInfo(result.trim());
    return result.includes('started');
  } catch (error) {
    logWarning('无法通过brew检查PostgreSQL状态');
    return false;
  }
}

async function suggestInstallation() {
  logSection('安装和配置建议');

  log('1. 安装PostgreSQL:', 'cyan');
  log('   brew install postgresql@15');
  log('   brew services start postgresql@15');

  log('\n2. 或者安装PostgreSQL.app:', 'cyan');
  log('   下载: https://postgresapp.com/');
  log('   启动应用即可自动运行PostgreSQL');

  log('\n3. 创建数据库:', 'cyan');
  log('   createdb mindnote_dev');

  log('\n4. 创建用户:', 'cyan');
  log('   psql postgres');
  log("   CREATE USER mindnote WITH PASSWORD 'SecureDevPass123!';");
  log('   ALTER USER mindnote CREATEDB;');
  log('   GRANT ALL PRIVILEGES ON DATABASE mindnote_dev TO mindnote;');

  log('\n5. 验证安装:', 'cyan');
  log(
    '   psql -h localhost -U mindnote -d mindnote_dev -c "SELECT version();"',
  );
}

async function checkSystemPostgres() {
  logSection('系统PostgreSQL检查');

  try {
    // 检查是否有psql命令
    execSync('which psql', { encoding: 'utf8' });
    logSuccess('psql命令已安装');

    try {
      const version = execSync('psql --version', { encoding: 'utf8' });
      logInfo(`PostgreSQL客户端版本: ${version.trim()}`);
    } catch (error) {
      logWarning('无法获取psql版本');
    }

    return true;
  } catch (error) {
    logError('psql命令未找到 - 需要安装PostgreSQL客户端');
    return false;
  }
}

async function main() {
  log('🚀 MindNote 简化数据库连接检查', 'bright');
  log('检查时间:', new Date().toLocaleString('zh-CN'));

  const results = [];

  // 1. 检查端口
  const portOpen = await checkPortConnection();
  results.push({ test: '端口连通性', success: portOpen });

  // 2. 检查系统PostgreSQL
  const hasPsql = await checkSystemPostgres();
  results.push({ test: 'PostgreSQL客户端', success: hasPsql });

  // 3. 检查服务状态
  const serviceRunning = await checkBrewServices();
  results.push({ test: '服务状态', success: serviceRunning });

  // 4. 检查端口占用
  const portUsed = await checkWithLsof();
  results.push({ test: '端口占用', success: portUsed });

  // 总结
  logSection('🎯 检查结果总结');

  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;

  log(
    `通过测试: ${passedTests}/${totalTests}`,
    passedTests === totalTests ? 'green' : 'yellow',
  );

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    log(`  ${status} ${result.test}`, result.success ? 'green' : 'red');
  });

  if (passedTests === totalTests) {
    logSuccess('🎉 数据库连接环境正常!');
    logInfo('可以尝试运行: npx prisma db push');
  } else {
    logWarning('发现配置问题，需要安装或配置PostgreSQL');
    await suggestInstallation();
  }

  log('\n' + '='.repeat(60), 'cyan');
  log('数据库连接检查完成', 'bright');
  log('='.repeat(60), 'cyan');

  process.exit(passedTests === totalTests ? 0 : 1);
}

main().catch(error => {
  logError(`检查工具运行失败: ${error.message}`);
  process.exit(1);
});
