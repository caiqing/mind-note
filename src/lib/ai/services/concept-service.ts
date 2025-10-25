/**
 * 关键概念识别服务 - T103.6
 * 统一的关键概念识别服务，支持多AI提供商和智能算法
 */

import { AnalysisProvider } from '@/types/ai-analysis';
import { createOpenAIProviderV2 } from '../providers/openai-provider-v2';
import { createClaudeProvider } from '../providers/claude-provider';
import { aiConfig } from '../ai-config';

export interface ConceptRequest {
  content: string;
  language?: 'zh' | 'en';
  maxConcepts?: number;
  includeRelations?: boolean;
  includeDefinitions?: boolean;
  includeCategories?: boolean;
  preferredProvider?: string;
  userId: string;
}

export interface ConceptResult {
  concepts: ExtractedConcept[];
  provider: string;
  model: string;
  processingTime: number;
  cost: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  statistics: {
    totalConcepts: number;
    avgRelevance: number;
    avgComplexity: number;
    categories: string[];
    relationsCount: number;
  };
  metadata: {
    requestId: string;
    processedAt: Date;
    version: string;
    algorithm: string;
    language: string;
  };
}

export interface ExtractedConcept {
  concept: string;
  definition?: string;
  category: string;
  relevance: number; // 0-1
  complexity: number; // 0-1, 简单到复杂
  importance: number; // 0-1
  confidence: number; // 0-1
  context: string[];
  synonyms: string[];
  relations: ConceptRelation[];
  examples: string[];
}

export interface ConceptRelation {
  type: 'is_a' | 'part_of' | 'related_to' | 'causes' | 'enables' | 'requires' | 'opposite_of';
  target: string;
  strength: number; // 0-1
  description?: string;
}

export class ConceptService {
  private providers: Map<string, AnalysisProvider> = new Map();
  private fallbackOrder: string[];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // 初始化可用的提供商
    try {
      const openaiProvider = createOpenAIProviderV2();
      this.providers.set('openai', openaiProvider);
      console.log('✅ OpenAI provider initialized for concept extraction');
    } catch (error) {
      console.warn('⚠️ OpenAI provider not available for concept extraction:', error);
    }

    try {
      const claudeProvider = createClaudeProvider();
      this.providers.set('anthropic', claudeProvider);
      console.log('✅ Claude provider initialized for concept extraction');
    } catch (error) {
      console.warn('⚠️ Claude provider not available for concept extraction:', error);
    }

    // 设置fallback顺序
    this.fallbackOrder = aiConfig.getFallbackOrder().filter(provider =>
      this.providers.has(provider)
    );

    if (this.fallbackOrder.length === 0) {
      throw new Error('No AI providers available for concept extraction');
    }

