/**
 * 关键词提取服务集成测试脚本 - T103.4
 * 测试完整的关键词提取功能
 */

import { createKeywordService } from './keyword-service';
import { KeywordRequest } from './keyword-service';

async function testKeywordService() {
  console.log('🧪 开始测试关键词提取服务...\n');

  try {
    // 创建服务实例
    const service = createKeywordService();
    console.log('✅ 关键词提取服务初始化成功');

    // 检查服务状态
    console.log('1️⃣ 检查服务健康状态...');
    const health = await service.healthCheck();
    console.log(`健康状态: ${health.status}`);
    console.log(`可用提供商: ${health.providers.join(', ')}`);
    console.log();

    // 获取服务统计
    console.log('2️⃣ 获取服务统计信息...');
    const stats = service.getStats();
    console.log(`总提供商数: ${stats.totalProviders}`);
    console.log(`可用提供商数: ${stats.availableProviders}`);
    console.log(`Fallback顺序: ${stats.fallbackOrder.join(' -> ')}`);
    console.log(`支持的语言: ${stats.supportedLanguages.join(', ')}`);
    console.log(`支持的优先级: ${stats.supportedPriorities.join(', ')}`);
    console.log(`最大关键词数: ${stats.maxKeywords}`);
    console.log();

    // 测试基础关键词提取
    console.log('3️⃣ 测试基础关键词提取...');
    const basicRequest: KeywordRequest = {
      content: `
人工智能和机器学习是当前技术发展的重要趋势。深度学习作为机器学习的一个重要分支，在图像识别、自然语言处理和推荐系统等领域展现出强大的能力。

现代AI技术包括：
1. 大型语言模型（LLM）如GPT系列和Claude
2. 计算机视觉在自动驾驶和医疗诊断中的应用
3. 强化学习在游戏AI和机器人控制中的突破
4. 知识图谱和语义搜索技术的进步

这些技术的快速发展正在改变各个行业的运营模式，从金融科技到智能制造，从教育培训到医疗健康，AI的应用场景越来越广泛。

然而，AI技术的发展也面临着挑战，包括数据隐私、算法偏见、伦理道德和计算资源等问题。如何确保AI系统的安全性、可靠性和公平性，成为了技术发展的重要课题。
      `.trim(),
      userId: 'test-user-001',
    };

    console.log('📝 测试内容长度:', basicRequest.content.length, '字符');
    console.log('🎯 开始提取关键词...\n');

    const keywordStartTime = Date.now();
    const basicResult = await service.extractKeywords(basicRequest);
    const keywordEndTime = Date.now();

    console.log('📊 基础关键词提取结果:');
    console.log('- 提取的关键词:');
    basicResult.keywords.forEach((kw, index) => {
      console.log(`  ${index + 1}. ${kw.keyword} (评分: ${(kw.score * 100).toFixed(1)}%, 类型: ${kw.type}, 分类: ${kw.category})`);
    });
    console.log(`- 提供商: ${basicResult.provider}`);
    console.log(`- 处理时间: ${basicResult.processingTime}ms`);
    console.log(`- 总耗时: ${keywordEndTime - keywordStartTime}ms`);
    console.log(`- 成本: $${basicResult.cost.toFixed(6)}`);
    console.log(`- Token使用: ${basicResult.tokens}`);
    console.log('- 统计信息:');
    console.log(`  - 总关键词数: ${basicResult.statistics.totalKeywords}`);
    console.log(`  - 平均评分: ${(basicResult.statistics.avgScore * 100).toFixed(1)}%`);
    console.log(`  - 平均长度: ${basicResult.statistics.avgLength.toFixed(1)}字符`);
    console.log(`  - 分类分布: ${basicResult.statistics.categories.join(', ')}`);
    console.log(`  - 类型分布: 单词(${basicResult.statistics.types.single}) 短语(${basicResult.statistics.types.phrase}) 复合词(${basicResult.statistics.types.compound})`);
    console.log(`- 请求ID: ${basicResult.metadata.requestId}`);
    console.log(`- 算法: ${basicResult.metadata.algorithm}`);
    console.log();

    // 测试不同优先级
    console.log('4️⃣ 测试不同优先级...');
    const priorities = ['relevance', 'frequency', 'importance'] as const;

    for (const priority of priorities) {
      console.log(`测试 ${priority} 优先级...`);
      const priorityRequest: KeywordRequest = {
        content: '这是一个包含重复词汇的测试内容。人工智能 人工智能 技术技术 数据数据 数据分析。',
        userId: 'test-user',
        priority,
        maxKeywords: 5,
      };

      const priorityResult = await service.extractKeywords(priorityRequest);
      console.log(`  关键词: ${priorityResult.keywords.map(k => k.keyword).join(', ')}`);
      console.log(`  最高评分关键词: ${priorityResult.keywords[0]?.keyword} (${(priorityResult.keywords[0]?.score * 100).toFixed(1)}%)`);
      console.log();
    }

    // 测试不同语言
    console.log('5️⃣ 测试英文关键词提取...');
    const englishRequest: KeywordRequest = {
      content: `Artificial Intelligence and Machine Learning are transformative technologies in modern software development. Deep learning, a subset of machine learning, has revolutionized computer vision, natural language processing, and speech recognition.

Large Language Models (LLMs) like GPT and Claude demonstrate remarkable capabilities in understanding and generating human-like text. Computer vision applications include autonomous vehicles and medical diagnostics. Reinforcement learning has achieved breakthroughs in game AI and robotics control.

These advancements are reshaping industries from FinTech to manufacturing, education to healthcare. The rapid development of AI technologies presents both opportunities and challenges regarding data privacy, algorithmic bias, ethics, and resource consumption.`,
      userId: 'test-user-002',
      language: 'en',
      maxKeywords: 8,
    };

    const englishResult = await service.extractKeywords(englishRequest);
    console.log('英文关键词:');
    englishResult.keywords.forEach((kw, index) => {
      console.log(`  ${index + 1}. ${kw.keyword} (评分: ${(kw.score * 100).toFixed(1)}%, 类型: ${kw.type})`);
    });
    console.log(`语言支持: ${englishResult.metadata.algorithm.includes('zh') ? '中文' : '英文'}`);
    console.log();

    // 测试自定义分类
    console.log('6️⃣ 测试自定义分类...');
    const categoryRequest: KeywordRequest = {
      content: '这是一个关于教育技术、创新设计和商业模式的综合内容。',
      userId: 'test-user-003',
      categories: ['technology', 'education', 'business'],
      maxKeywords: 6,
    };

    const categoryResult = await service.extractKeywords(categoryRequest);
    console.log('自定义分类结果:');
    categoryResult.keywords.forEach((kw, index) => {
      console.log(`  ${index + 1}. ${kw.keyword} (分类: ${kw.category || 'uncategorized'})`);
    });
    console.log(`识别的类别: ${categoryResult.statistics.categories.join(', ')}`);
    console.log();

    // 测试单词和短语控制
    console.log('7️⃣ 测试单词和短语控制...');
    const singleWordRequest: KeywordRequest = {
      content: '这是一个测试单个词汇、复合词汇和短语词组的混合内容。',
      userId: 'test-user-004',
      preferSingleWords: true,
      includePhrases: false,
      maxKeywords: 5,
    };

    const singleWordResult = await service.extractKeywords(singleWordRequest);
    console.log('单词汇优先结果:');
    console.log(`  类型分布: 单词(${singleWordResult.statistics.types.single}) 短语(${singleWordResult.statistics.types.phrase}) 复合词(${singleWordResult.statistics.types.compound})`);
    console.log(`关键词: ${singleWordResult.keywords.map(k => k.keyword).join(', ')}`);
    console.log();

    const phraseRequest: KeywordRequest = {
      content: '这个测试包含短语词组和复合词汇，用于测试短语识别功能。',
      userId: 'test-user-005',
      preferSingleWords: false,
      includePhrases: true,
      maxKeywords: 5,
    };

    const phraseResult = await service.extractKeywords(phraseRequest);
    console.log('短语优先结果:');
    console.log(`  类型分布: 单词(${phraseResult.statistics.types.single}) 短语(${phraseResult.statistics.types.phrase}) 复合词(${phraseResult.statistics.types.compound})`);
    console.log(`关键词: ${phraseResult.keywords.map(k => k.keyword).join(', ')}`);
    console.log();

    // 测试批量提取
    console.log('8️⃣ 测试批量关键词提取...');
    const batchRequests: KeywordRequest[] = [
      {
        content: '第一段内容：介绍人工智能的基本概念和应用。',
        userId: 'user1',
        maxKeywords: 3,
      },
      {
        content: '第二段内容：讨论机器学习的算法和模型。',
        userId: 'user2',
        maxKeywords: 3,
      },
      {
        content: '第三段内容：涉及深度学习和神经网络技术。',
        userId: 'user3',
        maxKeywords: 3,
      },
      {
        content: '第四段内容：涵盖数据分析与可视化技术。',
        userId: 'user4',
        maxKeywords: 3,
      },
    ];

    console.log(`处理 ${batchRequests.length} 个关键词提取请求...`);
    const batchStartTime = Date.now();
    const batchResults = await service.extractBatchKeywords(batchRequests);
    const batchEndTime = Date.now();

    console.log(`批量处理完成，耗时: ${batchEndTime - batchStartTime}ms`);
    console.log(`成功提取: ${batchResults.length}/${batchRequests.length} 个关键词集`);

    batchResults.forEach((result, index) => {
      console.log(`第 ${index + 1} 组: ${result.keywords.join(', ')} (${result.provider})`);
    });
    console.log();

    // 质量验证
    console.log('✅ 关键词提取服务质量验证:');
    const allQualityHigh = [...batchResults, basicResult].every(r => r.statistics.avgScore > 0.7);
    console.log('- 所有提取质量评分 > 0.7:', allQualityHigh ? '✅ 通过' : '❌ 失败');

    const allHasCategories = [...batchResults, basicResult].every(r => r.statistics.categories.length > 0);
    console.log('- 所有结果都有分类信息:', allHasCategories ? '✅ 通过' : '❌ 失败');

    const processingFast = basicResult.processingTime < 5000;
    console.log('- 处理时间 < 5秒:', processingFast ? '✅ 通过' : '❌ 失败');

    const batchEfficient = batchEndTime - batchStartTime < 15000;
    console.log('- 批量处理效率 < 15秒:', batchEfficient ? '✅ 通过' : '❌ 失败');

    // 验证停用词过滤
    const noStopWords = basicResult.keywords.every(kw =>
      !['的', '了', '在', '是', '和', '就'].includes(kw.keyword.toLowerCase())
    );
    console.log('- 停用词过滤有效:', noStopWords ? '✅ 通过' : '❌ 失败');

    // 验证长度控制
    const lengthControlled = basicResult.keywords.every(kw =>
      kw.keyword.length >= 2 && kw.keyword.length <= 6
    );
    console.log('- 长度控制有效:', lengthControlled ? '✅ 通过' : '❌ 失败');

    console.log();
    console.log('🎉 关键词提取服务测试完成！');

    return true;

  } catch (error) {
    console.error('❌ 关键词提取服务测试失败:', error);

    if (error instanceof Error) {
      if (error.message.includes('No AI providers')) {
        console.log('\n💡 提示: 请确保至少配置了一个AI提供商（OpenAI或Claude）');
      } else if (error.message.includes('All providers failed')) {
        console.log('\n💡 提示: 请检查AI提供商的API密钥配置');
      }
    }

    return false;
  }
}

