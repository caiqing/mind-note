#!/usr/bin/env node

/**
 * PostgreSQL数据库连接测试工具
 *
 * 用于诊断和测试数据库连接问题
 */

const { Client } = require('pg');

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

// 数据库连接配置
const dbConfigs = [
  {
    name: '主数据库配置',
    connectionString:
      'postgresql://mindnote:SecureDevPass123!@localhost:5432/mindnote_dev',
  },
  {
    name: '简化配置 (无密码)',
    connectionString: 'postgresql://localhost:5432/mindnote_dev',
  },
  {
    name: '默认PostgreSQL配置',
    connectionString: 'postgresql://postgres@localhost:5432/postgres',
  },
  {
    name: '本地开发配置',
    connectionString: 'postgresql://caiqing@localhost:5432/postgres',
  },
];

async function testConnection(config) {
  log(`\n测试配置: ${config.name}`, 'blue');
  log(`连接字符串: ${config.connectionString}`);

  const client = new Client({
    connectionString: config.connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 3000,
  });

  try {
    log('正在连接...', 'yellow');
    await client.connect();
    logSuccess('连接成功!');

    // 测试基本查询
    const result = await client.query(
      'SELECT version() as version, current_database() as database, current_user as user',
    );
    const { version, database, user } = result.rows[0];

    logInfo(`数据库版本: ${version.split(' ')[1] || 'Unknown'}`);
    logInfo(`当前数据库: ${database}`);
    logInfo(`当前用户: ${user}`);

    // 检查是否可以创建数据库
    if (database !== 'mindnote_dev') {
      log('检查是否可以创建 mindnote_dev 数据库...', 'yellow');
      try {
        await client.query('CREATE DATABASE mindnote_dev');
        logSuccess('mindnote_dev 数据库创建成功!');
      } catch (error) {
        if (error.message.includes('already exists')) {
          logSuccess('mindnote_dev 数据库已存在');
        } else {
          logWarning(`无法创建数据库: ${error.message}`);
        }
      }
    }

    // 检查扩展
    log('检查 pgvector 扩展...', 'yellow');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      logSuccess('pgvector 扩展已启用');
    } catch (error) {
      logWarning(`pgvector 扩展问题: ${error.message}`);
    }

    await client.end();
    return { success: true, config: config.name, database, user };
  } catch (error) {
    logError(`连接失败: ${error.message}`);

    try {
      await client.end();
    } catch (endError) {
      // 忽略关闭连接时的错误
    }

    return { success: false, config: config.name, error: error.message };
  }
}

async function testPortConnection() {
  logSection('端口连通性测试');

  const net = require('net');

  return new Promise(resolve => {
    const socket = new net.Socket();

    socket.setTimeout(3000);

    socket.connect(5432, 'localhost', () => {
      logSuccess('PostgreSQL端口5432可访问');
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      logError('连接超时 - PostgreSQL可能未运行或端口被阻塞');
      socket.destroy();
      resolve(false);
    });

    socket.on('error', err => {
      logError(`端口连接错误: ${err.message}`);
      socket.destroy();
      resolve(false);
    });
  });
}

async function checkPostgresProcess() {
  logSection('PostgreSQL进程检查');

  const { exec } = require('child_process');

  return new Promise(resolve => {
    exec('ps aux | grep postgres', (error, stdout, stderr) => {
      if (error) {
        logError(`无法检查进程: ${error.message}`);
        resolve(false);
        return;
      }

      const postgresLines = stdout
        .split('\n')
        .filter(line => line.includes('postgres') && !line.includes('grep'));

      if (postgresLines.length > 0) {
        logSuccess(`发现 ${postgresLines.length} 个PostgreSQL进程`);
        postgresLines.forEach(line => {
          logInfo(line.trim().substring(0, 100) + '...');
        });
        resolve(true);
      } else {
        logWarning('未发现PostgreSQL进程运行');
        resolve(false);
      }
    });
  });
}

async function suggestSolutions() {
  logSection('解决方案建议');

  log('1. 检查PostgreSQL是否已安装并运行:', 'cyan');
  log('   brew install postgresql  # 安装PostgreSQL');
  log('   brew services start postgresql  # 启动服务');
  log('   brew services list | grep postgresql  # 检查状态');

  log('\n2. 创建数据库和用户:', 'cyan');
  log('   psql postgres  # 连接到默认数据库');
  log("   CREATE USER mindnote WITH PASSWORD 'SecureDevPass123!';");
  log('   CREATE DATABASE mindnote_dev OWNER mindnote;');
  log('   GRANT ALL PRIVILEGES ON DATABASE mindnote_dev TO mindnote;');
  log('   \\l  # 列出数据库');
  log('   \\du  # 列出用户');

  log('\n3. 启用pgvector扩展:', 'cyan');
  log('   \\c mindnote_dev  # 连接到应用数据库');
  log('   CREATE EXTENSION IF NOT EXISTS vector;');

  log('\n4. 验证连接:', 'cyan');
  log(
    '   PGPASSWORD=SecureDevPass123! psql -h localhost -U mindnote -d mindnote_dev -c "SELECT version();"',
  );

  log('\n5. 如果使用Docker:', 'cyan');
  log(
    '   docker run --name postgres-mindnote -e POSTGRES_PASSWORD=SecureDevPass123! -e POSTGRES_DB=mindnote_dev -p 5432:5432 -d postgres:15',
  );
}

async function main() {
  log('🚀 MindNote 数据库连接诊断工具', 'bright');
  log('诊断时间:', new Date().toLocaleString('zh-CN'));

  // 1. 检查端口连通性
  const portOpen = await testPortConnection();

  // 2. 检查PostgreSQL进程
  const postgresRunning = await checkPostgresProcess();

  // 3. 测试各种连接配置
  logSection('数据库连接配置测试');

  const results = [];
  for (const config of dbConfigs) {
    const result = await testConnection(config);
    results.push(result);

    // 如果成功，就不继续测试其他配置了
    if (result.success) {
      logSuccess(`✨ 找到可用配置: ${config.name}`);
      break;
    }
  }

  // 4. 生成诊断报告
  logSection('🎯 诊断结果总结');

  const successfulConfigs = results.filter(r => r.success);
  const failedConfigs = results.filter(r => !r.success);

  if (successfulConfigs.length > 0) {
    logSuccess(`✅ 找到 ${successfulConfigs.length} 个可用配置`);
    successfulConfigs.forEach(config => {
      logInfo(
        `  - ${config.config}: 数据库=${config.database}, 用户=${config.user}`,
      );
    });
  } else {
    logError('❌ 所有配置都无法连接');
  }

  if (failedConfigs.length > 0) {
    logWarning(`${failedConfigs.length} 个配置连接失败:`);
    failedConfigs.forEach(config => {
      logInfo(`  - ${config.config}: ${config.error}`);
    });
  }

  // 5. 提供解决方案
  if (successfulConfigs.length === 0) {
    await suggestSolutions();
  }

  log('\n' + '='.repeat(60), 'cyan');
  log('数据库连接诊断完成', 'bright');
  log('='.repeat(60), 'cyan');

  // 设置退出码
  process.exit(successfulConfigs.length > 0 ? 0 : 1);
}

// 运行诊断
main().catch(error => {
  logError(`诊断工具运行失败: ${error.message}`);
  process.exit(1);
});
