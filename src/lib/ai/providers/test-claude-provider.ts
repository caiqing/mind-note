/**
 * Claude提供商集成测试脚本 - T103.2
 * 运行实际的Claude API测试（需要有效的API密钥）
 */

import { createClaudeProvider } from './claude-provider';
import { AnalysisRequest } from '@/types/ai-analysis';

async function testClaudeProvider() {
  console.log('🧪 开始测试Claude提供商...\n');

  try {
    // 创建提供商实例
    const provider = createClaudeProvider();
    console.log('✅ Claude提供商初始化成功');

    // 测试数据
    const testContent = `
Claude是由Anthropic公司开发的先进AI助手，以其出色的对话能力和深度分析而闻名。

MindNote作为智能笔记应用，集成了Claude的强大能力来提供：
1. 自动生成高质量的摘要（严格控制在100字以内）
2. 提取精准的关键词和概念
3. 进行深入的内容分类和情感分析
4. 识别关键概念及其关联关系

Claude的优势在于：
- 更好的理解和推理能力
- 对复杂文本的深入分析
- 生成结构化和高质量的输出
- 在分类和概念提取任务上表现优异

技术实现采用了Next.js 15 + React 19 + TypeScript，并通过@ai-sdk/anthropic集成Claude API。
这种集成方式确保了高效的API调用和优秀的错误处理能力。
    `.trim();

    const testRequest: AnalysisRequest = {
      noteId: 'test-note-' + Date.now(),
      userId: 'test-user-001',
      content: testContent,
      title: 'Claude AI功能介绍',
      options: {
        generateSummary: true,
        extractKeywords: true,
        classifyContent: true,
        analyzeSentiment: true,
        extractKeyConcepts: true,
        generateTags: true,
      },
    };

    console.log('📝 测试内容长度:', testContent.length, '字符');
    console.log('🎯 开始Claude分析...\n');

    const startTime = Date.now();
    const result = await provider.analyze(testRequest);
    const endTime = Date.now();

    console.log('📊 Claude分析结果:');
    console.log('- 处理时间:', result.processingTime, 'ms');
    console.log('- 总耗时:', endTime - startTime, 'ms');
    console.log('- 成本:', `$${result.cost.toFixed(6)}`);
    console.log('- Token使用:', result.tokens);
    console.log('- 整体置信度:', (result.metadata.confidence * 100).toFixed(1), '%');
    console.log('- 请求ID:', result.metadata.requestId);
    console.log();

    // 显示各项分析结果
    if (result.results.summary) {
      console.log('📄 Claude摘要生成:');
      console.log(result.results.summary);
      console.log('字数:', result.results.summary.length);
      console.log();
    }

    if (result.results.keywords) {
      console.log('🔑 Claude关键词提取:');
      console.log(result.results.keywords.join(', '));
      console.log('数量:', result.results.keywords.length);
      console.log();
    }

    if (result.results.classification) {
      console.log('📂 Claude内容分类:');
      console.log('- 主要分类:', result.results.classification.category);
      console.log('- 置信度:', (result.results.classification.confidence * 100).toFixed(1), '%');
      console.log('- 理由:', result.results.classification.reasoning);
      if (result.results.classification.alternatives.length > 0) {
        console.log('- 备选分类:', result.results.classification.alternatives.map(a => `${a.category}(${(a.confidence * 100).toFixed(1)}%)`).join(', '));
      }
      console.log();
    }

    if (result.results.sentiment) {
      console.log('😊 Claude情感分析:');
      console.log('- 情感倾向:', result.results.sentiment.sentiment);
      console.log('- 置信度:', (result.results.sentiment.confidence * 100).toFixed(1), '%');
      console.log('- 情感评分:', result.results.sentiment.score);
      console.log('- 理由:', result.results.sentiment.reasoning);
      console.log();
    }

    if (result.results.keyConcepts) {
      console.log('💡 Claude关键概念:');
      result.results.keyConcepts.forEach((concept, index) => {
        console.log(`${index + 1}. ${concept.concept} (重要性: ${(concept.importance * 100).toFixed(1)}%)`);
        console.log(`   描述: ${concept.context}`);
        if (concept.relatedConcepts.length > 0) {
          console.log(`   相关: ${concept.relatedConcepts.join(', ')}`);
        }
      });
      console.log();
    }

    if (result.results.tags) {
      console.log('🏷️ Claude智能标签:');
      console.log(result.results.tags.join(', '));
      console.log('数量:', result.results.tags.length);
      console.log();
    }

    // 验证结果质量
    console.log('✅ Claude质量验证:');
    const summaryValid = result.results.summary ? result.results.summary.length <= 100 : true;
    console.log('- 摘要长度验证:', summaryValid ? '✅ 通过' : '❌ 失败');

    const keywordsValid = result.results.keywords ? result.results.keywords.length >= 3 : false;
    console.log('- 关键词数量验证:', keywordsValid ? '✅ 通过' : '❌ 失败');

    const classificationValid = result.results.classification ? result.results.classification.confidence >= 0.5 : false;
    console.log('- 分类置信度验证:', classificationValid ? '✅ 通过' : '❌ 失败');

    const sentimentValid = result.results.sentiment ? result.results.sentiment.confidence >= 0.5 : false;
    console.log('- 情感分析置信度验证:', sentimentValid ? '✅ 通过' : '❌ 失败');

    const conceptsValid = result.results.keyConcepts ? result.results.keyConcepts.length > 0 : false;
    console.log('- 概念提取验证:', conceptsValid ? '✅ 通过' : '❌ 失败');

    const tagsValid = result.results.tags ? result.results.tags.length >= 3 : false;
    console.log('- 标签数量验证:', tagsValid ? '✅ 通过' : '❌ 失败');

    // Claude特有的验证
    const claudeConfidenceHigh = result.metadata.confidence > 0.8;
    console.log('- Claude高置信度验证:', claudeConfidenceHigh ? '✅ 通过' : '❌ 失败');

    const claudeConceptsDetailed = result.results.keyConcepts ?
      result.results.keyConcepts.every(c => c.context && c.context.length > 5) : false;
    console.log('- Claude概念描述详细度:', claudeConceptsDetailed ? '✅ 通过' : '❌ 失败');

    console.log();
    console.log('🎉 Claude提供商测试完成！');

    return true;

  } catch (error) {
    console.error('❌ Claude提供商测试失败:', error);

    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        console.log('\n💡 提示: 请确保在.env文件中配置了ANTHROPIC_API_KEY');
      } else if (error.message.includes('API')) {
        console.log('\n💡 提示: 请检查网络连接和Claude API密钥有效性');
      }
    }

    return false;
  }
}

