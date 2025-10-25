/**
 * T105智能标签生成系统修复
 * 解决测试中发现的问题
 */

import { TaggingService } from './tagging-service';
import { TagGenerationRequest, TagGenerationOptions } from './types';

/**
 * 修复标签生成阈值过低的问题
 */
export class TaggingServiceFixes {
  /**
   * 优化标签生成配置
   */
  static getOptimizedConfig(): Partial<TagGenerationOptions> {
    return {
      maxTags: 8, // 增加最大标签数量
      minRelevance: 0.2, // 降低相关性阈值
      enableHierarchical: true,
      enableWeightOptimization: true,
      enableUserLearning: true,
      // 添加更多提取策略
      customTagLibrary: ['技术', '产品', '设计', '营销', '管理', '创新', '分析', '策略'],
      // 启用情感标签
      includeEmotionalTags: true,
      // 启用行动项标签
      includeActionItems: true
    };
  }

  /**
   * 修复标签过滤逻辑
   */
  static createFixedTaggingService(): TaggingService {
    const config = TaggingServiceFixes.getOptimizedConfig();
    return new TaggingService({
      algorithm: 'hybrid',
      maxTags: config.maxTags || 8,
      minRelevance: config.minRelevance || 0.2,
      enableHierarchical: config.enableHierarchical ?? true,
      enableWeightOptimization: config.enableWeightOptimization ?? true,
      enableUserLearning: config.enableUserLearning ?? true,
      cacheEnabled: true,
      logLevel: 'debug' // 启用详细日志
    });
  }

  /**
   * 增强的标签生成请求
   */
  static createEnhancedRequest(
    content: string,
    userId: string
  ): TagGenerationRequest {
    return {
      content,
      userId,
      options: {
        ...TaggingServiceFixes.getOptimizedConfig(),
        // 内容预处理选项
        enableContentPreprocessing: true,
        enableKeywordExpansion: true,
        enableConceptMapping: true,
        // 上下文增强
        context: {
          domain: 'general',
          purpose: 'content-tagging',
          language: 'zh-CN'
        }
      }
    };
  }

  /**
   * 修复后的标签生成测试
   */
  static async testFixedTagging(): Promise<void> {
    console.log('🚀 测试修复后的标签生成系统...');

    const taggingService = TaggingServiceFixes.createFixedTaggingService();

    const testCases = [
      {
        content: '学习TypeScript和React开发现代化的Web应用程序',
        userId: 'test-001'
      },
      {
        content: '设计用户体验友好的移动应用界面',
        userId: 'test-002'
      },
      {
        content: '分析市场数据和制定商业策略',
        userId: 'test-003'
      },
      {
        content: '管理项目团队和优化工作流程',
        userId: 'test-004'
      },
      {
        content: '创新产品设计和用户研究',
        userId: 'test-005'
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`\n📝 测试内容: ${testCase.content}`);

        const request = TaggingServiceFixes.createEnhancedRequest(
          testCase.content,
          testCase.userId
        );

        const result = await taggingService.generateTags(request);

        console.log(`✅ 生成成功!`);
        console.log(`   标签数量: ${result.tags.length}`);
        console.log(`   处理时间: ${result.metadata.processingTime}ms`);
        console.log(`   置信度: ${result.metadata.confidence.toFixed(2)}`);

        if (result.tags.length > 0) {
          console.log(`   标签列表:`);
          result.tags.forEach((tag, index) => {
            console.log(`     ${index + 1}. ${tag.tag.name} (${tag.tag.type}) - 权重: ${tag.tag.weight.toFixed(2)} - 置信度: ${tag.tag.confidence.toFixed(2)}`);
            console.log(`        推理: ${tag.reasoning}`);
          });
        }

        if (result.suggestions.length > 0) {
          console.log(`   建议标签:`);
          result.suggestions.forEach((suggestion, index) => {
            console.log(`     ${index + 1}. ${suggestion.tag.name} - ${suggestion.reason}`);
          });
        }

      } catch (error) {
        console.error(`❌ 测试失败:`, error);
      }
    }

    console.log('\n📊 测试完成!');
  }
}

/**
 * 导出修复函数
 */
export async function runTaggingFixes(): Promise<void> {
  await TaggingServiceFixes.testFixedTagging();
}

// 如果直接运行此文件
if (require.main === module) {
  runTaggingFixes().catch(console.error);
}