// 测试算法特性
async function testAlgorithmFeatures() {
  console.log('\n🔍 开始测试算法特性...\n');

  try {
    const service = createKeywordService();

    // 测试频率分析
    console.log('1️⃣ 测试频率分析算法...');
    const frequencyRequest: KeywordRequest = {
      content: '测试内容测试内容 重要重要 关键关键词 重复重复 多次多次',
      userId: 'user1',
      priority: 'frequency',
      maxKeywords: 5,
    };

    const frequencyResult = await service.extractKeywords(frequencyRequest);
    console.log('频率优先结果:');
    console.log('  关键词及频率:');
    frequencyResult.keywords.forEach(kw => {
      console.log(`    ${kw.keyword}: ${kw.frequency}次 (评分: ${(kw.score * 100).toFixed(1)}%)`);
    });
    console.log();

    // 测试位置检测
    console.log('2️⃣ 测试位置检测功能...');
    const positionRequest: KeywordRequest = {
      content: '关键词出现在开头，然后关键词在中间，最后关键词出现在结尾。',
      userId: 'user2',
    };

    const positionResult = await service.extractKeywords(positionRequest);
    console.log('位置检测结果:');
    positionResult.keywords.forEach(kw => {
      console.log(`  ${kw.keyword}: 位置 ${kw.positions?.join(', ') || '未检测到'}`);
    });
    console.log();

    // 测试相关性计算
    console.log('3️⃣ 测试相关性计算...');
    const relevanceRequest: KeywordRequest = {
      content: '主要主题是关键词分析，次要内容包括数据处理和结果验证。',
      userId: 'user3',
      priority: 'relevance',
    };

    const relevanceResult = await service.extractKeywords(relevanceRequest);
    console.log('相关性分析结果:');
    console.log('  关键词及相关性:');
    relevanceResult.keywords.forEach(kw => {
      console.log(`    ${kw.keyword}: 相关性 ${(kw.relevance * 100).toFixed(1)}%`);
    });
    console.log();

    return true;

  } catch (error) {
    console.error('❌ 算法特性测试失败:', error);
      return false;
    }
}

