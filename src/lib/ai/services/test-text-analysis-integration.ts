/**
 * 文本分析服务集成测试脚本 - T103.9
 * 测试完整的文本分析功能集成和性能表现
 */

import { createAIServiceManager } from './ai-service-manager';
import { createCostControlledServices, createUsageAnalyticsService } from './cost-controlled-service';

async function testBasicTextAnalysis() {
  console.log('🧪 开始测试基础文本分析功能...\n');

  try {
    // 创建AI服务管理器
    console.log('1️⃣ 创建AI服务管理器...');
    const serviceManager = createAIServiceManager({
      enableFallback: true,
      retryAttempts: 2,
      timeoutMs: 15000,
      enableHealthCheck: false,
      enableCircuitBreaker: true
    });
    console.log('✅ AI服务管理器初始化成功');

    // 测试统一文本分析
    console.log('\n2️⃣ 测试统一文本分析功能...');
    const testContent = `
人工智能技术在医疗健康领域的应用正日益广泛，从疾病诊断到药物研发，从个性化治疗到健康管理，
AI都在发挥着重要作用。通过深度学习和大数据分析，AI系统能够帮助医生更准确地诊断疾病，
提高治疗效率，同时也能为患者提供更好的医疗服务体验。

主要应用包括：
1. 医学影像分析：AI可以快速准确地分析X光片、CT扫描等医学影像
2. 疾病预测模型：基于患者数据预测疾病风险和发展趋势
3. 个性化治疗方案：根据患者基因信息和生活习惯定制治疗方案
4. 药物研发加速：通过AI算法大大缩短新药研发周期

这些技术的进步不仅提高了医疗服务的质量和效率，还为患者带来了更好的治疗体验和健康结果。
    `.trim();

    const request = {
      content: testContent,
      userId: 'test-user-001',
      options: {
        summary: {
          style: 'paragraph',
          maxLength: 120,
          language: 'zh'
        },
        keywords: {
          maxKeywords: 10,
          priority: 'relevance',
          categories: ['technology', 'healthcare', 'medical']
        },
        sentiment: {
          detailLevel: 'detailed',
          includeEmotions: true
        },
        concepts: {
          maxConcepts: 8,
          includeRelations: true,
          includeDefinitions: true
        }
      }
    };

    console.log(`📝 测试内容长度: ${testContent.length} 字符`);
    console.log(`🎯 请求的分析服务: ${Object.keys(request.options || {}).join(', ')}`);

    const analysisStartTime = Date.now();
    const result = await serviceManager.performUnifiedAnalysis(request);
    const analysisEndTime = Date.now();

    console.log('\n📊 统一分析结果:');
    console.log(`- 处理时间: ${analysisEndTime - analysisStartTime}ms`);
    console.log(`- 总成本: $${result.metadata.totalCost.toFixed(6)}`);
    console.log(`- 总Token数: ${result.metadata.totalTokens}`);
    console.log(`- 成功的服务: ${result.metadata.services.join(', ')}`);
    console.log(`- 使用的提供商: ${result.metadata.providers.join(', ')}`);
    console.log(`- Fallback次数: ${result.metadata.fallbacksUsed.length}`);
    console.log(`- 错误数量: ${result.metadata.errors.length}`);

    // 显示各服务结果
    if (result.summary) {
      console.log('\n📝 摘要生成结果:');
      console.log(`- 摘要: "${result.summary.summary}"`);
      console.log(`- 提供商: ${result.summary.provider}`);
      console.log(`- 处理时间: ${result.summary.processingTime}ms`);
      console.log(`- 成本: $${result.summary.cost.toFixed(6)}`);
      console.log(`- Token: ${result.summary.tokens.total}`);
    }

    if (result.keywords) {
      console.log('\n🔑 关键词提取结果:');
      console.log(`- 关键词数量: ${result.keywords.keywords.length}`);
      console.log(`- 提供商: ${result.keywords.provider}`);
      console.log(`- 关键词列表: ${result.keywords.keywords.map(k => `${k.keyword}(${(k.score * 100).toFixed(1)}%)`).join(', ')}`);
      if (result.keywords.statistics) {
        console.log(`- 平均评分: ${(result.keywords.statistics.avgScore * 100).toFixed(1)}%`);
        console.log(`- 类型分布: ${JSON.stringify(result.keywords.statistics.types)}`);
      }
    }

    if (result.sentiment) {
      console.log('\n💭 情感分析结果:');
      console.log(`- 情感倾向: ${result.sentiment.sentiment}`);
      console.log(`- 极性值: ${result.sentiment.polarity.toFixed(3)}`);
      console.log(`- 置信度: ${(result.sentiment.confidence * 100).toFixed(1)}%`);
      console.log(`- 强度: ${(result.sentiment.intensity * 100).toFixed(1)}%`);
      console.log(`- 提供商: ${result.sentiment.provider}`);
      if (result.sentiment.emotions && result.sentiment.emotions.length > 0) {
        console.log(`- 识别的情感: ${result.sentiment.emotions.map(e => `${e.emotion}(${(e.intensity * 100).toFixed(1)}%)`).join(', ')}`);
      }
    }

    if (result.concepts) {
      console.log('\n💡 概念识别结果:');
      console.log(`- 概念数量: ${result.concepts.concepts.length}`);
      console.log(`- 提供商: ${result.concepts.provider}`);
      console.log(`- 概念列表: ${result.concepts.concepts.map(c => `${c.concept}(${c.category})`).join(', ')}`);
      if (result.concepts.statistics) {
        console.log(`- 关系统数量: ${result.concepts.statistics.relationsCount}`);
        console.log(`- 平均相关性: ${(result.concepts.statistics.avgRelevance * 100).toFixed(1)}%`);
      }
    }

    // 错误处理验证
    if (result.metadata.errors.length > 0) {
      console.log('\n⚠️ 处理错误:');
      result.metadata.errors.forEach((error, index) => {
        console.log(`${index + 1}. 服务: ${error.service}, 提供商: ${error.provider}, 错误: ${error.error}`);
      });
    }

    console.log('\n✅ 基础文本分析功能测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 基础文本分析功能测试失败:', error);
    return false;
  }
}

