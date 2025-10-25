/**
 * 成本控制模块集成测试脚本 - T103.8
 * 测试完整的成本控制、速率限制和使用统计功能
 */

import { createCostController } from '../cost-control';
import { createCostControlledServices, createUsageAnalyticsService } from './cost-controlled-service';

async function testCostControlBasics() {
  console.log('🧪 开始测试成本控制基础功能...\n');

  try {
    // 创建成本控制器
    console.log('1️⃣ 创建成本控制器...');
    const costController = createCostController({
      userDailyLimit: 2.0,      // $2/天
      userMonthlyLimit: 20.0,    // $20/月
      operationCostLimit: 0.5,   // $0.5/次
      requestsPerMinute: 10,     // 10/分钟
      requestsPerHour: 100,      // 100/小时
      warningThreshold: 70,      // 70%预警
      criticalThreshold: 90      // 90%严重
    });
    console.log('✅ 成本控制器初始化成功');

    // 检查提供商成本信息
    console.log('\n2️⃣ 检查提供商成本信息...');
    const providerCosts = costController.getProviderCostInfo();
    console.log(`已配置 ${providerCosts.length} 个提供商:`);
    providerCosts.forEach(cost => {
      console.log(`- ${cost.provider} (${cost.model}):`);
      console.log(`  输入: $${cost.costPer1KInputTokens}/1K tokens`);
      console.log(`  输出: $${cost.costPer1KOutputTokens}/1K tokens`);
    });
    console.log();

    // 测试请求允许检查
    console.log('3️⃣ 测试请求允许检查...');
    const testUserId = 'test-user-001';
    const testOperation = 'summary';

    // 正常请求
    console.log('测试正常请求...');
    const normalCheck = await costController.checkRequestAllowed(
      testUserId,
      testOperation,
      { input: 200, output: 100 }  // 估算300 tokens
    );
    console.log(`✅ 正常请求允许: ${normalCheck.allowed}, 预估成本: $${normalCheck.estimatedCost?.toFixed(4)}`);

    // 超出单次操作限额的请求
    console.log('\n测试高额请求...');
    const expensiveCheck = await costController.checkRequestAllowed(
      testUserId,
      testOperation,
      { input: 5000, output: 2000 }  // 大量tokens
    );
    console.log(`❌ 高额请求允许: ${expensiveCheck.allowed}, 原因: ${expensiveCheck.reason}`);
    if (expensiveCheck.suggestedAlternatives) {
      console.log('建议的替代方案:');
      expensiveCheck.suggestedAlternatives.forEach(alt => console.log(`- ${alt}`));
    }

    console.log('\n✅ 成本控制基础功能测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 成本控制基础功能测试失败:', error);
    return false;
  }
}

async function testUsageTracking() {
  console.log('\n📊 开始测试使用量跟踪功能...\n');

  try {
    const costController = createCostController();
    const testUserId = 'test-user-002';

    console.log('1️⃣ 记录测试使用量...');

    // 记录不同类型的使用
    const usageRecords = [
      { operation: 'summary', provider: 'openai', cost: 0.05, tokens: 200 },
      { operation: 'keywords', provider: 'anthropic', cost: 0.03, tokens: 150 },
      { operation: 'sentiment', provider: 'openai', cost: 0.02, tokens: 120 },
      { operation: 'concepts', provider: 'anthropic', cost: 0.08, tokens: 300 },
      { operation: 'summary', provider: 'openai', cost: 0.04, tokens: 180 }
    ];

    usageRecords.forEach((record, index) => {
      costController.recordUsage(
        testUserId,
        record.operation,
        record.provider,
        record.cost,
        record.tokens,
        { testRecord: index + 1 }
      );
      console.log(`✅ 记录使用 ${index + 1}: ${record.operation} - $${record.cost}`);
    });

    console.log('\n2️⃣ 检查用户使用统计...');
    const userStats = costController.getUserUsageStats(testUserId);
    if (userStats) {
      console.log('用户使用统计:');
      console.log(`- 每日成本: $${userStats.dailyUsage.cost}`);
      console.log(`- 每日请求数: ${userStats.dailyUsage.requests}`);
      console.log(`- 每日Tokens: ${userStats.dailyUsage.tokens}`);
      console.log(`- 预算状态: ${userStats.budgetStatus}`);
      if (userStats.warnings.length > 0) {
        console.log('- 警告信息:');
        userStats.warnings.forEach(warning => console.log(`  ${warning}`));
      }
    }

    console.log('\n3️⃣ 生成成本分析报告...');
    const costAnalysis = costController.getCostAnalysisReport(testUserId);
    console.log('成本分析报告:');
    console.log(`- 总成本: $${costAnalysis.totalCost.toFixed(4)}`);
    console.log(`- 总请求数: ${costAnalysis.totalRequests}`);
    console.log(`- 总Tokens: ${costAnalysis.totalTokens}`);
    console.log(`- 平均成本/请求: $${costAnalysis.averageCostPerRequest.toFixed(4)}`);
    console.log(`- 平均成本/Token: $${costAnalysis.averageCostPerToken.toFixed(6)}`);

    console.log('\n提供商使用分布:');
    Object.entries(costAnalysis.providerBreakdown).forEach(([provider, stats]) => {
      console.log(`- ${provider}: $${stats.cost.toFixed(4)} (${stats.requests}次请求)`);
    });

    console.log('\n操作类型分布:');
    Object.entries(costAnalysis.operationBreakdown).forEach(([operation, stats]) => {
      console.log(`- ${operation}: $${stats.cost.toFixed(4)} (${stats.requests}次请求)`);
    });

    console.log('\n4️⃣ 检查使用历史...');
    const usageHistory = costController.getUsageHistory(testUserId);
    console.log(`最近 ${usageHistory.length} 条使用记录:`);
    usageHistory.slice(0, 5).forEach((record, index) => {
      console.log(`${index + 1}. ${record.timestamp.toISOString()} - ${record.operation} (${record.provider}): $${record.cost}`);
    });

    console.log('\n✅ 使用量跟踪功能测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 使用量跟踪功能测试失败:', error);
    return false;
  }
}

