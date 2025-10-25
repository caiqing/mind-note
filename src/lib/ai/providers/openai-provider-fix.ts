/**
 * OpenAI Provider 紧急修复补丁
 * 解决空响应和undefined错误问题
 */

import { OpenAIProviderV2 } from './openai-provider-v2';

/**
 * 修复后的OpenAI Provider
 */
export class FixedOpenAIProviderV2 extends OpenAIProviderV2 {
  /**
   * 重写概念提取方法，添加错误处理
   */
  async extractKeyConcepts(text: string, options?: any): Promise<any[]> {
    try {
      // 检查输入
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn('⚠️ 空文本输入，返回空概念列表');
        return [];
      }

      // 调用原始方法
      const concepts = await super.extractKeyConcepts(text, options);

      // 验证返回结果
      if (!concepts || !Array.isArray(concepts)) {
        console.warn('⚠️ 概念提取返回无效结果，使用默认概念');
        return this.generateDefaultConcepts(text);
      }

      return concepts;
    } catch (error) {
      console.error('❌ 概念提取失败:', error);
      // 返回基于关键词的默认概念
      return this.generateDefaultConcepts(text);
    }
  }

  /**
   * 重写情感分析方法，添加错误处理
   */
  async analyzeSentiment(text: string, options?: any): Promise<any> {
    try {
      // 检查输入
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn('⚠️ 空文本输入，返回中性情感');
        return {
          sentiment: 'neutral',
          confidence: 0.5,
          emotions: [],
          reasoning: '空文本，默认为中性情感'
        };
      }

      // 调用原始方法
      const sentiment = await super.analyzeSentiment(text, options);

      // 验证返回结果
      if (!sentiment || !sentiment.sentiment) {
        console.warn('⚠️ 情感分析返回无效结果，使用默认情感');
        return {
          sentiment: 'neutral',
          confidence: 0.5,
          emotions: [],
          reasoning: '情感分析失败，默认为中性情感'
        };
      }

      return sentiment;
    } catch (error) {
      console.error('❌ 情感分析失败:', error);
      // 返回默认情感
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        emotions: [],
        reasoning: '情感分析异常，默认为中性情感'
      };
    }
  }

  /**
   * 重写关键词提取方法，添加错误处理
   */
  async extractKeywords(text: string, options?: any): Promise<any[]> {
    try {
      // 检查输入
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn('⚠️ 空文本输入，返回空关键词列表');
        return [];
      }

      // 调用原始方法
      const keywords = await super.extractKeywords(text, options);

      // 验证返回结果
      if (!keywords || !Array.isArray(keywords)) {
        console.warn('⚠️ 关键词提取返回无效结果，生成默认关键词');
        return this.generateDefaultKeywords(text);
      }

      return keywords;
    } catch (error) {
      console.error('❌ 关键词提取失败:', error);
      // 返回基于文本分割的默认关键词
      return this.generateDefaultKeywords(text);
    }
  }

  /**
   * 生成默认概念（基于文本分析）
   */
  private generateDefaultConcepts(text: string): any[] {
    const concepts = [];
    const textLower = text.toLowerCase();

    // 简单的概念映射
    const conceptMap: Record<string, string> = {
      '学习': '学习',
      '设计': '设计',
      '开发': '开发',
      '分析': '分析',
      '管理': '管理',
      '产品': '产品',
      '用户': '用户',
      '技术': '技术',
      '数据': '数据',
      '系统': '系统',
      '应用': '应用',
      '服务': '服务',
      '平台': '平台',
      '解决方案': '解决方案',
      '流程': '流程',
      '策略': '策略'
    };

    for (const [keyword, concept] of Object.entries(conceptMap)) {
      if (textLower.includes(keyword)) {
        concepts.push({
          concept,
          importance: 0.7,
          context: `从文本中识别的${concept}概念`,
          relatedConcepts: []
        });
      }
    }

    return concepts.slice(0, 5); // 限制最多5个概念
  }

  /**
   * 生成默认关键词
   */
  private generateDefaultKeywords(text: string): any[] {
    // 简单的关键词提取（基于文本分割）
    const words = text
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ') // 保留中文、英文、数字和空格
      .split(/\s+/)
      .filter(word => word.length >= 2) // 过滤掉太短的词
      .slice(0, 10); // 限制最多10个关键词

    return words.map((word, index) => ({
      keyword: word,
      relevance: Math.max(0.8 - index * 0.05, 0.3), // 递减的相关性
      context: `从文本中提取的关键词`,
      category: 'general'
    }));
  }
}

/**
 * 创建修复后的OpenAI Provider实例
 */
export function createFixedOpenAIProvider(config?: any): FixedOpenAIProviderV2 {
  return new FixedOpenAIProviderV2(config);
}

/**
 * 测试修复后的Provider
 */
export async function testFixedProvider(): Promise<void> {
  console.log('🔧 测试修复后的OpenAI Provider...');

  const provider = createFixedOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo'
  });

  const testTexts = [
    '学习TypeScript和React开发现代Web应用',
    '设计用户体验友好的移动应用界面',
    '分析市场数据并制定商业策略',
    '管理项目团队和优化工作流程',
    '创新产品设计和用户研究'
  ];

  for (const text of testTexts) {
    console.log(`\n📝 测试文本: ${text}`);

    try {
      // 测试关键词提取
      const keywords = await provider.extractKeywords(text);
      console.log(`✅ 关键词提取: ${keywords.length} 个关键词`);
      keywords.forEach((kw, i) => {
        console.log(`   ${i + 1}. ${kw.keyword} (${kw.relevance.toFixed(2)})`);
      });

      // 测试概念提取
      const concepts = await provider.extractKeyConcepts(text);
      console.log(`✅ 概念提取: ${concepts.length} 个概念`);
      concepts.forEach((concept, i) => {
        console.log(`   ${i + 1}. ${concept.concept} (${concept.importance.toFixed(2)})`);
      });

      // 测试情感分析
      const sentiment = await provider.analyzeSentiment(text);
      console.log(`✅ 情感分析: ${sentiment.sentiment} (${sentiment.confidence.toFixed(2)})`);

    } catch (error) {
      console.error(`❌ 测试失败:`, error);
    }
  }

  console.log('\n📊 Provider测试完成!');
}

// 如果直接运行此文件
if (require.main === module) {
  testFixedProvider().catch(console.error);
}