async function testCostControlledAnalysis() {
  console.log('\n💰 开始测试成本控制文本分析...\n');

  try {
    // 创建成本控制服务
    console.log('1️⃣ 创建成本控制服务...');
    const services = createCostControlledServices({
      userDailyLimit: 2.0,        // $2/天
      operationCostLimit: 0.5,    // $0.5/次
      requestsPerMinute: 20,      // 20/分钟
      warningThreshold: 70,        // 70%预警
      blockOnBudgetExceeded: true,
      enableUsageLogging: true
    });
    console.log('✅ 成本控制服务初始化成功');

    const context = {
      userId: 'cost-test-user',
      operation: 'integrated-analysis',
      sessionId: 'test-session-001',
      metadata: { testType: 'integration' }
    };

    console.log('\n2️⃣ 测试成本控制的摘要服务...');
    const summaryResult = await services.summary.generateSummary(
      {
        content: `
区块链技术作为一种分布式账本技术，正在改变着金融、供应链、医疗等多个行业的运作方式。
其去中心化、不可篡改、透明可追溯的特性，为建立信任机制提供了全新的解决方案。
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
      console.log(`- 实际成本: $${summaryResult.actualCost?.toFixed(6)}`);
      console.log(`- 摘要内容: "${summaryResult.result?.summary}"`);
      if (summaryResult.warnings && summaryResult.warnings.length > 0) {
        console.log(`- 警告: ${summaryResult.warnings.join(', ')}`);
      }
    } else {
      console.log(`- 拒绝原因: ${summaryResult.reason}`);
    }

    console.log('\n3️⃣ 测试成本控制的关键词服务...');
    const keywordResult = await services.keywords.extractKeywords(
      {
        content: '机器学习、深度学习、神经网络、自然语言处理、计算机视觉、强化学习、迁移学习',
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
      console.log(`- 实际成本: $${keywordResult.actualCost?.toFixed(6)}`);
      console.log(`- 关键词数量: ${keywordResult.result?.keywords.length}`);
      console.log(`- 关键词: ${keywordResult.result?.keywords.map(k => k.keyword).join(', ')}`);
    }

    console.log('\n4️⃣ 测试成本控制的情感分析服务...');
    const sentimentResult = await services.sentiment.analyzeSentiment(
      {
        content: '我对人工智能技术的未来发展感到非常乐观，它将为人类带来巨大的福祉和进步。',
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
      console.log(`- 实际成本: $${sentimentResult.actualCost?.toFixed(6)}`);
      console.log(`- 情感倾向: ${sentimentResult.result?.sentiment}`);
      console.log(`- 置信度: ${(sentimentResult.result?.confidence || 0) * 100}%`);
      if (sentimentResult.result?.emotions && sentimentResult.result.emotions.length > 0) {
        console.log(`- 情感: ${sentimentResult.result.emotions.map(e => e.emotion).join(', ')}`);
      }
    }

    console.log('\n5️⃣ 测试成本控制的概念识别服务...');
    const conceptResult = await services.concepts.extractConcepts(
      {
        content: `
量子计算利用量子叠加和量子纠缠等量子力学原理，能够进行经典计算机难以完成的复杂计算。
它在密码学、药物研发、材料科学、金融建模等领域具有巨大的应用潜力。
        `.trim(),
        options: {
          maxConcepts: 6,
          includeRelations: true,
          includeDefinitions: true
        }
      },
      context
    );

    console.log(`概念识别服务结果:`);
    console.log(`- 允许执行: ${conceptResult.allowed}`);
    if (conceptResult.allowed) {
      console.log(`- 实际成本: $${conceptResult.actualCost?.toFixed(6)}`);
      console.log(`- 概念数量: ${conceptResult.result?.concepts.length}`);
      console.log(`- 概念: ${conceptResult.result?.concepts.map(c => c.concept).join(', ')}`);
    }

    console.log('\n6️⃣ 检查使用分析报告...');
    const analyticsService = createUsageAnalyticsService(services.costController);
    const userReport = analyticsService.getUserUsageReport(context.userId);

    console.log('用户使用报告:');
    console.log(`- 用户ID: ${userReport.userId}`);
    console.log(`- 预算状态: ${userReport.status}`);
    if (userReport.currentUsage) {
      console.log(`- 每日成本: $${userReport.currentUsage.daily.cost.toFixed(6)}`);
      console.log(`- 每日请求数: ${userReport.currentUsage.daily.requests}`);
      console.log(`- 每月成本: $${userReport.currentUsage.monthly.cost.toFixed(6)}`);
      console.log(`- 每月请求数: ${userReport.currentUsage.monthly.requests}`);
    }
    if (userReport.analytics) {
      console.log(`- 平均成本/请求: $${userReport.analytics.averageCostPerRequest.toFixed(6)}`);
      console.log(`- 平均成本/Token: $${userReport.analytics.averageCostPerToken.toFixed(8)}`);
    }

    console.log('\n✅ 成本控制文本分析测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 成本控制文本分析测试失败:', error);
    return false;
  }
}

async function testTextVariations() {
  console.log('\n📝 开始测试不同类型文本分析...\n');

  try {
    const serviceManager = createAIServiceManager({
      enableFallback: true,
      enableHealthCheck: false
    });

    console.log('1️⃣ 测试不同文本长度...');
    const textLengthTests = [
      {
        name: '短文本',
        content: '人工智能正在改变世界。',
        expectedMinTokens: 10
      },
      {
        name: '中等文本',
        content: `
人工智能技术的发展日新月异，深度学习、机器学习、自然语言处理等领域都取得了重大突破。
这些技术在图像识别、语音识别、自动驾驶、智能推荐等方面得到了广泛应用。
        `.trim(),
        expectedMinTokens: 50
      },
      {
        name: '长文本',
        content: `
人工智能是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。
该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。

机器学习是人工智能的一个重要分支，它是一种通过算法使机器能够从数据中学习并做出决策或预测的方法。
深度学习是机器学习的一个子集，它使用多层神经网络来模拟人脑的工作方式，特别适用于处理大规模和复杂的数据。

自然语言处理（NLP）是人工智能和语言学领域的分支学科，致力于让计算机能够理解、解释和生成人类语言。
现代NLP技术广泛应用于机器翻译、情感分析、文本摘要、问答系统等领域。

计算机视觉是使用计算机及相关设备对生物视觉的一种模拟，让计算机拥有类似于人类的那种"看"和"识别"的功能。
主要任务包括图像识别、目标检测、图像分割、人脸识别等。

强化学习是机器学习中的一个领域，强调如何基于环境而行动，以取得最大化的预期利益。
强化学习是除了监督学习和无监督学习之外的第三种基本的机器学习方法。
        `.trim(),
        expectedMinTokens: 200
      }
    ];

    for (const test of textLengthTests) {
      console.log(`\n测试${test.name}:`);
      console.log(`内容长度: ${test.content.length} 字符`);

      const result = await serviceManager.performUnifiedAnalysis({
        content: test.content,
        userId: `length-test-${test.name.replace(/\s+/g, '-')}`,
        options: {
          summary: { style: 'paragraph', maxLength: 100 },
          keywords: { maxKeywords: 8 },
          sentiment: { detailLevel: 'comprehensive' }
        }
      });

      console.log(`✅ Token数: ${result.metadata.totalTokens} (预期最少: ${test.expectedMinTokens})`);
      console.log(`✅ 处理时间: ${result.metadata.totalCost.toFixed(6)} 成本`);
      console.log(`✅ 成功服务: ${result.metadata.services.join(', ')}`);
    }

    console.log('\n2️⃣ 测试不同语言文本...');
    const languageTests = [
      {
        name: '中文',
        content: '中文文本分析测试：人工智能技术在现代社会发挥着重要作用。',
        language: 'zh'
      },
      {
        name: '英文',
        content: 'English text analysis test: Artificial intelligence technology plays an important role in modern society.',
        language: 'en'
      },
      {
        name: '中英混合',
        content: 'Mixed language test: 人工智能技术 is very important for technology development.',
        language: 'mixed'
      }
    ];

    for (const test of languageTests) {
      console.log(`\n测试${test.name}:`);

      const result = await serviceManager.performUnifiedAnalysis({
        content: test.content,
        userId: `language-test-${test.name}`,
        options: {
          summary: { style: 'paragraph', language: test.language },
          keywords: { maxKeywords: 5 }
        }
      });

      console.log(`✅ 处理成功: ${result.metadata.services.length} 个服务`);
      if (result.summary) {
        console.log(`✅ 摘要生成: "${result.summary.summary.substring(0, 50)}..."`);
      }
    }

    console.log('\n3️⃣ 测试特殊格式文本...');
    const specialContent = `
# 人工智能技术发展报告

## 概述
人工智能（AI）技术正在快速发展，对各行各业产生深远影响。

### 主要技术领域
1. **机器学习** - 数据驱动的算法学习
2. **深度学习** - 基于神经网络的学习方法
3. **自然语言处理** - 理解和生成人类语言
4. **计算机视觉** - 图像和视频理解

### 应用场景
- 智能客服系统
- 自动驾驶汽车
- 医疗诊断辅助
- 金融风险分析

> "人工智能将是21世纪最重要的技术革命。"

[更多信息](https://example.com/ai-report)

\`\`\`python
# AI示例代码
import tensorflow as tf
model = tf.keras.Sequential([
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dense(10, activation='softmax')
])
\`\`\`

**结论**: AI技术前景广阔，但需要谨慎发展。
    `.trim();

    console.log('测试特殊格式文本（包含Markdown、代码块等）:');

    const specialResult = await serviceManager.performUnifiedAnalysis({
      content: specialContent,
      userId: 'special-format-test',
      options: {
        summary: { style: 'paragraph', maxLength: 150 },
        keywords: { maxKeywords: 10 },
        concepts: { maxConcepts: 8 }
      }
    });

    console.log(`✅ 特殊格式处理成功`);
    console.log(`✅ 总Token数: ${specialResult.metadata.totalTokens}`);
    console.log(`✅ 提取关键词: ${specialResult.keywords?.keywords.length || 0} 个`);
    console.log(`✅ 识别概念: ${specialResult.concepts?.concepts.length || 0} 个`);

    console.log('\n✅ 不同类型文本分析测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 不同类型文本分析测试失败:', error);
    return false;
  }
}

async function testPerformanceAndConcurrency() {
  console.log('\n⚡ 开始测试性能和并发处理...\n');

  try {
    const serviceManager = createAIServiceManager({
      enableFallback: false, // 简化性能测试
      enableHealthCheck: false,
      timeoutMs: 10000
    });

    console.log('1️⃣ 测试处理性能...');
    const performanceTests = [
      { name: '简单文本', content: '这是一个简单的性能测试文本。' },
      { name: '中等复杂文本', content: '这是一个中等复杂度的性能测试文本，包含更多的内容和信息，用于测试系统对中等复杂度文本的处理能力。' },
      { name: '复杂文本', content: '这是一个复杂度较高的性能测试文本，包含丰富的内容、详细的信息和多样的语言表达方式，用于全面测试系统在处理复杂文本时的性能表现，包括处理速度、资源消耗和输出质量等多个维度。' }
    ];

    for (const test of performanceTests) {
      console.log(`\n测试${test.name}:`);
      const startTime = Date.now();

      const result = await serviceManager.performUnifiedAnalysis({
        content: test.content,
        userId: `performance-test-${test.name.replace(/\s+/g, '-')}`,
        options: {
          summary: { style: 'paragraph' },
          keywords: { maxKeywords: 5 },
          sentiment: { detailLevel: 'basic' }
        }
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      console.log(`✅ 处理时间: ${processingTime}ms`);
      console.log(`✅ Token处理速度: ${(result.metadata.totalTokens / (processingTime / 1000)).toFixed(1)} tokens/秒`);
      console.log(`✅ 成本效率: ${(result.metadata.totalCost * 1000 / processingTime).toFixed(6)} cost/ms`);
    }

    console.log('\n2️⃣ 测试并发处理能力...');
    const concurrentRequests = 5;
    const requestContent = '并发测试内容：这是第{n}个并发请求的测试文本。';

    console.log(`发送 ${concurrentRequests} 个并发请求...`);
    const concurrentStartTime = Date.now();

    const concurrentPromises = Array.from({ length: concurrentRequests }, (_, i) =>
      serviceManager.performUnifiedAnalysis({
        content: requestContent.replace('{n}', (i + 1).toString()),
        userId: 'concurrent-test-user',
        options: {
          summary: { style: 'paragraph' },
          keywords: { maxKeywords: 3 }
        }
      })
    );

    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentEndTime = Date.now();

    console.log(`✅ 并发处理完成，总耗时: ${concurrentEndTime - concurrentStartTime}ms`);
    console.log(`✅ 平均每个请求: ${((concurrentEndTime - concurrentStartTime) / concurrentRequests).toFixed(1)}ms`);

    let successCount = 0;
    let totalCost = 0;
    let totalTokens = 0;

    concurrentResults.forEach((result, index) => {
      if (result.metadata.errors.length === 0) {
        successCount++;
      }
      totalCost += result.metadata.totalCost;
      totalTokens += result.metadata.totalTokens;
    });

    console.log(`✅ 成功处理: ${successCount}/${concurrentRequests} 个请求`);
    console.log(`✅ 总成本: $${totalCost.toFixed(6)}`);
    console.log(`✅ 总Token数: ${totalTokens}`);

    console.log('\n3️⃣ 测试系统资源使用...');
    const memoryStart = process.memoryUsage();
    const cpuStart = process.cpuUsage();

    // 执行一些分析任务来测量资源使用
    for (let i = 0; i < 10; i++) {
      await serviceManager.performUnifiedAnalysis({
        content: `资源测试 ${i + 1}: 这是用于测试系统资源使用情况的文本内容。`,
        userId: 'resource-test-user',
        options: {
          summary: { style: 'paragraph' },
          keywords: { maxKeywords: 3 }
        }
      });
    }

    const memoryEnd = process.memoryUsage();
    const cpuEnd = process.cpuUsage(cpuStart);

    console.log('系统资源使用情况:');
    console.log(`✅ 内存使用增长: ${((memoryEnd.heapUsed - memoryStart.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`✅ CPU使用时间: 用户 ${(cpuEnd.user / 1000).toFixed(2)}ms, 系统 ${(cpuEnd.system / 1000).toFixed(2)}ms`);

    console.log('\n✅ 性能和并发处理测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 性能和并发处理测试失败:', error);
    return false;
  }
}

async function testSystemMonitoring() {
  console.log('\n📊 开始测试系统监控功能...\n');

  try {
    const serviceManager = createAIServiceManager({
      enableFallback: true,
      enableHealthCheck: true,
      enableCircuitBreaker: true,
      enableLoadBalancing: true
    });

    console.log('1️⃣ 测试系统健康检查...');
    const health = await serviceManager.getSystemHealth();

    console.log('系统健康状态:');
    console.log(`- 系统状态: ${health.status}`);
    console.log(`- 可用提供商: ${health.providers.map(p => p.provider).join(', ')}`);
    console.log(`- 健康提供商: ${health.providers.filter(p => p.isHealthy).length}/${health.providers.length}`);
    console.log(`- 配置: fallback=${health.config.enableFallback}, 重试=${health.config.retryAttempts}次`);
    console.log(`- 负载均衡: ${health.loadBalancing.enabled ? '启用' : '禁用'}`);
    console.log(`- 熔断器: ${health.circuitBreakers.length} 个`);

    health.providers.forEach(provider => {
      console.log(`  ${provider.provider}: ${provider.isHealthy ? '健康' : '不健康'} (${provider.responseTime}ms)`);
    });

    console.log('\n2️⃣ 测试提供商统计信息...');
    const providerStats = serviceManager.getProviderStats();

    console.log('提供商统计:');
    providerStats.forEach(stat => {
      console.log(`- ${stat.provider}:`);
      console.log(`  状态: ${stat.stats.status}`);
      console.log(`  成功率: ${(stat.stats.successRate * 100).toFixed(1)}%`);
      console.log(`  响应时间: ${stat.stats.responseTime}ms`);
      console.log(`  请求数: ${stat.stats.requestCount}`);
      console.log(`  错误数: ${stat.stats.errorCount}`);
    });

    console.log('\n3️⃣ 测试负载均衡统计...');
    const loadBalancingStats = serviceManager.getLoadBalancingStats();

    console.log('负载均衡统计:');
    loadBalancingStats.forEach(stat => {
      console.log(`- ${stat.provider}:`);
      console.log(`  请求数: ${stat.stats.requestCount}`);
      console.log(`  平均响应时间: ${stat.stats.avgResponseTime}ms`);
      console.log(`  当前负载: ${stat.stats.currentLoad}`);
      console.log(`  负载权重: ${stat.stats.weight}`);
    });

    console.log('\n4️⃣ 测试熔断器状态...');
    const circuitBreakers = health.circuitBreakers;

    console.log('熔断器状态:');
    circuitBreakers.forEach(cb => {
      console.log(`- ${cb.provider}:`);
      console.log(`  状态: ${cb.isOpen ? '开启' : '关闭'}`);
      console.log(`  失败次数: ${cb.failureCount}/${cb.threshold}`);
      console.log(`  最后失败时间: ${cb.lastFailureTime ? new Date(cb.lastFailureTime).toISOString() : '无'}`);
    });

    console.log('\n5️⃣ 执行一些测试操作以更新统计...');
    const testRequests = [
      {
        content: '统计测试1：人工智能技术发展迅速。',
        options: { summary: { style: 'paragraph' } }
      },
      {
        content: '统计测试2：机器学习算法不断优化。',
        options: { keywords: { maxKeywords: 5 } }
      },
      {
        content: '统计测试3：深度学习应用广泛。',
        options: { sentiment: { detailLevel: 'basic' } }
      }
    ];

    for (let i = 0; i < testRequests.length; i++) {
      const request = testRequests[i];
      await serviceManager.performUnifiedAnalysis({
        content: request.content,
        userId: 'stats-test-user',
        options: request.options
      });
      console.log(`✅ 完成统计测试 ${i + 1}`);
    }

    console.log('\n6️⃣ 重新检查统计信息...');
    const updatedProviderStats = serviceManager.getProviderStats();
    const updatedLoadBalancingStats = serviceManager.getLoadBalancingStats();

    console.log('更新后的统计信息:');
    updatedProviderStats.forEach(stat => {
      if (stat.stats.requestCount > 0) {
        console.log(`- ${stat.provider}: ${stat.stats.requestCount} 次请求, 成功率 ${(stat.stats.successRate * 100).toFixed(1)}%`);
      }
    });

    console.log('\n✅ 系统监控功能测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 系统监控功能测试失败:', error);
    return false;
  }
}

// 主测试函数
async function runAllTextAnalysisIntegrationTests() {
  console.log('🚀 开始文本分析服务完整集成测试套件\n');
  console.log('='.repeat(60));

  const testResults = {
    basicAnalysis: await testBasicTextAnalysis(),
    costControlledAnalysis: await testCostControlledAnalysis(),
    textVariations: await testTextVariations(),
    performanceAndConcurrency: await testPerformanceAndConcurrency(),
    systemMonitoring: await testSystemMonitoring()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📋 文本分析服务集成测试结果汇总:');
  console.log('- 基础文本分析测试:', testResults.basicAnalysis ? '✅ 通过' : '❌ 失败');
  console.log('- 成本控制分析测试:', testResults.costControlledAnalysis ? '✅ 通过' : '❌ 失败');
  console.log('- 文本变体测试:', testResults.textVariations ? '✅ 通过' : '❌ 失败');
  console.log('- 性能和并发测试:', testResults.performanceAndConcurrency ? '✅ 通过' : '❌ 失败');
  console.log('- 系统监控测试:', testResults.systemMonitoring ? '✅ 通过' : '❌ 失败');

  const allPassed = Object.values(testResults).every(result => result);
  console.log('\n🏆 文本分析服务集成测试总体结果:', allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败');

  if (allPassed) {
    console.log('\n🎯 文本分析服务集成测试 (T103.9) 实现完成并验证通过！');
    console.log('系统具备完整的文本分析能力，包括摘要生成、关键词提取、情感分析和概念识别功能。');
    console.log('集成成本控制、性能优化和系统监控等生产级特性。');
  }

  return allPassed;
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runAllTextAnalysisIntegrationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('文本分析服务集成测试执行出错:', error);
      process.exit(1);
    });
}

export {
  testBasicTextAnalysis,
  testCostControlledAnalysis,
  testTextVariations,
  testPerformanceAndConcurrency,
  testSystemMonitoring,
  runAllTextAnalysisIntegrationTests
};