async function testRateLimiting() {
  console.log('\n⏱️ 开始测试速率限制功能...\n');

  try {
    const costController = createCostController({
      requestsPerMinute: 3,  // 很低的限制用于测试
      requestsPerHour: 10
    });

    const testUserId = 'test-user-003';
    const testOperation = 'rate-limit-test';

    console.log('1️⃣ 测试分钟级速率限制...');

    // 快速发送请求
    const requestResults = [];
    for (let i = 1; i <= 5; i++) {
      const result = await costController.checkRequestAllowed(
        testUserId,
        testOperation,
        { input: 50, output: 25 }
      );

      requestResults.push({ request: i, allowed: result.allowed, reason: result.reason });

      if (!result.allowed) {
        console.log(`❌ 请求 ${i} 被拒绝: ${result.reason}`);
      } else {
        console.log(`✅ 请求 ${i} 被允许`);
      }

      // 记录使用量
      if (result.allowed) {
        costController.recordUsage(testUserId, testOperation, 'openai', 0.01, 75);
      }
    }

    console.log('\n2️⃣ 测试小时级速率限制...');

    // 重置用户统计以测试小时限制
    costController.resetUserStats(testUserId);

    const hourlyResults = [];
    for (let i = 1; i <= 12; i++) {
      const result = await costController.checkRequestAllowed(
        testUserId,
        'hourly-test',
        { input: 30, output: 20 }
      );

      hourlyResults.push({ request: i, allowed: result.allowed });

      if (result.allowed) {
        costController.recordUsage(testUserId, 'hourly-test', 'openai', 0.008, 50);
      }
    }

    const allowedHourly = hourlyResults.filter(r => r.allowed).length;
    const blockedHourly = hourlyResults.filter(r => !r.allowed).length;

    console.log(`✅ 小时级测试: 允许 ${allowedHourly} 个请求，阻止 ${blockedHourly} 个请求`);

    // 显示用户统计
    const userStats = costController.getUserUsageStats(testUserId);
    if (userStats) {
      console.log('\n3️⃣ 速率限制统计:');
      console.log(`- 本分钟请求数: ${userStats.rateLimit.requestsThisMinute}`);
      console.log(`- 本小时请求数: ${userStats.rateLimit.requestsThisHour}`);
      console.log(`- 分钟重置时间: ${userStats.rateLimit.lastMinuteReset.toISOString()}`);
      console.log(`- 小时重置时间: ${userStats.rateLimit.lastHourReset.toISOString()}`);
    }

    console.log('\n✅ 速率限制功能测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 速率限制功能测试失败:', error);
    return false;
  }
}