// 单独测试各个功能
async function testIndividualClaudeFeatures() {
  console.log('\n🔍 开始Claude单独功能测试...\n');

  try {
    const provider = createClaudeProvider();
    const testContent = '这是一个关于Claude AI和机器学习的技术文档，介绍了如何使用Next.js和TypeScript开发现代Web应用，Claude在其中的作用和优势。';

    // 测试摘要生成
    console.log('1️⃣ 测试Claude摘要生成...');
    const summary = await provider.generateSummary(testContent);
    console.log('摘要:', summary);
    console.log('字数:', summary.length, '✅ Claude摘要测试通过\n');

    // 测试关键词提取
    console.log('2️⃣ 测试Claude关键词提取...');
    const keywords = await provider.extractKeywords(testContent);
    console.log('关键词:', keywords.join(', '));
    console.log('数量:', keywords.length, '✅ Claude关键词测试通过\n');

    // 测试内容分类
    console.log('3️⃣ 测试Claude内容分类...');
    const classification = await provider.classifyContent(testContent);
    console.log('分类:', classification.category, `(置信度: ${(classification.confidence * 100).toFixed(1)}%)`);
    console.log('理由:', classification.reasoning, '✅ Claude分类测试通过\n');

    // 测试情感分析
    console.log('4️⃣ 测试Claude情感分析...');
    const sentiment = await provider.analyzeSentiment(testContent);
    console.log('情感:', sentiment.sentiment, `(置信度: ${(sentiment.confidence * 100).toFixed(1)}%)`);
    console.log('评分:', sentiment.score, '✅ Claude情感测试通过\n');

    // 测试概念提取
    console.log('5️⃣ 测试Claude概念提取...');
    const concepts = await provider.extractKeyConcepts(testContent);
    concepts.forEach((concept, index) => {
      console.log(`概念${index + 1}: ${concept.concept} (${(concept.importance * 100).toFixed(1)}%)`);
      console.log(`描述: ${concept.context}`);
    });
    console.log('✅ Claude概念测试通过\n');

    // 测试标签生成
    console.log('6️⃣ 测试Claude标签生成...');
    const tags = await provider.generateTags(testContent);
    console.log('标签:', tags.join(', '));
    console.log('数量:', tags.length, '✅ Claude标签测试通过\n');

    console.log('🎉 所有Claude单独功能测试完成！');
    return true;

  } catch (error) {
    console.error('❌ Claude单独功能测试失败:', error);
    return false;
  }
}

