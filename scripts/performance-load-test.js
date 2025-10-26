#!/usr/bin/env node

const http = require('http');

// 性能负载测试脚本
const BASE_URL = 'http://localhost:3001';

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body,
          responseTime: Date.now() - req.startTime,
        });
      });
    });

    req.on('error', reject);
    req.startTime = Date.now();

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runLoadTest() {
  console.log('🚀 开始性能负载测试...');

  const tests = [
    { name: '健康检查', path: '/api/health', method: 'GET' },
    { name: '获取笔记列表', path: '/api/notes?page=1&limit=10', method: 'GET' },
    { name: '搜索笔记', path: '/api/notes/search?q=AI', method: 'GET' },
    { name: '性能指标', path: '/api/performance', method: 'GET' },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n📊 测试: ${test.name}`);

    const times = [];
    const successCount = { success: 0, error: 0 };

    // 运行10次请求
    for (let i = 0; i < 10; i++) {
      try {
        const result = await makeRequest(test.path, test.method);
        times.push(result.responseTime);
        if (result.statusCode < 400) {
          successCount.success++;
        } else {
          successCount.error++;
        }

        // 短暂延迟避免过载
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        successCount.error++;
        console.error(`❌ 请求失败: ${error.message}`);
      }
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    const result = {
      name: test.name,
      requests: 10,
      successRate: (successCount.success / 10) * 100,
      avgResponseTime: Math.round(avgTime),
      minResponseTime: minTime,
      maxResponseTime: maxTime,
    };

    results.push(result);

    console.log(`  ✅ 成功率: ${result.successRate}%`);
    console.log(`  ⚡ 平均响应时间: ${result.avgResponseTime}ms`);
    console.log(`  🚀 最快响应: ${result.minResponseTime}ms`);
    console.log(`  🐌 最慢响应: ${result.maxResponseTime}ms`);
  }

  // 生成性能报告
  console.log('\n📋 性能负载测试报告');
  console.log('═'.repeat(60));

  results.forEach(result => {
    console.log(`\n🔍 ${result.name}:`);
    console.log(`   成功率: ${result.successRate}%`);
    console.log(
      `   响应时间: 平均 ${result.avgResponseTime}ms (范围: ${result.minResponseTime}-${result.maxResponseTime}ms)`,
    );

    // 性能评估
    if (result.avgResponseTime < 100) {
      console.log(`   🟢 性能评级: 优秀`);
    } else if (result.avgResponseTime < 300) {
      console.log(`   🟡 性能评级: 良好`);
    } else if (result.avgResponseTime < 1000) {
      console.log(`   🟠 性能评级: 一般`);
    } else {
      console.log(`   🔴 性能评级: 需要优化`);
    }
  });

  // 总体评估
  const overallAvgTime =
    results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length;
  const overallSuccessRate =
    results.reduce((sum, r) => sum + r.successRate, 0) / results.length;

  console.log('\n🎯 总体评估:');
  console.log(`   整体成功率: ${overallSuccessRate.toFixed(1)}%`);
  console.log(`   整体平均响应时间: ${Math.round(overallAvgTime)}ms`);

  if (overallSuccessRate >= 95 && overallAvgTime < 300) {
    console.log('   ✅ 系统性能表现良好，可以进入生产环境！');
  } else if (overallSuccessRate >= 90 && overallAvgTime < 1000) {
    console.log('   ⚠️ 系统性能基本满足要求，建议进行优化');
  } else {
    console.log('   ❌ 系统性能需要进一步优化才能部署到生产环境');
  }
}

// 运行测试
runLoadTest().catch(console.error);