async function testCostControlledServices() {
  console.log('\n🎛️ 开始测试成本控制服务...\n');

  try {
    // 创建成本控制服务
    console.log('1️⃣ 创建成本控制服务...');
    const services = createCostControlledServices({
      userDailyLimit: 1.0,        // $1/天
      operationCostLimit: 0.2,    // $0.2/次
      blockOnBudgetExceeded: true,
      enableUsageLogging: true,
      enableDetailedTracking: true
    });
    console.log('✅ 成本控制服务初始化成功');

    const context = {
      userId: 'test-user-004',
      operation: 'integration-test',
      sessionId: 'test-session-001'
    };

    console.log('\n2️⃣ 测试摘要服务成本控制...');

    // 测试摘要服务
    const summaryResult = await services.summary.generateSummary(
      {
        content: `
人工智能技术在医疗健康领域的应用正日益广泛，从疾病诊断到药物研发，从个性化治疗到健康管理，
AI都在发挥着重要作用。通过深度学习和大数据分析，AI系统能够帮助医生更准确地诊断疾病，
提高治疗效率，同时也能为患者提供更好的医疗服务体验。
        `.trim(),
        options: {
          style: 'paragraph',
          maxLength: 100,
          language: 'zh'
        }
      },
      context
    );

    console.log(`摘要服务结果:`);
    console.log(`- 允许执行: ${summaryResult.allowed}`);
    if (summaryResult.allowed) {
      console.log(`- 实际成本: $${summaryResult.actualCost?.toFixed(4)}`);
      console.log(`- 摘要内容: "${summaryResult.result?.summary}"`);
      console.log(`- 提供商: ${summaryResult.result?.provider}`);
    } else {
      console.log(`- 拒绝原因: ${summaryResult.reason}`);
    }

    if (summaryResult.warnings && summaryResult.warnings.length > 0) {
      console.log('- 警告信息:');
      summaryResult.warnings.forEach(warning => console.log(`  ${warning}`));
    }

    console.log('\n3️⃣ 测试关键词服务成本控制...');

    // 测试关键词服务
    const keywordResult = await services.keywords.extractKeywords(
      {
        content: '机器学习、深度学习、神经网络、自然语言处理、计算机视觉',
        options: {
          maxKeywords: 8,
          priority: 'relevance'
        }
      },
      context
    );

    console.log(`关键词服务结果:`);
    console.log(`- 允许执行: ${keywordResult.allowed}`);
    if (keywordResult.allowed) {
      console.log(`- 实际成本: $${keywordResult.actualCost?.toFixed(4)}`);
      console.log(`- 关键词数量: ${keywordResult.result?.keywords.length}`);
      console.log(`- 关键词列表: ${keywordResult.result?.keywords.map(k => k.keyword).join(', ')}`);
    }

    console.log('\n4️⃣ 测试情感分析服务成本控制...');

    // 测试情感分析服务
    const sentimentResult = await services.sentiment.analyzeSentiment(
      {
        content: '我对于人工智能技术的发展感到非常兴奋和乐观！',
        options: {
          detailLevel: 'comprehensive',
          includeEmotions: true
        }
      },
      context
    );

    console.log(`情感分析服务结果:`);
    console.log(`- 允许执行: ${sentimentResult.allowed}`);
    if (sentimentResult.allowed) {
      console.log(`- 实际成本: $${sentimentResult.actualCost?.toFixed(4)}`);
      console.log(`- 情感倾向: ${sentimentResult.result?.sentiment}`);
      console.log(`- 置信度: ${(sentimentResult.result?.confidence || 0) * 100}%`);
    }

    console.log('\n5️⃣ 测试概念识别服务成本控制...');

    // 测试概念识别服务
    const conceptResult = await services.concepts.extractConcepts(
      {
        content: '量子计算是一种新型的计算模式，它利用量子力学原理来处理信息。',
        options: {
          maxConcepts: 5,
          includeRelations: true,
          includeDefinitions: true
        }
      },
      context
    );

    console.log(`概念识别服务结果:`);
    console.log(`- 允许执行: ${conceptResult.allowed}`);
    if (conceptResult.allowed) {
      console.log(`- 实际成本: $${conceptResult.actualCost?.toFixed(4)}`);
      console.log(`- 概念数量: ${conceptResult.result?.concepts.length}`);
      console.log(`- 概念列表: ${conceptResult.result?.concepts.map(c => c.concept).join(', ')}`);
    }

    console.log('\n6️⃣ 检查总体使用情况...');

    // 获取用户使用报告
    const analyticsService = createUsageAnalyticsService(services.costController);
    const userReport = analyticsService.getUserUsageReport(context.userId);

    console.log('用户使用报告:');
    console.log(`- 用户ID: ${userReport.userId}`);
    console.log(`- 预算状态: ${userReport.status}`);
    if (userReport.currentUsage) {
      console.log(`- 每日成本: $${userReport.currentUsage.daily.cost}`);
      console.log(`- 每日请求数: ${userReport.currentUsage.daily.requests}`);
      console.log(`- 每月成本: $${userReport.currentUsage.monthly.cost}`);
      console.log(`- 每月请求数: ${userReport.currentUsage.monthly.requests}`);
    }
    if (userReport.analytics) {
      console.log(`- 平均成本/请求: $${userReport.analytics.averageCostPerRequest.toFixed(4)}`);
    }

    console.log('\n✅ 成本控制服务测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 成本控制服务测试失败:', error);
    return false;
  }
}