    console.log(`📋 Available providers for concept extraction: ${this.fallbackOrder.join(', ')}`);
  }

  async extractConcepts(request: ConceptRequest): Promise<ConceptResult> {
    const requestId = `concept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`💡 Extracting concepts (Request: ${requestId})`);
    console.log(`Content length: ${request.content.length} characters`);
    console.log(`Max concepts: ${request.maxConcepts || 10}`);

    let lastError: Error | null = null;

    // 尝试按优先级顺序使用提供商
    const providersToTry = request.preferredProvider && this.providers.has(request.preferredProvider)
      ? [request.preferredProvider, ...this.fallbackOrder.filter(p => p !== request.preferredProvider)]
      : this.fallbackOrder;

    for (const providerName of providersToTry) {
      try {
        console.log(`🔄 Trying concept extraction with provider: ${providerName}`);

        const provider = this.providers.get(providerName)!;
        const result = await this.extractConceptsWithProvider(provider, request, requestId);

        console.log(`✅ Concepts extracted successfully with ${providerName}`);
        return result;

      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Provider ${providerName} failed for concept extraction:`, error);

        // 如果不是最后一个提供商，继续尝试下一个
        if (providersToTry.indexOf(providerName) < providersToTry.length - 1) {
          console.log(`🔄 Falling back to next provider...`);
          continue;
        }
      }
    }

    // 所有提供商都失败了
    throw new Error(`All providers failed to extract concepts. Last error: ${lastError?.message}`);
  }

  private async extractConceptsWithProvider(
    provider: AnalysisProvider,
    request: ConceptRequest,
    requestId: string
  ): Promise<ConceptResult> {
    const startTime = Date.now();

    // 构建提示模板
    const prompt = this.buildPrompt(request);

    // 提取关键概念
    const rawConcepts = await provider.extractKeyConcepts(prompt);

    const processingTime = Date.now() - startTime;

    // 后处理和结构化
    const processedConcepts = this.processConcepts(rawConcepts, request);

    // 提取关系（如果需要）
    if (request.includeRelations) {
      await this.extractRelations(provider, processedConcepts, request);
    }

    // 计算统计信息
    const statistics = this.calculateStatistics(processedConcepts);

    // 估算成本
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = this.estimateTokens(JSON.stringify(rawConcepts));
    let cost = 0;
    try {
      cost = aiConfig.calculateCost(provider.name, this.getModelName(provider), inputTokens, outputTokens);
    } catch (error) {
      // 如果成本计算失败，使用默认成本估算
      cost = ((inputTokens + outputTokens) / 1000) * 0.0001; // 默认费率
    }

    return {
      concepts: processedConcepts,
      provider: provider.name,
      model: this.getModelName(provider),
      processingTime,
      cost,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      statistics,
      metadata: {
        requestId,
        processedAt: new Date(),
        version: '1.0.0',
        algorithm: `ai-${provider.name}-concept`,
        language: request.language || 'zh',
      },
    };
  }

  private buildPrompt(request: ConceptRequest): string {
    const {
      content,
      language = 'zh',
      maxConcepts = 10,
      includeRelations = false,
      includeDefinitions = false,
      includeCategories = false,
    } = request;

    let prompt = '';

    if (language === 'zh') {
      prompt = `请从以下文本中提取${maxConcepts}个最重要的关键概念：\n\n"${content}"\n\n`;

      prompt += `概念要求：
1. 代表核心思想和关键概念
2. 具有独立性和完整性
3. 避免过于宽泛或具体的词汇
4. 按重要性排序
5. 每个概念2-8个字\n`;

      if (includeCategories) {
        prompt += `6. 为每个概念指定分类（技术、商业、教育、生活、创意、个人、其他）\n`;
      }

      if (includeDefinitions) {
        prompt += `7. 为每个概念提供简短定义（10-30字）\n`;
      }

      if (includeRelations) {
        prompt += `8. 识别概念之间的关系（is_a、part_of、related_to、causes等）\n`;
      }

      prompt += `\n请返回JSON格式的结果：{
  "concepts": [
    {
      "concept": "概念名称"${includeCategories ? ',\n      "category": "分类"' : ''}${includeDefinitions ? ',\n      "definition": "简短定义"' : ''},
      "relevance": 0到1的相关性评分,
      "complexity": 0到1的复杂度评分,
      "importance": 0到1的重要性评分,
      "context": ["相关上下文"],
      "synonyms": ["同义词或近义词"]${includeRelations ? ',\n      "relations": [{"type": "关系类型", "target": "目标概念", "strength": 0到1}]' : ''}
    }
  ]
}`;
    } else {
      // 英文提示
      prompt = `Please extract ${maxConcepts} key concepts from the following text:\n\n"${content}"\n\n`;

      prompt += `Concept requirements:
1. Represent core ideas and key concepts
2. Be independent and complete
3. Avoid overly broad or specific terms
4. Sort by importance
5. Each concept 2-8 words\n`;

      if (includeCategories) {
        prompt += `6. Specify category for each concept (technology, business, education, lifestyle, creative, personal, other)\n`;
      }

      if (includeDefinitions) {
        prompt += `7. Provide brief definition for each concept (10-30 words)\n`;
      }

      if (includeRelations) {
        prompt += `8. Identify relationships between concepts (is_a, part_of, related_to, causes, etc.)\n`;
      }

      prompt += `\nPlease return results in JSON format:{
  "concepts": [
    {
      "concept": "Concept name"${includeCategories ? ',\n      "category": "Category"' : ''}${includeDefinitions ? ',\n      "definition": "Brief definition"' : ''},
      "relevance": relevance score 0-1,
      "complexity": complexity score 0-1,
      "importance": importance score 0-1,
      "context": ["relevant context"],
      "synonyms": ["synonyms or near synonyms"]${includeRelations ? ',\n      "relations": [{"type": "relation type", "target": "target concept", "strength": 0-1}]' : ''}
    }
  ]
}`;
    }

    return prompt;
  }

  private processConcepts(rawConcepts: any, request: ConceptRequest): ExtractedConcept[] {
    const { maxConcepts = 10 } = request;

    // 解析和验证原始结果
    let concepts: any[] = [];
    if (Array.isArray(rawConcepts)) {
      concepts = rawConcepts;
    } else if (typeof rawConcepts === 'string') {
      try {
        const parsed = JSON.parse(rawConcepts);
        concepts = parsed.concepts || [];
      } catch (e) {
        // 如果解析失败，尝试简单的文本解析
        concepts = this.parseTextConcepts(rawConcepts, request);
      }
    } else if (rawConcepts && rawConcepts.concepts) {
      concepts = rawConcepts.concepts;
    }

    // 标准化和验证概念
    concepts = concepts
      .slice(0, maxConcepts)
      .map(concept => this.normalizeConcept(concept, request))
      .filter(concept => concept.concept.length >= 2 && concept.concept.length <= 20)
      .filter((concept, index, arr) => arr.findIndex(c => c.concept.toLowerCase() === concept.concept.toLowerCase()) === index) // 去重
      .sort((a, b) => b.importance - a.importance);

    return concepts;
  }

  private normalizeConcept(concept: any, request: ConceptRequest): ExtractedConcept {
    return {
      concept: concept.concept || concept.name || '',
      definition: concept.definition,
      category: this.normalizeCategory(concept.category),
      relevance: Math.max(0, Math.min(1, Number(concept.relevance) || 0.5)),
      complexity: Math.max(0, Math.min(1, Number(concept.complexity) || 0.5)),
      importance: Math.max(0, Math.min(1, Number(concept.importance) || 0.5)),
      confidence: this.calculateConfidence(concept, request),
      context: Array.isArray(concept.context) ? concept.context : [],
      synonyms: Array.isArray(concept.synonyms) ? concept.synonyms : [],
      relations: Array.isArray(concept.relations) ? concept.relations.map((r: any) => ({
        type: this.normalizeRelationType(r.type),
        target: r.target,
        strength: Math.max(0, Math.min(1, Number(r.strength) || 0.5)),
        description: r.description,
      })) : [],
      examples: Array.isArray(concept.examples) ? concept.examples : [],
    };
  }

  private normalizeCategory(category: any): string {
    if (!category || typeof category !== 'string') {
      return 'other';
    }

    const normalized = category.toLowerCase().trim();
    const categoryMap: { [key: string]: string } = {
      '技术': 'technology',
      'technology': 'technology',
      '商业': 'business',
      'business': 'business',
      '教育': 'education',
      'education': 'education',
      '生活': 'lifestyle',
      'lifestyle': 'lifestyle',
      '创意': 'creative',
      'creative': 'creative',
      '个人': 'personal',
      'personal': 'personal',
      '其他': 'other',
      'other': 'other',
    };

    return categoryMap[normalized] || 'other';
  }

  private normalizeRelationType(type: any): ConceptRelation['type'] {
    if (!type || typeof type !== 'string') {
      return 'related_to';
    }

    const normalized = type.toLowerCase().trim();
    const relationMap: { [key: string]: ConceptRelation['type'] } = {
      'is_a': 'is_a',
      'is-a': 'is_a',
      'isa': 'is_a',
      'kind_of': 'is_a',
      'type_of': 'is_a',
      'part_of': 'part_of',
      'part-of': 'part_of',
      'related_to': 'related_to',
      'related-to': 'related_to',
      'causes': 'causes',
      'enables': 'enables',
      'requires': 'requires',
      'opposite_of': 'opposite_of',
      'opposite-to': 'opposite_of',
    };

    return relationMap[normalized] || 'related_to';
  }

  private parseTextConcepts(text: string, request: ConceptRequest): any[] {
    // 简单的文本解析逻辑
    const words = text.match(/[\u4e00-\u9fa5]{2,8}|[a-zA-Z\s]{2,20}/g) || [];
    return words.slice(0, request.maxConcepts || 10).map(word => ({
      concept: word.trim(),
      relevance: 0.5,
      complexity: 0.5,
      importance: 0.5,
      context: [],
      synonyms: [],
    }));
  }

  private calculateConfidence(concept: any, request: ConceptRequest): number {
    let confidence = 0.5; // 基础置信度

    // 基于完整性
    if (concept.definition && concept.definition.length > 10) {
      confidence += 0.1;
    }

    // 基于上下文
    if (concept.context && concept.context.length > 0) {
      confidence += 0.1;
    }

    // 基于同义词
    if (concept.synonyms && concept.synonyms.length > 0) {
      confidence += 0.05;
    }

    // 基于分类
    if (concept.category && concept.category !== 'other') {
      confidence += 0.05;
    }

    // 基于关系
    if (concept.relations && concept.relations.length > 0) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  private async extractRelations(
    provider: AnalysisProvider,
    concepts: ExtractedConcept[],
    request: ConceptRequest
  ): Promise<void> {
    if (concepts.length < 2) return;

    const conceptNames = concepts.map(c => c.concept).join(', ');
    const relationPrompt = request.language === 'zh'
      ? `请分析以下概念之间的关系：${conceptNames}\n\n返回JSON格式：
{
  "relations": [
    {
      "source": "源概念",
      "target": "目标概念",
      "type": "关系类型(is_a/part_of/related_to/causes/enables/requires/opposite_of)",
      "strength": 0到1的关系强度,
      "description": "关系描述"
    }
  ]
}`
      : `Please analyze relationships between the following concepts: ${conceptNames}\n\nReturn in JSON format:
{
  "relations": [
    {
      "source": "source concept",
      "target": "target concept",
      "type": "relation type(is_a/part_of/related_to/causes/enables/requires/opposite_of)",
      "strength": relationship strength 0-1,
      "description": "relationship description"
    }
  ]
}`;

    try {
      const result = await provider.extractKeyConcepts(relationPrompt);
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;

      if (parsed.relations && Array.isArray(parsed.relations)) {
        parsed.relations.forEach((relation: any) => {
          const sourceConcept = concepts.find(c => c.concept === relation.source);
          if (sourceConcept) {
            sourceConcept.relations.push({
              type: this.normalizeRelationType(relation.type),
              target: relation.target,
              strength: Math.max(0, Math.min(1, Number(relation.strength) || 0.5)),
              description: relation.description,
            });
          }
        });
      }
    } catch (error) {
      console.warn('Failed to extract concept relations:', error);
    }
  }

  private calculateStatistics(concepts: ExtractedConcept[]): ConceptResult['statistics'] {
    const categories = [...new Set(concepts.map(c => c.category).filter(Boolean))];
    const relationsCount = concepts.reduce((sum, c) => sum + (c.relations?.length || 0), 0);

    return {
      totalConcepts: concepts.length,
      avgRelevance: concepts.length > 0 ? concepts.reduce((sum, c) => sum + c.relevance, 0) / concepts.length : 0,
      avgComplexity: concepts.length > 0 ? concepts.reduce((sum, c) => sum + c.complexity, 0) / concepts.length : 0,
      categories,
      relationsCount,
    };
  }

  private getModelName(provider: AnalysisProvider): string {
    // 尝试从provider获取model名称
    if ('model' in provider && typeof provider.model === 'string') {
      return provider.model;
    }

    // 根据provider名称返回默认模型
    switch (provider.name) {
      case 'openai':
        return 'gpt-3.5-turbo';
      case 'anthropic':
        return 'claude-3-haiku-20240307';
      default:
        return 'default-model';
    }
  }

  private estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  // 批量概念提取
  async extractBatchConcepts(requests: ConceptRequest[]): Promise<ConceptResult[]> {
    console.log(`📦 Processing ${requests.length} concept extraction requests...`);

    const results: ConceptResult[] = [];
    const batchSize = 3; // 控制并发数

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);

      const batchPromises = batch.map(request =>
        this.extractConcepts(request).catch(error => {
          console.error(`❌ Failed to extract concepts for content:`, error);
          return null;
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null) as ConceptResult[]);
    }

    console.log(`✅ Batch processing completed. ${results.length}/${requests.length} extractions completed.`);
    return results;
  }

  // 获取可用的提供商列表
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // 检查服务健康状态
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; providers: string[]; details: any }> {
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      return {
        status: 'unhealthy',
        providers: [],
        details: { error: 'No providers available' }
      };
    }

    if (availableProviders.length === 1) {
      return {
        status: 'degraded',
        providers: availableProviders,
        details: { warning: 'Only one provider available' }
      };
    }

    return {
      status: 'healthy',
      providers: availableProviders,
      details: { fallbackOrder: this.fallbackOrder }
    };
  }

  // 获取服务统计信息
  getStats(): {
    totalProviders: number;
    availableProviders: number;
    fallbackOrder: string[];
    supportedLanguages: string[];
    supportedCategories: string[];
    supportedRelations: string[];
    maxConcepts: number;
  } {
    return {
      totalProviders: this.providers.size,
      availableProviders: this.getAvailableProviders().length,
      fallbackOrder: this.fallbackOrder,
      supportedLanguages: ['zh', 'en'],
      supportedCategories: ['technology', 'business', 'education', 'lifestyle', 'creative', 'personal', 'other'],
      supportedRelations: ['is_a', 'part_of', 'related_to', 'causes', 'enables', 'requires', 'opposite_of'],
      maxConcepts: 20,
    };
  }
}

// 单例实例
export const conceptService = new ConceptService();

// 工厂函数
export function createConceptService(): ConceptService {
  return new ConceptService();
}