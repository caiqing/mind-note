/**
 * OpenAI提供商实现 - T103.1 (简化版本)
 * 使用@ai-sdk/openai实现
 */

import { openai } from '@ai-sdk/openai';
import {
  AnalysisProvider,
  AnalysisRequest,
  AnalysisResult,
  ClassificationResult,
  SentimentResult,
  KeyConcept
} from '@/types/ai-analysis';
import { aiConfig } from '../ai-config';

export class OpenAIProviderV2 implements AnalysisProvider {
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

      // 逐个执行分析任务（简化版本）
      if (options.generateSummary) {
        results.summary = await this.generateSummary(request.content);
      }

      if (options.extractKeywords) {
        results.keywords = await this.extractKeywords(request.content);
      }

      if (options.classifyContent) {
        results.classification = await this.classifyContent(request.content);
      }

      if (options.analyzeSentiment) {
        results.sentiment = await this.analyzeSentiment(request.content);
      }

      if (options.extractKeyConcepts) {
        results.keyConcepts = await this.extractKeyConcepts(request.content);
      }

      if (options.generateTags) {
        results.tags = await this.generateTags(request.content);
      }

      const processingTime = Date.now() - startTime;

      // 估算成本和token
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
    const prompt = `请为以下内容生成一个简洁的摘要，不超过100字：

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
    const prompt = `请从以下内容中提取5-8个最重要的关键词：

${content}

关键词要求：
1. 代表核心概念
2. 具有辨识度
3. 去除重复词汇
4. 按重要性排序
5. 每个关键词2-6个字

关键词（用逗号分隔）：`;

    try {
      const { text } = await openai(prompt, {
        model: this.model,
        maxTokens: 100,
        temperature: 0.2,
        systemPrompt: '你是一个专业的文本分析师，擅长识别和提取文本中的关键概念和术语。'
      });

      const response = text?.trim() || '';
      if (!response) {
        console.warn('Empty response from OpenAI for keyword extraction');
        return [];
      }

      return response.split(/[,，]/).map(k => k.trim()).filter(k => k.length > 0);
    } catch (error) {
      console.error('Error extracting keywords:', error);
      return [];
    }
  }

  async classifyContent(content: string): Promise<ClassificationResult> {
    const categories = ['技术', '商业', '教育', '生活', '创意', '个人', '其他'];
    const categoriesText = categories.map((cat, i) => `${i + 1}. ${cat}`).join('\n');

    const prompt = `请对以下内容进行分类：

${content}

可选分类：
${categoriesText}

请按照以下格式回答：
主要分类：[分类名称]
置信度：[0-1之间的数值]
分类理由：[简要说明]
备选分类：[分类1, 分类2]`;

    try {
      const { text } = await openai(prompt, {
        model: this.model,
        maxTokens: 150,
        temperature: 0.1,
        systemPrompt: '你是一个专业的内容分类师，能够准确判断文本的主题类别。'
      });

      const response = text.trim();

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
          confidence: confidence * 0.8,
        })),
      };
    } catch (error) {
      console.error('Error classifying content:', error);
      return {
        category: '其他',
        confidence: 0.5,
        reasoning: '分类分析失败',
        alternatives: [],
      };
    }
  }

  async analyzeSentiment(content: string): Promise<SentimentResult> {
    const prompt = `请分析以下内容的情感倾向：

${content}

请按照以下格式回答：
情感倾向：[positive/negative/neutral]
置信度：[0-1之间的数值]
情感评分：[-1到1之间的数值，-1最负面，1最正面]
分析理由：[简要说明]`;

    try {
      const { text } = await openai(prompt, {
        model: this.model,
        maxTokens: 120,
        temperature: 0.1,
        systemPrompt: '你是一个专业的情感分析专家，能够准确识别文本中的情感倾向和强度。'
      });

      const response = text.trim();

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
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        score: 0,
        reasoning: '情感分析失败',
      };
    }
  }

  async extractKeyConcepts(content: string): Promise<KeyConcept[]> {
    const prompt = `请从以下内容中提取3-5个关键概念：

${content}

请按照以下格式回答，每个概念一行：
概念名称 [重要性评分] [简要描述] [相关概念1, 相关概念2]

例如：
机器学习 [0.9] [人工智能的一个重要分支] [人工智能, 深度学习, 数据科学]`;

    try {
      const { text } = await openai(prompt, {
        model: this.model,
        maxTokens: 200,
        temperature: 0.2,
        systemPrompt: '你是一个专业的概念分析师，能够识别文本中的核心概念及其关系。'
      });

      const response = text.trim();
      const lines = response.split('\n').filter(line => line.trim());
      const concepts: KeyConcept[] = [];

      for (const line of lines) {
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

      return concepts.slice(0, 5);
    } catch (error) {
      console.error('Error extracting concepts:', error);
      return [];
    }
  }

  async generateTags(content: string): Promise<string[]> {
    const prompt = `请为以下内容生成3-5个简洁的标签：

${content}

标签要求：
1. 简洁明了，2-8个字符
2. 能够代表内容特征
3. 便于搜索和分类
4. 按相关性排序

标签（用逗号分隔）：`;

    try {
      const { text } = await openai(prompt, {
        model: this.model,
        maxTokens: 80,
        temperature: 0.3,
        systemPrompt: '你是一个专业的标签生成器，擅长为内容创建精准、简洁的标签。'
      });

      const response = text.trim();
      return response.split(/[,，]/).map(t => t.trim()).filter(t => t.length > 0).slice(0, 5);
    } catch (error) {
      console.error('Error generating tags:', error);
      return [];
    }
  }

  // 辅助方法
  private estimateTokens(text: string): number {
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
    if (results.keyConcepts && results.keyConcepts.length > 0) {
      const avgConceptImportance = results.keyConcepts.reduce((sum, c) => sum + c.importance, 0) / results.keyConcepts.length;
      confidences.push(avgConceptImportance);
    }

    return confidences.length > 0 ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0.7;
  }
}

// 工厂函数
export function createOpenAIProviderV2(): OpenAIProviderV2 {
  return new OpenAIProviderV2();
}