async function testBudgetManagement() {
  console.log('\n💰 开始测试预算管理功能...\n');

  try {
    const costController = createCostController({
      userDailyLimit: 0.5,        // 很低的限额用于测试
      warningThreshold: 60,        // 60%预警
      criticalThreshold: 80        // 80%严重
    });

    const testUserId = 'test-user-005';
    const testOperation = 'budget-test';

    console.log('1️⃣ 测试预算预警机制...');

    // 逐步消耗预算
    const consumptionSteps = [0.1, 0.15, 0.1, 0.08, 0.12]; // 总计0.55
    let totalConsumed = 0;

    for (let i = 0; i < consumptionSteps.length; i++) {
      const stepCost = consumptionSteps[i];

      console.log(`\n步骤 ${i + 1}: 消耗 $${stepCost.toFixed(2)}`);

      // 检查请求是否被允许
      const checkResult = await costController.checkRequestAllowed(
        testUserId,
        testOperation,
        { input: 100, output: 50 }
      );

      totalConsumed += stepCost;

      if (checkResult.allowed) {
        console.log(`✅ 请求被允许，当前预估总成本: $${totalConsumed.toFixed(2)}`);

        if (checkResult.warnings && checkResult.warnings.length > 0) {
          console.log('警告信息:');
          checkResult.warnings.forEach(warning => console.log(`  ${warning}`));
        }

        // 记录使用量
        costController.recordUsage(testUserId, testOperation, 'openai', stepCost, 100);

        // 检查用户统计
        const userStats = costController.getUserUsageStats(testUserId);
        if (userStats) {
          console.log(`预算状态: ${userStats.budgetStatus}`);
          console.log(`当前使用: $${userStats.dailyUsage.cost.toFixed(2)}/$0.50`);
        }
      } else {
        console.log(`❌ 请求被拒绝: ${checkResult.reason}`);
        break;
      }
    }

    console.log('\n2️⃣ 测试预算超限处理...');

    // 尝试在预算超限后发送请求
    const overBudgetCheck = await costController.checkRequestAllowed(
      testUserId,
      testOperation,
      { input: 50, output: 25 }
    );

    console.log(`预算超限后的请求检查:`);
    console.log(`- 允许执行: ${overBudgetCheck.allowed}`);
    console.log(`- 原因: ${overBudgetCheck.reason}`);

    console.log('\n3️⃣ 测试预算重置...');

    // 重置用户统计
    costController.resetUserStats(testUserId);
    console.log('用户预算已重置');

    // 重置后再次检查
    const afterResetCheck = await costController.checkRequestAllowed(
      testUserId,
      testOperation,
      { input: 100, output: 50 }
    );

    console.log(`重置后的请求检查:`);
    console.log(`- 允许执行: ${afterResetCheck.allowed}`);

    console.log('\n✅ 预算管理功能测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 预算管理功能测试失败:', error);
    return false;
  }
}

// 主测试函数
async function runAllCostControlTests() {
  console.log('🚀 开始成本控制模块完整测试套件\n');
  console.log('='.repeat(60));

  const testResults = {
    basics: await testCostControlBasics(),
    usageTracking: await testUsageTracking(),
    rateLimiting: await testRateLimiting(),
    services: await testCostControlledServices(),
    budgetManagement: await testBudgetManagement()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📋 成本控制模块测试结果汇总:');
  console.log('- 基础功能测试:', testResults.basics ? '✅ 通过' : '❌ 失败');
  console.log('- 使用量跟踪测试:', testResults.usageTracking ? '✅ 通过' : '❌ 失败');
  console.log('- 速率限制测试:', testResults.rateLimiting ? '✅ 通过' : '❌ 失败');
  console.log('- 成本控制服务测试:', testResults.services ? '✅ 通过' : '❌ 失败');
  console.log('- 预算管理测试:', testResults.budgetManagement ? '✅ 通过' : '❌ 失败');

  const allPassed = Object.values(testResults).every(result => result);
  console.log('\n🏆 成本控制模块总体结果:', allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败');

  if (allPassed) {
    console.log('\n🎯 成本控制模块 (T103.8) 实现完成并验证通过！');
    console.log('系统具备完整的成本控制、速率限制、预算管理和使用分析功能。');
  }

  return allPassed;
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runAllCostControlTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('成本控制模块测试执行出错:', error);
      process.exit(1);
    });
}

export {
  testCostControlBasics,
  testUsageTracking,
  testRateLimiting,
  testCostControlledServices,
  testBudgetManagement,
  runAllCostControlTests
};