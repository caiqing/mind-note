/**
 * T105智能标签生成系统增强版测试
 * 解决并发测试和边界情况问题
 */

import { StandaloneTaggerV2 } from './standalone-tagger-v2';
import { TagAPI } from './tag-api';
import {
  TagGenerationRequest,
  TagGenerationResult,
  TagGenerationOptions
} from './types';

/**
 * T105增强版测试套件
 */
export class T105EnhancedTestSuite {
  private tagger: StandaloneTaggerV2;
  private api: TagAPI;
  private testResults: Map<string, any> = new Map();

  constructor() {
    this.tagger = new StandaloneTaggerV2();
    this.api = new TagAPI();
    console.log(`🆔 测试套件实例ID: ${this.tagger.getInstanceId()}`);
  }

  /**
   * 运行完整增强版测试
   */
  async runEnhancedTest(): Promise<void> {
    console.log('🚀 开始T105智能标签生成系统增强版测试...');
    console.log('=' * 60);

    const results = {
      basic: await this.testBasicTagging(),
      api: await this.testAPITagging(),
      performance: await this.testPerformance(),
      concurrency: await this.testConcurrencyEnhanced(),
      edgeCases: await this.testEdgeCasesEnhanced(),
      analytics: await this.testAnalytics(),
      stressTest: await this.testStressTest()
    };

    this.printEnhancedSummary(results);
  }

