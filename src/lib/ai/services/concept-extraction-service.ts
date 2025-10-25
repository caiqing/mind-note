// AI关键概念提取服务
// 实现智能关键概念和关键词提取功能

import { BaseAIService } from './base-service'
import { Logger } from './logger'
import { AIProvider } from '@/lib/ai/types'
import { aiConfig } from '@/lib/ai/config'
import { openaiProvider } from '@/lib/ai/providers/openai-provider'
import { claudeProvider } from '@/lib/ai/providers/claude-provider'

export interface ConceptExtractionOptions {
  language?: 'zh' | 'en' | 'auto'
  maxConcepts?: number
  minRelevance?: number
  includeCategories?: boolean
  includeRelationships?: boolean
  extractionMethod?: 'ai' | 'nlp' | 'hybrid'
  domainSpecific?: string[] // 领域特定词汇
  excludeCommonWords?: boolean
}

export interface ConceptResult {
  concepts: Concept[]
  keywords: Keyword[]
  entities: Entity[]
  relationships?: ConceptRelationship[]
  summary: {
    totalConcepts: number
    totalKeywords: number
    totalEntities: number
    mainTopics: string[]
    complexity: 'low' | 'medium' | 'high'
  }
  provider: string
  metadata: {
    originalLength: number
    processingTime: number
    estimatedCost: number
    options: ConceptExtractionOptions
  }
}

export interface Concept {
  id: string
  name: string
  category: ConceptCategory
  relevance: number // 0-1
  frequency: number
  context: string[]
  importance: number // 0-1
  definition?: string
  synonyms?: string[]
}

export interface Keyword {
  word: string
  score: number // 0-1
  frequency: number
  type: KeywordType
  context: string[]
  relevance: number // 0-1
}

export interface Entity {
  name: string
  type: EntityType
  confidence: number // 0-1
  mentions: number
  context: string[]
  attributes?: Record<string, any>
}

export interface ConceptRelationship {
  source: string
  target: string
  type: RelationshipType
  strength: number // 0-1
  context: string
}

export type ConceptCategory =
  | 'technology' | 'business' | 'science' | 'education' | 'health'
  | 'finance' | 'politics' | 'entertainment' | 'sports' | 'general'

export type KeywordType =
  | 'technical' | 'business' | 'action' | 'descriptive' | 'temporal'
  | 'spatial' | 'quantitative' | 'qualitative' | 'generic'

export type EntityType =
  | 'person' | 'organization' | 'location' | 'product' | 'event'
  | 'date' | 'number' | 'concept' | 'unknown'

export type RelationshipType =
  | 'is_a' | 'part_of' | 'related_to' | 'causes' | 'enables'
  | 'requires' | 'similar_to' | 'opposite_of' | 'contains' | 'depends_on'

export class ConceptExtractionService extends BaseAIService {
  private logger = Logger.getInstance()

  constructor() {
    super('ConceptExtractionService')
  }

