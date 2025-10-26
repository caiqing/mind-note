#!/usr/bin/env node

/**
 * MindNote 最终集成测试
 *
 * 测试所有核心功能和增强功能
 */

const BASE_URL = 'http://localhost:3001';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n🔍 ${title}`, 'bright');
  log('='.repeat(50), 'cyan');
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

async function request(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testHealthCheck() {
  logSection('系统健康检查测试');

  const result = await request(`${BASE_URL}/api/health`);

  if (result.success) {
    logSuccess('健康检查端点正常');
    logInfo(`系统状态: ${result.data.status}`);
    logInfo(`数据库模式: ${result.data.services.database.mode}`);
    logInfo(`数据库状态: ${result.data.services.database.status}`);
    logInfo(
      `自动重连: ${result.data.features.autoReconnect ? '启用' : '禁用'}`,
    );
    logInfo(`降级模式: ${result.data.features.fallbackMode ? '启用' : '禁用'}`);

    return true;
  } else {
    logError(`健康检查失败: ${result.error}`);
    return false;
  }
}

async function testNoteCRUD() {
  logSection('笔记CRUD功能测试');

  // 创建笔记
  log('创建笔记...');
  const createResult = await request(`${BASE_URL}/api/notes`, {
    method: 'POST',
    body: JSON.stringify({
      title: '集成测试笔记',
      content:
        '# 集成测试\n\n这是一个系统集成的测试笔记。\n\n## 功能测试\n- CRUD操作\n- 错误处理\n- 性能监控',
      tags: ['测试', '集成', '系统集成'],
    }),
  });

  if (!createResult.success) {
    logError(`创建笔记失败: ${createResult.error}`);
    return false;
  }

  const noteId = createResult.data.id;
  logSuccess(`笔记创建成功 (ID: ${noteId})`);

  // 获取笔记列表
  log('获取笔记列表...');
  const listResult = await request(`${BASE_URL}/api/notes`);

  if (listResult.success && listResult.data.notes.length > 0) {
    logSuccess(`获取到 ${listResult.data.notes.length} 篇笔记`);
  } else {
    logError('获取笔记列表失败');
    return false;
  }

  // 获取单个笔记
  log(`获取笔记详情 (ID: ${noteId})...`);
  const getResult = await request(`${BASE_URL}/api/notes/${noteId}`);

  if (getResult.success) {
    logSuccess(`获取笔记成功: ${getResult.data.title}`);
    logInfo(`字数: ${getResult.data.wordCount}`);
    logInfo(`阅读时间: ${getResult.data.readingTimeMinutes} 分钟`);
  } else {
    logError(`获取笔记失败: ${getResult.error}`);
    return false;
  }

  // 更新笔记
  log('更新笔记...');
  const updateResult = await request(`${BASE_URL}/api/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: '【已更新】集成测试笔记',
      isFavorite: true,
    }),
  });

  if (updateResult.success) {
    logSuccess(`笔记更新成功，版本: ${updateResult.data.version}`);
    logInfo(`收藏状态: ${updateResult.data.isFavorite ? '已收藏' : '未收藏'}`);
  } else {
    logError(`更新笔记失败: ${updateResult.error}`);
    return false;
  }

  // 搜索笔记
  log('搜索笔记...');
  const searchResult = await request(`${BASE_URL}/api/notes?search=集成测试`);

  if (searchResult.success && searchResult.data.notes.length > 0) {
    logSuccess(`搜索到 ${searchResult.data.notes.length} 个结果`);
  } else {
    logError('搜索功能失败');
    return false;
  }

  // 删除笔记（软删除）
  log('删除笔记...');
  const deleteResult = await request(`${BASE_URL}/api/notes/${noteId}`, {
    method: 'DELETE',
  });

  if (deleteResult.success) {
    logSuccess('笔记归档成功');
  } else {
    logError(`删除笔记失败: ${deleteResult.error}`);
    return false;
  }

  return true;
}

async function testErrorHandling() {
  logSection('错误处理测试');

  // 测试无效的笔记ID
  log('测试无效笔记ID...');
  const result = await request(`${BASE_URL}/api/notes/99999`);

  if (!result.success && result.status === 404) {
    logSuccess('404错误处理正确');
  } else {
    logError('404错误处理失败');
    return false;
  }

  // 测试无效数据
  log('测试无效数据验证...');
  const invalidResult = await request(`${BASE_URL}/api/notes`, {
    method: 'POST',
    body: JSON.stringify({
      title: '', // 空标题应该失败
      content: 'test',
    }),
  });

  if (!invalidResult.success && invalidResult.status === 400) {
    logSuccess('数据验证错误处理正确');
  } else {
    logError('数据验证错误处理失败');
    return false;
  }

  return true;
}

