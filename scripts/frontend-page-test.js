#!/usr/bin/env node

const http = require('http');

/**
 * 前端页面交互测试脚本
 * 测试所有页面是否能正常加载和响应
 */

async function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'MindNote-Frontend-Test/1.0',
        Accept: 'text/html,application/json',
      },
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body.slice(0, 500), // 只保留前500字符用于检查
          responseTime: Date.now() - req.startTime,
        });
      });
    });

    req.on('error', reject);
    req.startTime = Date.now();
    req.end();
  });
}

async function runFrontendTests() {
  console.log('🌐 开始前端页面交互测试...\n');

  const pages = [
    { name: '主页', path: '/', expectedStatus: 200 },
    { name: '笔记列表', path: '/notes', expectedStatus: 200 },
    { name: '简单笔记页面', path: '/notes/simple-page', expectedStatus: 200 },
    { name: '笔记详情页(动态)', path: '/notes/test-id', expectedStatus: 200 },
    { name: 'API健康检查', path: '/api/health', expectedStatus: 200 },
    { name: 'API笔记列表', path: '/api/notes', expectedStatus: 200 },
    { name: 'API性能指标', path: '/api/performance', expectedStatus: 200 },
    { name: 'API错误统计', path: '/api/errors', expectedStatus: 200 },
  ];

  const results = [];
  let passedTests = 0;
  let failedTests = 0;

  for (const page of pages) {
    console.log(`🔍 测试页面: ${page.name} (${page.path})`);

    try {
      const startTime = Date.now();
      const result = await makeRequest(page.path);
      const loadTime = Date.now() - startTime;

      const test = {
        name: page.name,
        path: page.path,
        status: result.statusCode,
        expectedStatus: page.expectedStatus,
        loadTime: loadTime,
        success: result.statusCode === page.expectedStatus,
        contentType: result.headers['content-type'] || 'unknown',
      };

      results.push(test);

      if (test.success) {
        console.log(`  ✅ 状态码: ${result.statusCode}`);
        console.log(`  ⚡ 加载时间: ${loadTime}ms`);
        console.log(`  📄 内容类型: ${test.contentType}`);
        passedTests++;
      } else {
        console.log(
          `  ❌ 状态码不匹配: 期望 ${page.expectedStatus}, 实际 ${result.statusCode}`,
        );
        console.log(`  📄 响应内容: ${result.body.slice(0, 200)}...`);
        failedTests++;
      }

      // 检查页面是否包含关键内容
      if (
        result.statusCode === 200 &&
        result.headers['content-type']?.includes('text/html')
      ) {
        if (result.body.includes('<html') && result.body.includes('</html>')) {
          console.log(`  ✅ HTML结构完整`);
        } else {
          console.log(`  ⚠️ HTML结构可能不完整`);
        }
      }
    } catch (error) {
      console.error(`  ❌ 请求失败: ${error.message}`);
      results.push({
        name: page.name,
        path: page.path,
        success: false,
        error: error.message,
      });
      failedTests++;
    }

    console.log(''); // 空行分隔
  }

  // 生成测试报告
  console.log('📋 前端页面测试报告');
  console.log('═'.repeat(60));
  console.log(`✅ 通过测试: ${passedTests}/${pages.length}`);
  console.log(`❌ 失败测试: ${failedTests}/${pages.length}`);
  console.log(`📊 成功率: ${((passedTests / pages.length) * 100).toFixed(1)}%`);

  console.log('\n📊 详细结果:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const loadTime = result.loadTime ? `${result.loadTime}ms` : 'N/A';
    console.log(
      `${status} ${result.name} (${result.path}) - ${result.status || 'ERROR'} - ${loadTime}`,
    );
  });

  // 性能分析
  const successfulPages = results.filter(r => r.success && r.loadTime);
  if (successfulPages.length > 0) {
    const avgLoadTime =
      successfulPages.reduce((sum, r) => sum + r.loadTime, 0) /
      successfulPages.length;
    const slowestPage = successfulPages.reduce((max, r) =>
      r.loadTime > max.loadTime ? r : max,
    );
    const fastestPage = successfulPages.reduce((min, r) =>
      r.loadTime < min.loadTime ? r : min,
    );

    console.log('\n⚡ 性能分析:');
    console.log(`   平均加载时间: ${Math.round(avgLoadTime)}ms`);
    console.log(`   最慢页面: ${slowestPage.name} (${slowestPage.loadTime}ms)`);
    console.log(`   最快页面: ${fastestPage.name} (${fastestPage.loadTime}ms)`);
  }

  // 总体评估
  console.log('\n🎯 总体评估:');
  if (passedTests === pages.length) {
    console.log('🎉 所有页面测试通过！前端页面运行正常。');
    if (successfulPages.every(p => p.loadTime < 1000)) {
      console.log('🚀 页面加载性能优秀，用户体验良好。');
    } else if (successfulPages.every(p => p.loadTime < 3000)) {
      console.log('👍 页面加载性能良好，可以接受。');
    } else {
      console.log('⚠️ 部分页面加载较慢，建议进行性能优化。');
    }
  } else if (passedTests >= pages.length * 0.8) {
    console.log('🟡 大部分页面测试通过，但有少量问题需要修复。');
  } else {
    console.log('🔴 多个页面测试失败，需要进行全面检查和修复。');
  }

  return {
    total: pages.length,
    passed: passedTests,
    failed: failedTests,
    successRate: (passedTests / pages.length) * 100,
    results: results,
  };
}

// 运行测试
runFrontendTests().catch(console.error);