  /**
   * 提取关键概念
   */
  async extractConcepts(
    noteId: string,
    noteContent: string,
    options: ConceptExtractionOptions = {}
  ): Promise<ConceptResult> {
    const startTime = Date.now()
    this.logger.info('开始关键概念提取', { noteId, contentLength: noteContent.length })

    try {
      // 预处理内容
      const processedContent = this.preprocessContent(noteContent)
      if (!processedContent || processedContent.length < 20) {
        throw new Error('内容过短，无法进行概念提取')
      }

      // 检查预算
      const estimatedCost = this.estimateExtractionCost(processedContent, options)
      if (!(await this.checkBudget(estimatedCost))) {
        throw new Error('预算不足，无法进行概念提取')
      }

      // 选择提取方法
      const method = options.extractionMethod || 'hybrid'

      let result: Omit<ConceptResult, 'provider' | 'metadata'>

      if (method === 'ai') {
        result = await this.extractWithAI(processedContent, options)
      } else if (method === 'nlp') {
        result = await this.extractWithNLP(processedContent, options)
      } else {
        // hybrid
        result = await this.extractWithHybrid(processedContent, options)
      }

      const conceptResult: ConceptResult = {
        ...result,
        provider: 'hybrid',
        metadata: {
          originalLength: processedContent.length,
          processingTime: Date.now() - startTime,
          estimatedCost,
          options
        }
      }

      // 记录成功
      this.logger.info('关键概念提取完成', {
        noteId,
        conceptsCount: result.concepts.length,
        keywordsCount: result.keywords.length,
        entitiesCount: result.entities.length,
        processingTime: conceptResult.metadata.processingTime
      })

      // 记录花费
      this.recordSpending(estimatedCost)

      return conceptResult

    } catch (error) {
      this.logger.error('关键概念提取失败', {
        noteId,
        error: error.message,
        processingTime: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * 使用AI进行概念提取
   */
  private async extractWithAI(
    content: string,
    options: ConceptExtractionOptions
  ): Promise<Omit<ConceptResult, 'provider' | 'metadata'>> {
    const provider = this.selectBestProvider(options)
    const prompt = this.buildAIExtractionPrompt(content, options)

    switch (provider.name) {
      case 'openai':
        return await this.extractWithOpenAI(prompt, content, options)
      case 'anthropic':
        return await this.extractWithClaude(prompt, content, options)
      default:
        throw new Error(`不支持的提供商: ${provider.name}`)
    }
  }

  /**
   * 使用NLP方法进行概念提取
   */
  private async extractWithNLP(
    content: string,
    options: ConceptExtractionOptions
  ): Promise<Omit<ConceptResult, 'provider' | 'metadata'>> {
    // 基于规则和统计的NLP方法
    const keywords = this.extractKeywordsWithNLP(content, options)
    const entities = this.extractEntitiesWithNLP(content, options)
    const concepts = this.generateConceptsFromKeywords(content, keywords, options)

    return {
      concepts,
      keywords,
      entities,
      summary: this.generateExtractionSummary(concepts, keywords, entities)
    }
  }

  /**
   * 使用混合方法进行概念提取
   */
  private async extractWithHybrid(
    content: string,
    options: ConceptExtractionOptions
  ): Promise<Omit<ConceptResult, 'provider' | 'metadata'>> {
    // 先用NLP快速提取
    const nlpResult = await this.extractWithNLP(content, options)

    // 再用AI进行增强和验证
    const aiEnhancedResult = await this.enhanceWithAI(nlpResult, content, options)

    return aiEnhancedResult
  }

  /**
   * 构建AI提取提示词
   */
  private buildAIExtractionPrompt(
    content: string,
    options: ConceptExtractionOptions
  ): string {
    const {
      language = 'zh',
      maxConcepts = 10,
      minRelevance = 0.3,
      includeCategories = true,
      includeRelationships = false,
      domainSpecific = []
    } = options

    let prompt = ''

    // 基础指令
    const languageMap = {
      zh: '中文',
      en: 'English',
      auto: '中文（如果原文是中文）'
    }

    prompt += `请从以下文本中提取关键概念和关键词，使用${languageMap[language]}进行分析。\n\n`
    prompt += `文本内容：${content}\n\n`

    // 提取要求
    prompt += `提取要求：\n`
    prompt += `1. 提取最多${maxConcepts}个关键概念\n`
    prompt += `2. 相关性阈值：${minRelevance}以上\n`
    prompt += `3. 按重要性排序\n`

    if (includeCategories) {
      prompt += `4. 为每个概念分类（technology, business, science, education, health, finance, politics, entertainment, sports, general）\n`
    }

    if (includeRelationships) {
      prompt += `5. 识别概念之间的关系\n`
    }

    if (domainSpecific.length > 0) {
      prompt += `6. 重点关注领域特定词汇：${domainSpecific.join('、')}\n`
    }

    // 输出格式要求
    prompt += `\n请严格按照以下JSON格式输出：
{
  "concepts": [
    {
      "id": "concept_1",
      "name": "概念名称",
      "category": "technology",
      "relevance": 0.85,
      "frequency": 3,
      "context": ["上下文1", "上下文2"],
      "importance": 0.9,
      "definition": "概念定义",
      "synonyms": ["同义词1", "同义词2"]
    }
  ],
  "keywords": [
    {
      "word": "关键词",
      "score": 0.8,
      "frequency": 2,
      "type": "technical",
      "context": ["上下文"],
      "relevance": 0.75
    }
  ],
  "entities": [
    {
      "name": "实体名称",
      "type": "person",
      "confidence": 0.9,
      "mentions": 2,
      "context": ["上下文"],
      "attributes": {}
    }
  ],
  ${includeRelationships ? '"relationships": [{"source": "概念A", "target": "概念B", "type": "related_to", "strength": 0.7, "context": "关系上下文"}],' : ''}
  "mainTopics": ["主要主题1", "主要主题2"],
  "complexity": "medium"
}`

    return prompt
  }

  /**
   * 使用OpenAI进行概念提取
   */
  private async extractWithOpenAI(
    prompt: string,
    originalContent: string,
    options: ConceptExtractionOptions
  ): Promise<Omit<ConceptResult, 'provider' | 'metadata'>> {
    try {
      const response = await openaiProvider.generateText({
        prompt,
        model: 'gpt-3.5-turbo',
        maxTokens: 1500,
        temperature: 0.3
      })

      const result = this.parseExtractionResponse(response.text)
      return result

    } catch (error) {
      this.logger.error('OpenAI概念提取失败', { error: error.message })
      throw new Error(`OpenAI概念提取失败: ${error.message}`)
    }
  }

  /**
   * 使用Claude进行概念提取
   */
  private async extractWithClaude(
    prompt: string,
    originalContent: string,
    options: ConceptExtractionOptions
  ): Promise<Omit<ConceptResult, 'provider' | 'metadata'>> {
    try {
      const response = await claudeProvider.generateText({
        prompt,
        model: 'claude-3-haiku-20240307',
        maxTokens: 1500,
        temperature: 0.3
      })

      const result = this.parseExtractionResponse(response.text)
      return result

    } catch (error) {
      this.logger.error('Claude概念提取失败', { error: error.message })
      throw new Error(`Claude概念提取失败: ${error.message}`)
    }
  }

  /**
   * 使用NLP提取关键词
   */
  private extractKeywordsWithNLP(
    content: string,
    options: ConceptExtractionOptions
  ): Keyword[] {
    // 简化的NLP关键词提取
    const words = content.toLowerCase().split(/\s+/)
    const wordFreq: Record<string, number> = {}

    // 计算词频
    words.forEach(word => {
      if (word.length > 2 && !this.isStopWord(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1
      }
    })

    // 按频率排序
    const sortedWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, options.maxConcepts || 15)

    return sortedWords.map(([word, frequency]) => ({
      word,
      score: Math.min(1, frequency / 5),
      frequency,
      type: this.classifyKeywordType(word),
      context: this.findWordContext(content, word),
      relevance: Math.min(1, frequency / 3)
    }))
  }

  /**
   * 使用NLP提取实体
   */
  private extractEntitiesWithNLP(
    content: string,
    options: ConceptExtractionOptions
  ): Entity[] {
    // 简化的实体识别
    const entities: Entity[] = []

    // 识别数字
    const numbers = content.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) || []
    numbers.forEach(num => {
      entities.push({
        name: num,
        type: 'number',
        confidence: 0.9,
        mentions: this.countWordOccurrences(content, num),
        context: this.findWordContext(content, num)
      })
    })

    // 识别日期
    const dates = content.match(/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/g) || []
    dates.forEach(date => {
      entities.push({
        name: date,
        type: 'date',
        confidence: 0.85,
        mentions: 1,
        context: this.findWordContext(content, date)
      })
    })

    return entities
  }

  /**
   * 从关键词生成概念
   */
  private generateConceptsFromKeywords(
    content: string,
    keywords: Keyword[],
    options: ConceptExtractionOptions
  ): Concept[] {
    return keywords
      .filter(kw => kw.relevance >= (options.minRelevance || 0.3))
      .slice(0, options.maxConcepts || 10)
      .map((kw, index) => ({
        id: `concept_${index + 1}`,
        name: kw.word,
        category: this.classifyConceptCategory(kw.word),
        relevance: kw.relevance,
        frequency: kw.frequency,
        context: kw.context,
        importance: kw.score,
        synonyms: this.findSynonyms(kw.word, keywords)
      }))
  }

  /**
   * AI增强NLP结果
   */
  private async enhanceWithAI(
    nlpResult: Omit<ConceptResult, 'provider' | 'metadata' | 'summary'> & { summary: any },
    content: string,
    options: ConceptExtractionOptions
  ): Promise<Omit<ConceptResult, 'provider' | 'metadata'>> {
    // 使用AI验证和增强NLP结果
    const enhancementPrompt = `
请验证和增强以下从文本中提取的概念和关键词：

原始文本：${content.substring(0, 500)}...

NLP提取结果：
- 概念数量：${nlpResult.concepts.length}
- 关键词数量：${nlpResult.keywords.length}
- 实体数量：${nlpResult.entities.length}

请提供以下增强：
1. 验证概念分类的准确性
2. 补充缺失的重要概念
3. 重新计算相关性和重要性
4. 添加概念定义和同义词

请保持JSON格式输出，结构同原格式。
`

    try {
      const response = await openaiProvider.generateText({
        prompt: enhancementPrompt,
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.2
      })

      // 尝试解析AI增强结果
      try {
        const enhancedResult = this.parseExtractionResponse(response.text)
        return enhancedResult
      } catch (error) {
        // 如果AI增强失败，返回原始NLP结果
        return {
          concepts: nlpResult.concepts,
          keywords: nlpResult.keywords,
          entities: nlpResult.entities,
          summary: nlpResult.summary
        }
      }

    } catch (error) {
      this.logger.warn('AI增强失败，使用原始NLP结果', { error: error.message })
      return {
        concepts: nlpResult.concepts,
        keywords: nlpResult.keywords,
        entities: nlpResult.entities,
        summary: nlpResult.summary
      }
    }
  }

  /**
   * 解析提取响应
   */
  private parseExtractionResponse(response: string): Omit<ConceptResult, 'provider' | 'metadata'> {
    try {
      const cleanResponse = response.trim()
      if (cleanResponse.startsWith('{')) {
        const parsed = JSON.parse(cleanResponse)

        const concepts = parsed.concepts || []
        const keywords = parsed.keywords || []
        const entities = parsed.entities || []
        const relationships = parsed.relationships || []

        return {
          concepts,
          keywords,
          entities,
          relationships,
          summary: {
            totalConcepts: concepts.length,
            totalKeywords: keywords.length,
            totalEntities: entities.length,
            mainTopics: parsed.mainTopics || [],
            complexity: parsed.complexity || 'medium'
          }
        }
      }
    } catch (error) {
      this.logger.warn('JSON解析失败，使用备用方法', { response: response.substring(0, 100) })
    }

    // 备用方案：返回空结果
    return {
      concepts: [],
      keywords: [],
      entities: [],
      summary: {
        totalConcepts: 0,
        totalKeywords: 0,
        totalEntities: 0,
        mainTopics: [],
        complexity: 'low'
      }
    }
  }

  /**
   * 生成提取摘要
   */
  private generateExtractionSummary(
    concepts: Concept[],
    keywords: Keyword[],
    entities: Entity[]
  ): ConceptResult['summary'] {
    const mainTopics = concepts
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5)
      .map(c => c.name)

    const avgImportance = concepts.length > 0
      ? concepts.reduce((sum, c) => sum + c.importance, 0) / concepts.length
      : 0

    const complexity = avgImportance > 0.7 ? 'high' :
                       avgImportance > 0.4 ? 'medium' : 'low'

    return {
      totalConcepts: concepts.length,
      totalKeywords: keywords.length,
      totalEntities: entities.length,
      mainTopics,
      complexity
    }
  }

  /**
   * 辅助方法
   */
  private preprocessContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
  }

  private selectBestProvider(options: ConceptExtractionOptions): AIProvider {
    return aiConfig.providers.openai
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '个', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']
    return stopWords.includes(word.toLowerCase())
  }

  private classifyKeywordType(word: string): KeywordType {
    // 简化的关键词类型分类
    if (/\d/.test(word)) return 'quantitative'
    if (word.length <= 3) return 'generic'
    if (['做', '实现', '开发', '分析', '设计'].includes(word)) return 'action'
    if (['快', '好', '大', '小', '新', '旧'].includes(word)) return 'descriptive'
    return 'technical'
  }

  private classifyConceptCategory(word: string): ConceptCategory {
    // 简化的概念分类
    const techWords = ['AI', '人工智能', '机器学习', '深度学习', '算法', '代码', '开发', '技术']
    const businessWords = ['商业', '市场', '销售', '营销', '客户', '产品', '服务', '管理']

    const lowerWord = word.toLowerCase()
    if (techWords.some(tech => lowerWord.includes(tech.toLowerCase()))) return 'technology'
    if (businessWords.some(bus => lowerWord.includes(bus.toLowerCase()))) return 'business'

    return 'general'
  }

  private findWordContext(content: string, word: string, contextLength: number = 50): string[] {
    const contexts: string[] = []

    // 使用安全的字符串方法而不是正则表达式
    let currentIndex = content.indexOf(word)
    let foundCount = 0

    while (currentIndex !== -1 && foundCount < 3) {
      const start = Math.max(0, currentIndex - contextLength)
      const end = Math.min(content.length, currentIndex + word.length + contextLength)
      contexts.push(content.substring(start, end).trim())

      currentIndex = content.indexOf(word, currentIndex + 1)
      foundCount++
    }

    return contexts
  }

  private countWordOccurrences(content: string, word: string): number {
    let count = 0
    let index = content.indexOf(word)

    while (index !== -1) {
      count++
      index = content.indexOf(word, index + 1)
    }

    return count
  }

  private findSynonyms(word: string, keywords: Keyword[]): string[] {
    // 简化的同义词查找
    return keywords
      .filter(kw => kw.word !== word && kw.word.length > 3)
      .filter(kw => this.calculateWordSimilarity(word, kw.word) > 0.7)
      .slice(0, 3)
      .map(kw => kw.word)
  }

  private calculateWordSimilarity(word1: string, word2: string): number {
    // 简单的词汇相似度计算
    const set1 = new Set(word1.toLowerCase())
    const set2 = new Set(word2.toLowerCase())
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    return intersection.size / union.size
  }

  private estimateExtractionCost(content: string, options: ConceptExtractionOptions): number {
    let baseCost = content.length * 0.000001

    if (options.includeRelationships) baseCost *= 1.5
    if (options.includeCategories) baseCost *= 1.2
    if (options.extractionMethod === 'ai') baseCost *= 2.0

    return baseCost
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 导出单例实例
export const conceptExtractionService = new ConceptExtractionService()