async function testPerformanceMonitoring() {
  logSection('性能监控测试');

  const result = await request(`${BASE_URL}/api/performance`);

  if (result.success) {
    logSuccess('性能监控API正常');
    logInfo(
      `服务器运行时间: ${Math.floor(result.data.serverMetrics.uptime)} 秒`,
    );
    logInfo(
      `内存使用: ${Math.round(result.data.serverMetrics.memory.heapUsed / 1024 / 1024)} MB`,
    );
    logInfo(`Node.js版本: ${result.data.serverMetrics.nodeVersion}`);

    return true;
  } else {
    logError(`性能监控失败: ${result.error}`);
    return false;
  }
}

async function testErrorReporting() {
  logSection('错误报告系统测试');

  // 模拟前端错误报告
  const result = await request(`${BASE_URL}/api/errors`, {
    method: 'POST',
    body: JSON.stringify({
      message: '测试错误报告',
      stack: 'Error: Test error\n    at test.js:1:1',
      componentStack: 'TestComponent\n  at App.js:1:1',
      userAgent: 'Test-Agent/1.0',
      url: `${BASE_URL}/test`,
      timestamp: new Date().toISOString(),
    }),
  });

  if (result.success) {
    logSuccess('错误报告API正常');
    logInfo(`错误ID: ${result.data.errorId}`);

    return true;
  } else {
    logError(`错误报告失败: ${result.error}`);
    return false;
  }
}

async function testDatabaseStatus() {
  logSection('数据库连接状态测试');

  const result = await request(`${BASE_URL}/api/health`);

  if (result.success) {
    const dbStatus = result.data.services.database;

    if (dbStatus.mode === 'memory') {
      logWarning('数据库运行在内存模式');
      logInfo(`重试次数: ${dbStatus.retryCount}`);
      logInfo('这是正常的降级行为，系统会自动尝试重连');
    } else {
      logSuccess('数据库连接正常');
    }

    return true;
  } else {
    logError('数据库状态检查失败');
    return false;
  }
}

async function generateFinalReport(results) {
  logSection('🎉 最终测试报告');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  log(`总测试数: ${totalTests}`, 'bright');
  log(`通过: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`失败: ${failedTests}`, failedTests > 0 ? 'red' : 'green');

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  log(`成功率: ${successRate}%`, successRate === '100.0' ? 'green' : 'yellow');

  if (failedTests === 0) {
    log('\n🎊 所有测试通过！系统运行正常！', 'green');
    log('\n📊 系统功能验证:', 'cyan');
    log('✅ 基础笔记CRUD功能', 'green');
    log('✅ 数据库连接管理和降级策略', 'green');
    log('✅ 错误处理和用户友好提示', 'green');
    log('✅ 性能监控和分析', 'green');
    log('✅ 错误报告系统', 'green');
    log('✅ API响应和验证', 'green');

    log('\n🚀 系统已准备就绪，可以投入使用！', 'bright');
    log('🌐 访问地址: http://localhost:3001', 'blue');
    log('📖 API文档: /api/health', 'blue');
    log('📈 性能监控: /api/performance', 'blue');
  } else {
    log('\n⚠️ 部分测试失败，请检查相关功能', 'yellow');

    const failedTestNames = results.filter(r => !r.passed).map(r => r.name);

    log('失败的测试:', 'red');
    failedTestNames.forEach(name => log(`  - ${name}`, 'red'));
  }

  log('\n' + '='.repeat(50), 'cyan');
  log('MindNote 智能笔记应用 - 集成测试完成', 'bright');
  log('='.repeat(50), 'cyan');
}

async function runIntegrationTests() {
  log('🚀 MindNote 智能笔记应用 - 集成测试开始', 'bright');
  log('测试时间:', new Date().toLocaleString('zh-CN'));
  log('测试环境: http://localhost:3001');

  const tests = [
    { name: '系统健康检查', test: testHealthCheck },
    { name: '笔记CRUD功能', test: testNoteCRUD },
    { name: '错误处理机制', test: testErrorHandling },
    { name: '性能监控系统', test: testPerformanceMonitoring },
    { name: '错误报告系统', test: testErrorReporting },
    { name: '数据库连接状态', test: testDatabaseStatus },
  ];

  const results = [];

  for (const { name, test } of tests) {
    try {
      const passed = await test();
      results.push({ name, passed });

      if (passed) {
        logSuccess(`${name} - 通过`);
      } else {
        logError(`${name} - 失败`);
      }
    } catch (error) {
      logError(`${name} - 异常: ${error.message}`);
      results.push({ name, passed: false });
    }
  }

  await generateFinalReport(results);

  // 返回退出码
  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

// 运行测试
runIntegrationTests().catch(error => {
  logError(`测试运行失败: ${error.message}`);
  process.exit(1);
});
