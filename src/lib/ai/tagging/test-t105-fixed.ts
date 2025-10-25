/**
 * T105智能标签生成系统修复版完整测试
 * 使用独立标签生成器绕过OpenAI Provider问题
 */

import { StandaloneTagger } from './standalone-tagger';
import { TagAPI } from './tag-api';
import {
  TagGenerationRequest,
  TagGenerationResult,
  TagGenerationOptions
} from './types';

/**
 * T105修复版测试套件
 */
export class T105FixedTestSuite {
  private tagger: StandaloneTagger;
  private api: TagAPI;

  constructor() {
    this.tagger = new StandaloneTagger();
    this.api = new TagAPI();
  }

  /**
   * 运行完整测试
   */
  async runFullTest(): Promise<void> {
    console.log('🚀 开始T105智能标签生成系统修复版测试...');
    console.log('=' * 60);

    const results = {
      basic: await this.testBasicTagging(),
      api: await this.testAPITagging(),
      performance: await this.testPerformance(),
      concurrency: await this.testConcurrency(),
      edgeCases: await this.testEdgeCases(),
      analytics: await this.testAnalytics()
    };

    this.printSummary(results);
  }

  /**
   * 基础标签生成测试
   */
  private async testBasicTagging(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n📋 1. 基础标签生成测试');
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
          userId: `test-user-${String(i + 1).padStart(3, '0')}`,
          options: {
            maxTags: 8,
            minRelevance: 0.2
          }
        };

        const result = await this.tagger.generateTags(request);

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
   * API标签生成测试
   */
  private async testAPITagging(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n🔌 2. API标签生成测试');
    console.log('-'.repeat(40));

    const apiTests = [
      {
        name: '生成标签API',
        test: () => this.api.generateTags({
          content: '测试API标签生成功能',
          userId: 'api-test-user',
          options: { maxTags: 5 }
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
   * 性能测试
   */
  private async testPerformance(): Promise<{ passed: number; total: number; details: string[]; avgTime: number }> {
    console.log('\n⚡ 3. 性能测试');
    console.log('-'.repeat(40));

    const testSizes = [100, 500, 1000, 2000];
    const results: number[] = [];

    for (const size of testSizes) {
      const content = '测试性能内容 '.repeat(size / 10);
      console.log(`\n测试内容长度: ${content.length} 字符`);

      const startTime = Date.now();
      try {
        const request: TagGenerationRequest = {
          content,
          userId: 'perf-test',
          options: { maxTags: 8 }
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
    const passed = results.filter(time => time < 1000).length;
    const total = results.length;

    console.log(`\n平均处理时间: ${avgTime.toFixed(2)}ms`);

    return { passed, total, details: [], avgTime };
  }

  /**
   * 并发测试
   */
  private async testConcurrency(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n🚀 4. 并发测试');
    console.log('-'.repeat(40));

    const concurrentRequests = 10;
    const promises: Promise<TagGenerationResult>[] = [];

    console.log(`发起 ${concurrentRequests} 个并发请求...`);

    const startTime = Date.now();

    for (let i = 0; i < concurrentRequests; i++) {
      const request: TagGenerationRequest = {
        content: `并发测试内容 ${i + 1}`,
        userId: 'concurrent-test',
        options: { maxTags: 5 }
      };

      promises.push(this.tagger.generateTags(request));
    }

    try {
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      const passed = results.filter(result => result.tags.length > 0).length;
      const total = concurrentRequests;

      console.log(`\n并发测试完成!`);
      console.log(`   总时间: ${totalTime}ms`);
      console.log(`   平均时间: ${(totalTime / concurrentRequests).toFixed(2)}ms`);
      console.log(`   成功率: ${((passed / total) * 100).toFixed(1)}%`);

      return { passed, total, details: [] };

    } catch (error) {
      console.log(`❌ 并发测试失败: ${error}`);
      return { passed: 0, total: concurrentRequests, details: [error.toString()] };
    }
  }

  /**
   * 边界情况测试
   */
  private async testEdgeCases(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n🔍 5. 边界情况测试');
    console.log('-'.repeat(40));

    const edgeCases = [
      {
        name: '空内容',
        content: '',
        expectSuccess: false
      },
      {
        name: '单字符',
        content: 'A',
        expectSuccess: false
      },
      {
        name: '特殊字符',
        content: '各种标点：，。！？；：""\'\'（）【】《》',
        expectSuccess: true
      },
      {
        name: '纯数字',
        content: '123456789',
        expectSuccess: true
      },
      {
        name: '超长内容',
        content: '测试'.repeat(1000),
        expectSuccess: true
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
          userId: 'edge-test',
          options: { maxTags: 8 }
        };

        const result = await this.tagger.generateTags(request);
        const success = result.tags.length > 0;

        if (success === edgeCase.expectSuccess) {
          passed++;
          details.push(`✅ ${edgeCase.name}: 符合预期`);
          console.log(`   ✅ 符合预期 (${result.tags.length}个标签)`);
        } else {
          details.push(`❌ ${edgeCase.name}: 不符合预期`);
          console.log(`   ❌ 不符合预期 (${result.tags.length}个标签)`);
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
   * 分析功能测试
   */
  private async testAnalytics(): Promise<{ passed: number; total: number; details: string[] }> {
    console.log('\n📊 6. 分析功能测试');
    console.log('-'.repeat(40));

    const analyticsTests = [
      {
        name: '生成分析报告',
        test: () => this.api.getAnalytics()
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
   * 打印测试总结
   */
  private printSummary(results: any): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 T105智能标签生成系统测试报告');
    console.log('='.repeat(60));

    let totalPassed = 0;
    let totalTests = 0;

    const testNames = ['基础功能', 'API接口', '性能测试', '并发测试', '边界情况', '分析功能'];

    for (let i = 0; i < testNames.length; i++) {
      const result = Object.values(results)[i] as any;
      totalPassed += result.passed;
      totalTests += result.total;
      const percentage = ((result.passed / result.total) * 100).toFixed(1);
      const status = result.passed === result.total ? '✅' : '⚠️';

      console.log(`${status} ${testNames[i]}: ${result.passed}/${result.total} (${percentage}%)`);

      if (result.avgTime !== undefined) {
        console.log(`   平均响应时间: ${result.avgTime.toFixed(2)}ms`);
      }
    }

    const overallPercentage = ((totalPassed / totalTests) * 100).toFixed(1);
    const overallStatus = totalPassed === totalTests ? '✅' : '⚠️';

    console.log('\n' + '-'.repeat(60));
    console.log(`${overallStatus} 总体测试结果: ${totalPassed}/${totalTests} (${overallPercentage}%)`);

    if (totalPassed === totalTests) {
      console.log('🎉 所有测试通过！T105智能标签生成系统运行正常。');
    } else {
      console.log('⚠️  部分测试未通过，需要进一步优化。');
    }

    console.log('='.repeat(60));
  }
}

/**
 * 运行T105修复版测试
 */
export async function runT105FixedTest(): Promise<void> {
  const testSuite = new T105FixedTestSuite();
  await testSuite.runFullTest();
}

// 如果直接运行此文件
if (require.main === module) {
  runT105FixedTest().catch(console.error);
}