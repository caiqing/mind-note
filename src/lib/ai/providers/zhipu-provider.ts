/**
 * 智谱AI (GLM) 服务提供商实现
 */

import { zhipuai } from 'zhipuai-sdk-nodejs-v4';
import {
  BaseAIProvider,
  AIRequest,
  AIResponse,
  CategoryRequest,
  CategoryResponse,
  CategoryPrediction,
  TagRequest,
  TagResponse,
  TagPrediction,
  TagType,
  SummaryRequest,
  SummaryResponse,
  SummaryStyle,
  KeywordRequest,
  KeywordResponse,
  KeywordPrediction,
  LanguageResponse,
  SentimentRequest,
  SentimentResponse,
  SentimentResult,
  EmotionResult,
  ModelInfo,
  AIError,
} from './base-provider';

export class ZhipuProvider extends BaseAIProvider {
  private client: any;

  constructor(apiKey: string, model: string = 'glm-4') {
    super(
      '智谱AI GLM',
      'zhipu',
      apiKey,
      'https://open.bigmodel.cn/api/paas/v4',
      model,
    );

    this.client = new zhipuai({
      apiKey: this.apiKey,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: '测试' }],
        max_tokens: 10,
      });
      return response.choices && response.choices.length > 0;
    } catch (error) {
      console.error('ZhipuAI availability check failed:', error);
      return false;
    }
  }

  getModelInfo(): ModelInfo {
    return {
      name: this.model,
      maxTokens: 128000,
      supportedOperations: [
        'categorize',
        'tag',
        'summarize',
        'extract_keywords',
        'analyze_sentiment',
      ],
      costPerToken: {
        input: 0.00005, // ¥0.05 per 1K input tokens
        output: 0.00012, // ¥0.12 per 1K output tokens
      },
    };
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: request.context || '你是一个有帮助的AI助手。',
          },
          {
            role: 'user',
            content: request.content,
          },
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
      });

      const content = response.choices[0]?.message?.content || '';
      const responseTime = Date.now() - startTime;
      const tokensUsed = this.calculateTokenUsage(
        JSON.stringify(request),
        content,
      );

      return this.createAIResponse(content, tokensUsed, responseTime);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const aiError = this.createError(error as Error);
      return this.createAIResponse(
        '',
        { input: 0, output: 0, total: 0 },
        responseTime,
        aiError,
      );
    }
  }

  async generateCategories(content: string): Promise<CategoryResponse> {
    const prompt = `
你是一个专业的中文笔记分类助手。请为以下笔记内容推荐合适的分类。

笔记内容：
${content}

请返回JSON格式的结果，格式如下：
{
  "categories": [
    {
      "name": "分类名称",
      "confidence": 0.85,
      "reasoning": "分类理由",
      "suggestions": ["相关建议1", "相关建议2"]
    }
  ],
  "primaryCategory": {
    "name": "主要分类",
    "confidence": 0.92
  },
  "confidence": 0.92,
  "reasoning": "整体分析理由"
}

要求：
1. 推荐3-5个最相关的中文分类
2. 置信度范围0-1
3. 优先考虑工作、学习、生活、技术、创意等通用分类
4. 分类名称简洁明了，2-4个字为宜
5. 特别适合中文内容理解
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的中文内容分类专家，擅长为中文笔记推荐精准的分类。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);

      return {
        categories: result.categories || [],
        primaryCategory: result.primaryCategory || {
          name: '未分类',
          confidence: 0.5,
        },
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || '',
      };
    } catch (error) {
      console.error('Error generating categories with ZhipuAI:', error);
      return {
        categories: [
          { name: '未分类', confidence: 0.5, reasoning: '无法自动分类' },
        ],
        primaryCategory: { name: '未分类', confidence: 0.5 },
        confidence: 0.5,
        reasoning: '分析过程中出现错误',
      };
    }
  }

  async generateTags(
    content: string,
    options?: TagRequest,
  ): Promise<TagResponse> {
    const {
      maxTags = 5,
      tagTypes = [TagType.TOPIC, TagType.PRIORITY],
      language = 'zh',
    } = options || {};

    const prompt = `
你是一个专业的中文标签生成助手。请为以下笔记内容生成相关的中文标签。

笔记内容：
${content}

要求：
1. 生成最多${maxTags}个中文标签
2. 标签应该简洁明了（1-4个字）
3. 包含不同类型的标签：${tagTypes.join('、')}
4. 标签要符合中文表达习惯

请返回JSON格式的结果：
{
  "tags": [
    {
      "name": "标签名",
      "type": "topic",
      "confidence": 0.9,
      "relevance": 0.85,
      "suggestions": ["相关建议1"]
    }
  ],
  "confidence": 0.88,
  "reasoning": "标签生成理由"
}

标签类型说明：
- topic: 主题标签（如：工作、学习、技术）
- priority: 优先级标签（如：重要、紧急、普通）
- status: 状态标签（如：进行中、已完成、待办）
- emotion: 情感标签（如：积极、消极、中性）
- custom: 自定义标签

请确保标签符合中文使用习惯，不要直译英文标签。
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的中文标签生成专家，特别擅长为中文内容生成地道的标签。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);

      return {
        tags: result.tags || [],
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || '',
      };
    } catch (error) {
      console.error('Error generating tags with ZhipuAI:', error);
      return {
        tags: [],
        confidence: 0.0,
        reasoning: '标签生成失败',
      };
    }
  }

  async generateSummary(
    content: string,
    options?: SummaryRequest,
  ): Promise<SummaryResponse> {
    const {
      maxLength = 200,
      style = SummaryStyle.PARAGRAPH,
      focus = [],
      language = 'zh',
    } = options || {};

    const styleInstructions = {
      [SummaryStyle.PARAGRAPH]: '请用段落形式总结',
      [SummaryStyle.BULLET]: '请用要点形式总结，每个要点用•开头',
      [SummaryStyle.KEY_POINTS]: '请提取关键要点，每个要点一行',
    };

    const focusInstructions =
      focus.length > 0 ? `特别关注以下方面：${focus.join('、')}` : '';

    const prompt = `
你是一个专业的中文内容摘要助手。请为以下笔记内容生成简洁的中文摘要。

笔记内容：
${content}

要求：
- 摘要长度：${maxLength}字以内
- ${styleInstructions[style]}
- 使用自然流畅的中文表达
- 突出重点和关键信息
- 保持原文的核心意思
${focusInstructions}

${style === SummaryStyle.BULLET ? '摘要：\n• ' : '摘要：'}
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的中文内容摘要专家，擅长提取关键信息并生成简洁明了的中文摘要。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const summary = response.choices[0]?.message?.content || '';

      // 如果是关键要点格式，解析要点
      let keyPoints: string[] | undefined;
      if (style === SummaryStyle.KEY_POINTS) {
        keyPoints = summary
          .split('\n')
          .map(line => line.replace(/^[-*•]\s*/, '').trim())
          .filter(line => line.length > 0);
      }

      return {
        summary: summary.trim(),
        style,
        length: summary.length,
        confidence: 0.85,
        keyPoints,
      };
    } catch (error) {
      console.error('Error generating summary with ZhipuAI:', error);
      return {
        summary: '摘要生成失败',
        style,
        length: 0,
        confidence: 0.0,
      };
    }
  }

  async extractKeywords(content: string): Promise<KeywordResponse> {
    const prompt = `
你是一个专业的中文关键词提取专家。请从以下中文文本中提取关键词。

文本内容：
${content}

要求：
1. 提取10-15个最重要的中文关键词
2. 关键词应该是单字词、双字词或常用短语
3. 按重要性排序，最重要的在前
4. 关键词要能代表文本的核心内容
5. 优先提取名词和专业术语

请返回JSON格式：
{
  "keywords": [
    {
      "word": "关键词",
      "score": 0.9,
      "frequency": 5,
      "type": "single",
      "context": "出现上下文"
    }
  ],
  "confidence": 0.88,
  "language": "zh"
}

类型说明：
- type: single（单字词）, phrase（短语）, entity（实体）
- score: 重要性评分，0-1
- frequency: 在文本中出现的频率
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的中文关键词提取专家，精通中文语义理解。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);

      return {
        keywords: result.keywords || [],
        confidence: result.confidence || 0.5,
        language: result.language || 'zh',
      };
    } catch (error) {
      console.error('Error extracting keywords with ZhipuAI:', error);
      return {
        keywords: [],
        confidence: 0.0,
        language: 'zh',
      };
    }
  }

  async detectLanguage(content: string): Promise<LanguageResponse> {
    const prompt = `
你是一个语言检测专家。请检测以下文本的语言。

文本内容：
${content.substring(0, 1000)}...

请返回JSON格式：
{
  "language": "zh",
  "confidence": 0.95,
  "detectedLanguage": "中文"
}

支持的语言代码：
- zh: 中文
- en: 英文
- ja: 日文
- ko: 韩文
- es: 西班牙文
- fr: 法文
- de: 德文
- ru: 俄文

请特别注意区分简体中文和繁体中文，都使用zh代码。
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一个语言检测专家，特别擅长识别中文及其变体。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);

      return {
        language: result.language || 'unknown',
        confidence: result.confidence || 0.5,
        detectedLanguage: result.detectedLanguage || '未知',
      };
    } catch (error) {
      console.error('Error detecting language with ZhipuAI:', error);
      return {
        language: 'unknown',
        confidence: 0.0,
        detectedLanguage: '检测失败',
      };
    }
  }

  async analyzeSentiment(content: string): Promise<SentimentResponse> {
    const prompt = `
你是一个专业的中文情感分析专家。请分析以下中文文本的情感倾向。

文本内容：
${content}

请返回JSON格式：
{
  "sentiment": {
    "polarity": "positive",
    "score": 0.7,
    "magnitude": 0.8
  },
  "emotions": [
    {
      "emotion": "joy",
      "score": 0.8
    }
  ],
  "confidence": 0.85,
  "language": "zh"
}

情感类型说明：
- polarity: positive（积极）, negative（消极）, neutral（中性）
- score: -1到1之间，负数表示消极，正数表示积极
- magnitude: 0到1之间，表示情感强度
- emotion: joy（喜悦）, sadness（悲伤）, anger（愤怒）, fear（恐惧）, surprise（惊讶）, disgust（厌恶）

请特别考虑中文的表达习惯和情感词汇。
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的中文情感分析专家，深刻理解中文的情感表达方式。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);

      return {
        sentiment: result.sentiment || {
          polarity: 'neutral',
          score: 0.0,
          magnitude: 0.0,
        },
        emotions: result.emotions || [],
        confidence: result.confidence || 0.5,
        language: result.language || 'zh',
      };
    } catch (error) {
      console.error('Error analyzing sentiment with ZhipuAI:', error);
      return {
        sentiment: {
          polarity: 'neutral',
          score: 0.0,
          magnitude: 0.0,
        },
        emotions: [],
        confidence: 0.0,
        language: 'zh',
      };
    }
  }
}