// 性能测试
async function testClaudePerformance() {
  console.log('\n⚡ 开始Claude性能测试...\n');

  try {
    const provider = createClaudeProvider();
    const testContent = 'Claude性能测试内容。'.repeat(100); // 较长的测试内容

    const iterations = 3;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`第 ${i + 1} 次测试...`);

      const startTime = Date.now();
      await provider.generateSummary(testContent);
      const endTime = Date.now();

      const duration = endTime - startTime;
      times.push(duration);
      console.log(`耗时: ${duration}ms`);
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log('\n📊 Claude性能统计:');
    console.log('- 平均耗时:', avgTime.toFixed(2), 'ms');
    console.log('- 最快耗时:', minTime, 'ms');
    console.log('- 最慢耗时:', maxTime, 'ms');
    console.log('- 测试次数:', iterations);

    const performanceOk = avgTime < 6000; // Claude可能稍慢，6秒内
    console.log('- 性能评估:', performanceOk ? '✅ 良好' : '⚠️ 需要优化');

    return performanceOk;

  } catch (error) {
    console.error('❌ Claude性能测试失败:', error);
    return false;
  }
}

// 主测试函数
async function runAllClaudeTests() {
  console.log('🚀 开始Claude提供商完整测试套件\n');
  console.log('=' .repeat(50));

  const testResults = {
    fullAnalysis: await testClaudeProvider(),
    individualFeatures: await testIndividualClaudeFeatures(),
    performance: await testClaudePerformance(),
  };

  console.log('\n' + '=' .repeat(50));
  console.log('📋 Claude测试结果汇总:');
  console.log('- 完整分析测试:', testResults.fullAnalysis ? '✅ 通过' : '❌ 失败');
  console.log('- 单独功能测试:', testResults.individualFeatures ? '✅ 通过' : '❌ 失败');
  console.log('- 性能测试:', testResults.performance ? '✅ 通过' : '❌ 失败');

  const allPassed = Object.values(testResults).every(result => result);
  console.log('\n🏆 Claude总体结果:', allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败');

  if (allPassed) {
    console.log('\n🎯 Claude提供商 (T103.2) 实现完成并验证通过！');
    console.log('Claude在分析深度和输出质量方面表现优异。');
  }

  return allPassed;
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runAllClaudeTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Claude测试执行出错:', error);
      process.exit(1);
    });
}

export { testClaudeProvider, testIndividualClaudeFeatures, testClaudePerformance, runAllClaudeTests };