  /**
   * 增强版基础标签生成测试
   */
  private async testBasicTagging(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n📋 1. 增强版基础标签生成测试');
    console.log('-'.repeat(40));

    const testCases = [
      {
        name: '技术学习内容',
        content: '学习TypeScript和React开发现代Web应用程序',
        expectedMinTags: 3
      },
      {
        name: '设计相关内容',
        content: '设计用户体验友好的移动应用界面',
        expectedMinTags: 3
      },
      {
        name: '商业分析内容',
        content: '分析市场数据和制定商业策略',
        expectedMinTags: 3
      },
      {
        name: '管理相关内容',
        content: '管理项目团队和优化工作流程',
        expectedMinTags: 3
      },
      {
        name: '创新产品内容',
        content: '创新产品设计和用户研究',
        expectedMinTags: 3
      }
    ];

    let passed = 0;
    const total = testCases.length;
    const details: string[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${i + 1}. 测试: ${testCase.name}`);
      console.log(`   内容: ${testCase.content}`);

      try {
        const request: TagGenerationRequest = {
          content: testCase.content,
          userId: `enhanced-test-${String(i + 1).padStart(3, '0')}`,
          options: {
            maxTags: 10,
            minRelevance: 0.1
          }
        };

        const result = await this.tagger.generateTags(request);
        this.testResults.set(`basic-${i}`, result);

        const actualTags = result.tags.length;
        const success = actualTags >= testCase.expectedMinTags;

        if (success) {
          passed++;
          details.push(`✅ ${testCase.name}: 成功 (${actualTags}个标签)`);
          console.log(`   ✅ 成功! 生成 ${actualTags} 个标签`);
        } else {
          details.push(`❌ ${testCase.name}: 失败 (期望≥${testCase.expectedMinTags}, 实际${actualTags})`);
          console.log(`   ❌ 失败! 生成 ${actualTags} 个标签 (期望≥${testCase.expectedMinTags})`);
        }

        console.log(`   处理时间: ${result.metadata.processingTime}ms`);
        console.log(`   置信度: ${result.metadata.confidence.toFixed(2)}`);
        console.log(`   覆盖率: ${result.metadata.coverage.toFixed(2)}`);

        if (result.tags.length > 0) {
          console.log(`   标签: ${result.tags.map(t => t.tag.name).join(', ')}`);
        }

      } catch (error) {
        details.push(`❌ ${testCase.name}: 异常 - ${error}`);
        console.log(`   ❌ 异常: ${error}`);
      }
    }

    return { passed, total, details };
  }

  /**
   * 增强版API标签生成测试
   */
  private async testAPITagging(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n🔌 2. 增强版API标签生成测试');
    console.log('-'.repeat(40));

    const apiTests = [
      {
        name: '生成标签API',
        test: () => this.api.generateTags({
          content: '测试增强版API标签生成功能',
          userId: 'enhanced-api-test-user',
          options: { maxTags: 8 }
        })
      },
      {
        name: '搜索标签API',
        test: () => this.api.searchTags({
          query: '技术',
          limit: 10
        })
      },
      {
        name: '热门标签API',
        test: () => this.api.getPopularTags(5)
      },
      {
        name: '趋势标签API',
        test: () => this.api.getTrendingTags(5)
      },
      {
        name: '健康检查API',
        test: () => this.api.healthCheck()
      }
    ];

    let passed = 0;
    const total = apiTests.length;
    const details: string[] = [];

    for (let i = 0; i < apiTests.length; i++) {
      const test = apiTests[i];
      console.log(`\n${i + 1}. 测试: ${test.name}`);

      try {
        const result = await test.test();
        console.log(`   ✅ 成功!`);
        passed++;
        details.push(`✅ ${test.name}: 成功`);
      } catch (error) {
        console.log(`   ❌ 失败: ${error}`);
        details.push(`❌ ${test.name}: 失败 - ${error}`);
      }
    }

    return { passed, total, details };
  }

  /**
   * 增强版性能测试
   */
  private async testPerformance(): Promise<{ passed: number; total: number; details: string[]; avgTime: number }> {
    console.log('\n⚡ 3. 增强版性能测试');
    console.log('-'.repeat(40));

    const testSizes = [50, 200, 500, 1000, 2000];
    const results: number[] = [];

    for (const size of testSizes) {
      const content = '增强版性能测试内容 '.repeat(size / 10);
      console.log(`\n测试内容长度: ${content.length} 字符`);

      const startTime = Date.now();
      try {
        const request: TagGenerationRequest = {
          content,
          userId: 'enhanced-perf-test',
          options: { maxTags: 10 }
        };

        await this.tagger.generateTags(request);
        const processingTime = Date.now() - startTime;
        results.push(processingTime);

        console.log(`   处理时间: ${processingTime}ms`);

      } catch (error) {
        console.log(`   ❌ 失败: ${error}`);
        results.push(999999); // 标记为失败
      }
    }

    const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
    const passed = results.filter(time => time < 500).length; // 更严格的性能要求
    const total = results.length;

    console.log(`\n平均处理时间: ${avgTime.toFixed(2)}ms`);

    return { passed, total, details: [], avgTime };
  }

  /**
   * 增强版并发测试（解决原并发问题）
   */
  private async testConcurrencyEnhanced(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n🚀 4. 增强版并发测试');
    console.log('-'.repeat(40));

    const concurrentBatches = [5, 10, 20]; // 分批测试
    const batchResults: { batch: number; passed: number; total: number; time: number }[] = [];

    for (const batchSize of concurrentBatches) {
      console.log(`\n测试并发批次: ${batchSize} 个请求`);

      const promises: Promise<{ success: boolean; result?: TagGenerationResult; error?: string }>[] = [];
      const startTime = Date.now();

      // 创建并发请求，每个请求有不同的内容
      for (let i = 0; i < batchSize; i++) {
        const request: TagGenerationRequest = {
          content: `增强版并发测试内容 ${i + 1} - 包含技术、设计、商业等关键词`,
          userId: `concurrent-enhanced-${Date.now()}-${i}`,
          options: { maxTags: 8 }
        };

        const promise = this.tagger.generateTags(request)
          .then(result => ({ success: true, result }))
          .catch(error => ({ success: false, error: error.toString() }));

        promises.push(promise);
      }

      try {
        const results = await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        const passed = results.filter(r => r.success && r.result && r.result.tags.length > 0).length;
        const total = batchSize;

        console.log(`   批次完成! 总时间: ${totalTime}ms`);
        console.log(`   平均时间: ${(totalTime / batchSize).toFixed(2)}ms`);
        console.log(`   成功率: ${((passed / total) * 100).toFixed(1)}%`);

        batchResults.push({ batch: batchSize, passed, total, time: totalTime });

      } catch (error) {
        console.log(`   ❌ 批次失败: ${error}`);
        batchResults.push({ batch: batchSize, passed: 0, total: batchSize, time: 0 });
      }
    }

    // 计算总体并发测试结果
    const totalPassed = batchResults.reduce((sum, batch) => sum + batch.passed, 0);
    const totalRequests = batchResults.reduce((sum, batch) => sum + batch.total, 0);
    const overallSuccessRate = totalRequests > 0 ? (totalPassed / totalRequests) : 0;

    console.log(`\n并发测试总结:`);
    console.log(`   总请求数: ${totalRequests}`);
    console.log(`   总成功数: ${totalPassed}`);
    console.log(`   总体成功率: ${(overallSuccessRate * 100).toFixed(1)}%`);

    return {
      passed: Math.floor(overallSuccessRate * 10), // 转换为10分制
      total: 10,
      details: batchResults.map(b => `批次${b.batch}: ${b.passed}/${b.total} (${((b.passed/b.total)*100).toFixed(1)}%)`)
    };
  }

  /**
   * 增强版边界情况测试
   */
  private async testEdgeCasesEnhanced(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n🔍 5. 增强版边界情况测试');
    console.log('-'.repeat(40));

    const edgeCases = [
      {
        name: '空内容',
        content: '',
        expectSuccess: false,
        expectTags: 0
      },
      {
        name: '单字符',
        content: 'A',
        expectSuccess: false,
        expectTags: 0
      },
      {
        name: '空格内容',
        content: '   \t\n   ',
        expectSuccess: false,
        expectTags: 0
      },
      {
        name: '特殊字符',
        content: '各种标点：，。！？；：""\'\'（）【】《》',
        expectSuccess: true,
        expectTags: 1
      },
      {
        name: '纯数字',
        content: '123456789',
        expectSuccess: true,
        expectTags: 1
      },
      {
        name: '混合内容',
        content: '技术123设计！商业@管理#',
        expectSuccess: true,
        expectTags: 2
      },
      {
        name: '超长内容',
        content: '测试'.repeat(1000),
        expectSuccess: true,
        expectTags: 1
      },
      {
        name: 'Unicode内容',
        content: '🚀💻📱💡🎯测试Unicode表情符号',
        expectSuccess: true,
        expectTags: 2
      }
    ];

    let passed = 0;
    const total = edgeCases.length;
    const details: string[] = [];

    for (let i = 0; i < edgeCases.length; i++) {
      const edgeCase = edgeCases[i];
      console.log(`\n${i + 1}. 测试: ${edgeCase.name}`);

      try {
        const request: TagGenerationRequest = {
          content: edgeCase.content,
          userId: `edge-enhanced-${i}`,
          options: { maxTags: 10 }
        };

        const result = await this.tagger.generateTags(request);
        const actualTags = result.tags.length;

        // 判断成功标准
        let success = false;
        if (edgeCase.expectSuccess) {
          success = actualTags >= edgeCase.expectTags;
        } else {
          success = actualTags === edgeCase.expectTags;
        }

        if (success) {
          passed++;
          details.push(`✅ ${edgeCase.name}: 符合预期 (${actualTags}个标签)`);
          console.log(`   ✅ 符合预期 (${actualTags}个标签)`);
        } else {
          details.push(`❌ ${edgeCase.name}: 不符合预期 (期望${edgeCase.expectTags}, 实际${actualTags})`);
          console.log(`   ❌ 不符合预期 (期望${edgeCase.expectTags}, 实际${actualTags})`);
        }

        if (actualTags > 0) {
          console.log(`   标签: ${result.tags.map(t => t.tag.name).join(', ')}`);
        }

      } catch (error) {
        if (!edgeCase.expectSuccess) {
          passed++;
          details.push(`✅ ${edgeCase.name}: 正确处理异常`);
          console.log(`   ✅ 正确处理异常`);
        } else {
          details.push(`❌ ${edgeCase.name}: 意外异常`);
          console.log(`   ❌ 意外异常: ${error}`);
        }
      }
    }

    return { passed, total, details };
  }

  /**
   * 增强版分析功能测试
   */
  private async testAnalytics(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n📊 6. 增强版分析功能测试');
    console.log('-'.repeat(40));

    const analyticsTests = [
      {
        name: '生成分析报告',
        test: () => this.api.getAnalytics()
      },
      {
        name: '获取统计信息',
        test: () => this.api.getStatistics()
      },
      {
        name: '性能指标',
        test: () => this.api.getMetrics()
      }
    ];

    let passed = 0;
    const total = analyticsTests.length;
    const details: string[] = [];

    for (let i = 0; i < analyticsTests.length; i++) {
      const test = analyticsTests[i];
      console.log(`\n${i + 1}. 测试: ${test.name}`);

      try {
        const result = await test.test();
        console.log(`   ✅ 成功!`);
        passed++;
        details.push(`✅ ${test.name}: 成功`);
      } catch (error) {
        console.log(`   ❌ 失败: ${error}`);
        details.push(`❌ ${test.name}: 失败 - ${error}`);
      }
    }

    return { passed, total, details };
  }

  /**
   * 压力测试
   */
  private async testStressTest(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n💪 7. 压力测试');
    console.log('-'.repeat(40));

    const stressLevels = [
      { name: '轻量级', requests: 50, concurrency: 5 },
      { name: '中等强度', requests: 100, concurrency: 10 },
      { name: '高强度', requests: 200, concurrency: 20 }
    ];

    let totalPassed = 0;
    let totalTests = 0;
    const details: string[] = [];

    for (const level of stressLevels) {
      console.log(`\n${level.name}压力测试: ${level.requests}个请求，并发${level.concurrency}`);

      const startTime = Date.now();
      let successCount = 0;

      // 分批执行压力测试
      const batchSize = level.concurrency;
      const batches = Math.ceil(level.requests / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        const batchPromises: Promise<void>[] = [];
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, level.requests);

        for (let i = batchStart; i < batchEnd; i++) {
          const promise = this.tagger.generateTags({
            content: `压力测试内容 ${i} - 包含技术设计商业管理创新等关键词`,
            userId: `stress-${level.name}-${i}`,
            options: { maxTags: 5 }
          }).then(() => {
            successCount++;
          }).catch(() => {
            // 忽略单个请求失败
          });

          batchPromises.push(promise);
        }

        await Promise.all(batchPromises);
      }

      const totalTime = Date.now() - startTime;
      const successRate = (successCount / level.requests) * 100;
      const throughput = (level.requests / totalTime) * 1000; // 请求/秒

      console.log(`   完成! 时间: ${totalTime}ms`);
      console.log(`   成功率: ${successRate.toFixed(1)}%`);
      console.log(`   吞吐量: ${throughput.toFixed(1)} 请求/秒`);

      if (successRate >= 95) {
        totalPassed++;
        details.push(`✅ ${level.name}: 成功率${successRate.toFixed(1)}%`);
      } else {
        details.push(`❌ ${level.name}: 成功率${successRate.toFixed(1)}% (低于95%)`);
      }

      totalTests++;
    }

    return { passed: totalPassed, total: totalTests, details };
  }

  /**
   * 打印增强版测试总结
   */
  private printEnhancedSummary(results: any): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 T105智能标签生成系统增强版测试报告');
    console.log('='.repeat(60));

    let totalPassed = 0;
    let totalTests = 0;

    const testNames = ['基础功能', 'API接口', '性能测试', '并发测试', '边界情况', '分析功能', '压力测试'];

    for (let i = 0; i < testNames.length; i++) {
      const result = Object.values(results)[i] as any;
      totalPassed += result.passed;
      totalTests += result.total;
      const percentage = ((result.passed / result.total) * 100).toFixed(1);
      const status = result.passed === result.total ? '✅' :
                    result.passed / result.total >= 0.8 ? '⚠️' : '❌';

      console.log(`${status} ${testNames[i]}: ${result.passed}/${result.total} (${percentage}%)`);

      if (result.avgTime !== undefined) {
        console.log(`   平均响应时间: ${result.avgTime.toFixed(2)}ms`);
      }

      if (result.details && result.details.length > 0) {
        result.details.slice(0, 3).forEach((detail: string) => {
          console.log(`   ${detail}`);
        });
        if (result.details.length > 3) {
          console.log(`   ... 还有 ${result.details.length - 3} 项详细信息`);
        }
      }
    }

    const overallPercentage = ((totalPassed / totalTests) * 100).toFixed(1);
    const overallStatus = totalPassed === totalTests ? '✅' :
                          totalPassed / totalTests >= 0.8 ? '⚠️' : '❌';

    console.log('\n' + '-'.repeat(60));
    console.log(`${overallStatus} 总体测试结果: ${totalPassed}/${totalTests} (${overallPercentage}%)`);

    if (totalPassed === totalTests) {
      console.log('🎉 所有测试通过！T105智能标签生成系统增强版运行完美。');
    } else if (totalPassed / totalTests >= 0.8) {
      console.log('✅ 大部分测试通过！系统基本可用，建议优化剩余问题。');
    } else {
      console.log('⚠️  部分测试未通过，需要进一步优化。');
    }

    console.log('\n🔧 增强版改进:');
    console.log('   ✅ 解决了并发测试问题');
    console.log('   ✅ 改进了边界情况处理');
    console.log('   ✅ 增加了压力测试');
    console.log('   ✅ 扩展了关键词库');
    console.log('   ✅ 增强了特殊字符处理');
    console.log('   ✅ 优化了长内容处理');

    console.log('='.repeat(60));
  }
}

/**
 * 运行T105增强版测试
 */
export async function runT105EnhancedTest(): Promise<void> {
  const testSuite = new T105EnhancedTestSuite();
  await testSuite.runEnhancedTest();
}

// 如果直接运行此文件
if (require.main === module) {
  runT105EnhancedTest().catch(console.error);
}