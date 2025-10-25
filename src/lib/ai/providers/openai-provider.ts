/**
 * OpenAI AI服务提供商实现 - T103.1
 * 符合AnalysisProvider接口标准
 */

import { openai } from '@ai-sdk/openai';
import {
  AnalysisProvider,
  AnalysisRequest,
  AnalysisResult,
  ClassificationResult,
  SentimentResult,
  KeyConcept,
  KeywordExtraction
} from '@/types/ai-analysis';
import { aiConfig } from '../ai-config';

export class OpenAIProvider implements AnalysisProvider {
  name = 'openai';
  private model: string;

  constructor() {
    const config = aiConfig.getProviderConfig('openai');
    if (!config) {
      throw new Error('OpenAI provider not configured');
    }

    this.model = config.models[0].name;
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    const requestId = `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const options = request.options || {};
      const results: AnalysisResult['results'] = {};

      // 并行执行所有请求的分析任务
      const tasks: Promise<void>[] = [];

      if (options.generateSummary) {
        tasks.push(this.generateSummaryTask(request.content).then(summary => {
          results.summary = summary;
        }));
      }

      if (options.extractKeywords) {
        tasks.push(this.extractKeywordsTask(request.content).then(keywords => {
          results.keywords = keywords;
        }));
      }

      if (options.classifyContent) {
        tasks.push(this.classifyContentTask(request.content).then(classification => {
          results.classification = classification;
        }));
      }

      if (options.analyzeSentiment) {
        tasks.push(this.analyzeSentimentTask(request.content).then(sentiment => {
          results.sentiment = sentiment;
        }));
      }

      if (options.extractKeyConcepts) {
        tasks.push(this.extractKeyConceptsTask(request.content).then(concepts => {
          results.keyConcepts = concepts;
        }));
      }

      if (options.generateTags) {
        tasks.push(this.generateTagsTask(request.content).then(tags => {
          results.tags = tags;
        }));
      }

      // 等待所有任务完成
      await Promise.all(tasks);

      const processingTime = Date.now() - startTime;

      // 计算成本（估算）
      const inputTokens = this.estimateTokens(request.content);
      const outputTokens = this.estimateOutputTokens(results);
      const cost = aiConfig.calculateCost('openai', this.model, inputTokens, outputTokens);

      return {
        noteId: request.noteId,
        userId: request.userId,
        provider: this.name,
        model: this.model,
        processingTime,
        cost,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        results,
        metadata: {
          confidence: this.calculateOverallConfidence(results),
          processedAt: new Date(),
          requestId,
          version: '1.0.0',
        },
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      throw new Error(`OpenAI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSummary(content: string): Promise<string> {
    return this.generateSummaryTask(content);
  }

  private async generateSummaryTask(content: string): Promise<string> {
    const prompt = `请为以下内容生成一个简洁的摘要，不超过100字：

内容：
${content}

摘要要求：
1. 概括主要内容
2. 突出关键信息
3. 保持客观准确
4. 语言简洁明了
5. 不超过100字

摘要：`;

    try {
      const { text } = await openai(prompt, {
        model: this.model,
        maxTokens: 200,
        temperature: 0.3,
        systemPrompt: '你是一个专业的内容分析师，擅长提取关键信息并生成简洁准确的摘要。'
      });

      return text.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      return '';
    }
  }

  async extractKeywords(content: string): Promise<string[]> {
    return this.extractKeywordsTask(content);
  }

  private async extractKeywordsTask(content: string): Promise<string[]> {
    const prompt = `请从以下内容中提取5-8个最重要的关键词：

内容：
${content}

关键词要求：
1. 代表核心概念
2. 具有辨识度
3. 去除重复词汇
4. 按重要性排序
5. 每个关键词2-6个字

关键词（用逗号分隔）：`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的文本分析师，擅长识别和提取文本中的关键概念和术语。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '';
    return response.split(/[,，]/).map(k => k.trim()).filter(k => k.length > 0);
  }

  async classifyContent(content: string): Promise<ClassificationResult> {
    return this.classifyContentTask(content);
  }

  private async classifyContentTask(content: string): Promise<ClassificationResult> {
    const categories = [
      '技术', '商业', '教育', '生活', '创意', '个人', '其他'
    ];

    const prompt = `请对以下内容进行分类：

内容：
${content}

可选分类：
${categories.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

请按照以下格式回答：
主要分类：[分类名称]
置信度：[0-1之间的数值]
分类理由：[简要说明]
备选分类：[分类1, 分类2]`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的内容分类师，能够准确判断文本的主题类别。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '';

    // 解析响应
    const categoryMatch = response.match(/主要分类[：:]\s*(.+)/);
    const confidenceMatch = response.match(/置信度[：:]\s*([\d.]+)/);
    const reasoningMatch = response.match(/分类理由[：:]\s*(.+)/);
    const alternativesMatch = response.match(/备选分类[：:]\s*(.+)/);

    const category = categoryMatch?.[1]?.trim() || '其他';
    const confidence = parseFloat(confidenceMatch?.[1] || '0.5');
    const reasoning = reasoningMatch?.[1]?.trim() || '基于内容分析得出';
    const alternativesText = alternativesMatch?.[1]?.trim() || '';
    const alternatives = alternativesText.split(/[,，]/).map(a => a.trim()).filter(a => a.length > 0);

    return {
      category,
      confidence,
      reasoning,
      alternatives: alternatives.map(alt => ({
        category: alt,
        confidence: confidence * 0.8, // 备选分类置信度稍低
      })),
    };
  }

  async analyzeSentiment(content: string): Promise<SentimentResult> {
    return this.analyzeSentimentTask(content);
  }

  private async analyzeSentimentTask(content: string): Promise<SentimentResult> {
    const prompt = `请分析以下内容的情感倾向：

内容：
${content}

请按照以下格式回答：
情感倾向：[positive/negative/neutral]
置信度：[0-1之间的数值]
情感评分：[-1到1之间的数值，-1最负面，1最正面]
分析理由：[简要说明]`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的情感分析专家，能够准确识别文本中的情感倾向和强度。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 120,
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '';

    // 解析响应
    const sentimentMatch = response.match(/情感倾向[：:]\s*(.+)/);
    const confidenceMatch = response.match(/置信度[：:]\s*([\d.]+)/);
    const scoreMatch = response.match(/情感评分[：:]\s*([-\d.]+)/);
    const reasoningMatch = response.match(/分析理由[：:]\s*(.+)/);

    const sentimentText = sentimentMatch?.[1]?.trim().toLowerCase() || 'neutral';
    const confidence = parseFloat(confidenceMatch?.[1] || '0.5');
    const score = parseFloat(scoreMatch?.[1] || '0');
    const reasoning = reasoningMatch?.[1]?.trim() || '基于内容分析得出';

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (sentimentText.includes('positive') || sentimentText.includes('正面')) {
      sentiment = 'positive';
    } else if (sentimentText.includes('negative') || sentimentText.includes('负面')) {
      sentiment = 'negative';
    }

    return {
      sentiment,
      confidence,
      score: Math.max(-1, Math.min(1, score)),
      reasoning,
    };
  }

  async extractKeyConcepts(content: string): Promise<KeyConcept[]> {
    return this.extractKeyConceptsTask(content);
  }

  private async extractKeyConceptsTask(content: string): Promise<KeyConcept[]> {
    const prompt = `请从以下内容中提取3-5个关键概念：

内容：
${content}

请按照以下格式回答，每个概念一行：
概念名称 [重要性评分] [简要描述] [相关概念1, 相关概念2]

例如：
机器学习 [0.9] [人工智能的一个重要分支] [人工智能, 深度学习, 数据科学]`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的概念分析师，能够识别文本中的核心概念及其关系。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '';
    const lines = response.split('\n').filter(line => line.trim());

    const concepts: KeyConcept[] = [];

    for (const line of lines) {
      // 解析格式：概念 [重要性] [描述] [相关概念]
      const match = line.match(/^(.+?)\s*\[([\d.]+)\]\s*\[(.+?)\]\s*\[(.+?)\]$/);
      if (match) {
        const concept = match[1].trim();
        const importance = parseFloat(match[2]);
        const context = match[3].trim();
        const relatedText = match[4].trim();
        const relatedConcepts = relatedText.split(/[,，]/).map(r => r.trim()).filter(r => r.length > 0);

        concepts.push({
          concept,
          importance,
          context,
          relatedConcepts,
        });
      }
    }

    return concepts.slice(0, 5); // 最多返回5个概念
  }

  async generateTags(content: string): Promise<string[]> {
    return this.generateTagsTask(content);
  }

  private async generateTagsTask(content: string): Promise<string[]> {
    const prompt = `请为以下内容生成3-5个简洁的标签：

内容：
${content}

标签要求：
1. 简洁明了，2-8个字符
2. 能够代表内容特征
3. 便于搜索和分类
4. 按相关性排序

标签（用逗号分隔）：`;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的标签生成器，擅长为内容创建精准、简洁的标签。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 80,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '';
    return response.split(/[,，]/).map(t => t.trim()).filter(t => t.length > 0).slice(0, 5);
  }

  // 辅助方法
  private estimateTokens(text: string): number {
    // 粗略估算：1个token约等于4个字符（英文）或1.5个汉字
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  private estimateOutputTokens(results: AnalysisResult['results']): number {
    let total = 0;

    if (results.summary) total += this.estimateTokens(results.summary);
    if (results.keywords) total += results.keywords.length * 2;
    if (results.classification) total += 20;
    if (results.sentiment) total += 15;
    if (results.keyConcepts) total += results.keyConcepts.length * 10;
    if (results.tags) total += results.tags.length * 2;

    return total;
  }

  private calculateOverallConfidence(results: AnalysisResult['results']): number {
    const confidences: number[] = [];

    if (results.classification) confidences.push(results.classification.confidence);
    if (results.sentiment) confidences.push(results.sentiment.confidence);
    if (results.keyConcepts) {
      const avgConceptImportance = results.keyConcepts.reduce((sum, c) => sum + c.importance, 0) / results.keyConcepts.length;
      confidences.push(avgConceptImportance);
    }

    return confidences.length > 0 ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0.7;
  }
}

// 工厂函数
export function createOpenAIProvider(): OpenAIProvider {
  return new OpenAIProvider();
}