// 性能测试
async function testKeywordPerformance() {
  console.log('\n⚡ 开始关键词提取性能测试...\n');

  try {
    const service = createKeywordService();
    const longContent = '性能测试内容。'.repeat(100);

    const iterations = 5;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`第 ${i + 1} 次性能测试...`);

      const request: KeywordRequest = {
        content: longContent,
        userId: `perf-user-${i}`,
        maxKeywords: 10,
      };

      const startTime = Date.now();
      const result = await service.extractKeywords(request);
      const endTime = Date.now();

      const duration = endTime - startTime;
      times.push(duration);
      console.log(`耗时: ${duration}ms, 提供商: ${result.provider}`);
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log('\n📊 关键词提取性能统计:');
    console.log('- 平均耗时:', avgTime.toFixed(2), 'ms');
    console.log('- 最快耗时:', minTime, 'ms');
    console.log('- 最慢耗时:', maxTime, 'ms');
    console.log('- 测试次数:', iterations);

    const performanceOk = avgTime < 6000; // 6秒内
    console.log('- 性能评估:', performanceOk ? '✅ 良好' : '⚠️ 需要优化');

    return performanceOk;

  } catch (error) {
    console.error('❌ 关键词提取性能测试失败:', error);
      return false;
  }
}

// 主测试函数
async function runAllKeywordTests() {
  console.log('🚀 开始关键词提取服务完整测试套件\n');
  console.log('=' .repeat(50));

  const testResults = {
    basicService: await testKeywordService(),
    algorithm: await testAlgorithmFeatures(),
    performance: await testKeywordPerformance(),
  };

  console.log('\n' + '=' .repeat(50));
  console.log('📋 关键词提取服务测试结果汇总:');
  console.log('- 基础服务测试:', testResults.basicService ? '✅ 通过' : '❌ 失败');
  console.log('- 算法特性测试:', testResults.algorithm ? '✅ 通过' : '❌ 失败');
  console.log('- 性能测试:', testResults.performance ? '✅ 通过' : '❌ 失败');

  const allPassed = Object.values(testResults).every(result => result);
  console.log('\n🏆 关键词提取服务总体结果:', allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败');

  if (allPassed) {
    console.log('\n🎯 关键词提取服务 (T103.4) 实现完成并验证通过！');
    console.log('服务支持多优先级算法、批量处理和智能质量评估。');
  }

  return allPassed;
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runAllKeywordTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('关键词提取服务测试执行出错:', error);
      process.exit(1);
    });
}

export { testKeywordService, testAlgorithmFeatures, testKeywordPerformance, runAllKeywordTests };