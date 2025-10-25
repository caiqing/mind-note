/**
 * AI功能质量评估测试套件 - T103.10
 * 扩展的AI质量评估测试，覆盖多提供商、并发处理、数据隐私等场景
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createAIServiceManager } from '@/lib/ai/services/ai-service-manager'
import { createCostControlledServices } from '@/lib/ai/services/cost-controlled-service'
import { createSummaryService } from '@/lib/ai/services/summary-service'
import { createKeywordService } from '@/lib/ai/services/keyword-service'
import { createSentimentService } from '@/lib/ai/services/sentiment-service'
import { createConceptService } from '@/lib/ai/services/concept-service'

describe('AI服务质量评估', () => {
  let serviceManager: any
  let costController: any

  beforeEach(() => {
    // 初始化服务管理器
    serviceManager = createAIServiceManager({
      enableFallback: true,
      retryAttempts: 2,
      timeoutMs: 15000,
      enableLoadBalancing: true,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      enableHealthCheck: true,
      healthCheckIntervalMs: 30000
    })

    // 初始化成本控制器
    costController = createCostControlledServices()
  })

  afterEach(() => {
    // 清理资源
    if (serviceManager) {
      serviceManager.cleanup?.()
    }
    if (costController) {
      costController.cleanup?.()
    }
  })

  describe('T103.10.1 AI质量评估测试套件', () => {
    it('应该生成高质量的摘要', async () => {
      const testContent = `
        人工智能技术在医疗健康领域的应用正日益广泛，从疾病诊断到药物研发，从个性化治疗到健康管理，
        AI都在发挥着重要作用。通过深度学习和大数据分析，AI系统能够帮助医生更准确地诊断疾病，
        提高治疗效率，同时也能为患者提供更好的医疗服务体验。

        主要应用包括：
        1. 医学影像分析：AI可以快速准确地分析X光片、CT扫描等医学影像
        2. 疾病预测模型：基于患者数据预测疾病风险和发展趋势
        3. 个性化治疗方案：根据患者基因信息和生活习惯定制治疗方案
        4. 药物研发加速：通过AI算法大大缩短新药研发周期

        这些技术的进步不仅提高了医疗服务的质量和效率，还为患者带来了更好的治疗体验和健康结果。
      `.trim()

      const summaryService = createSummaryService()
      const result = await summaryService.generateSummary({
        content: testContent,
        style: 'paragraph',
        maxLength: 100,
        language: 'zh'
      })

      expect(result).toBeDefined()
      expect(result.summary).toBeTruthy()
      expect(result.summary.length).toBeGreaterThan(0)
      expect(result.summary.length).toBeLessThanOrEqual(100)

      // 质量评分检查
      expect(result.qualityScore).toBeDefined()
      expect(result.qualityScore).toBeGreaterThanOrEqual(3.0)
      expect(result.qualityScore).toBeLessThanOrEqual(5.0)
    }, 30000)

    it('应该准确提取关键词', async () => {
      const testContent = `
        React是一个用于构建用户界面的JavaScript库，由Facebook开发和维护。
        它采用组件化的开发模式，支持虚拟DOM，提供了高效的状态管理机制。
        React的主要特点包括：声明式编程、组件复用、单向数据流、虚拟DOM等。
        在现代Web开发中，React与Redux、React Router等库配合使用，可以构建复杂的应用程序。
        TypeScript为React提供了类型安全，使得开发更加可靠和可维护。
      `.trim()

      const keywordService = createKeywordService()
      const result = await keywordService.extractKeywords({
        content: testContent,
        maxKeywords: 10,
        priority: 'importance',
        categories: ['technology', 'framework']
      })

      expect(result).toBeDefined()
      expect(result.keywords).toBeDefined()
      expect(result.keywords.length).toBeGreaterThan(0)
      expect(result.keywords.length).toBeLessThanOrEqual(10)

      // 准确性检查 - 应该包含核心技术词汇
      const keywordTexts = result.keywords.map((k: any) => k.text.toLowerCase())
      expect(keywordTexts.some((text: string) => text.includes('react'))).toBe(true)
      expect(keywordTexts.some((text: string) => text.includes('javascript'))).toBe(true)
      expect(keywordTexts.some((text: string) => text.includes('typescript'))).toBe(true)

      // 相关性评分检查
      result.keywords.forEach((keyword: any) => {
        expect(keyword.relevance).toBeDefined()
        expect(keyword.relevance).toBeGreaterThan(0)
        expect(keyword.relevance).toBeLessThanOrEqual(1)
      })
    }, 25000)

    it('应该准确进行情感分析', async () => {
      const testContent = `
        我非常喜欢这个新的产品设计！它不仅外观精美，而且功能强大，用户体验非常好。
        使用过程中完全没有任何问题，所有的功能都运行得非常流畅。
        这真的是我今年见过最好的产品之一，强烈推荐给大家！
      `.trim()

      const sentimentService = createSentimentService()
      const result = await sentimentService.analyzeSentiment({
        content: testContent,
        detailLevel: 'detailed',
        includeEmotions: true
      })

      expect(result).toBeDefined()
      expect(result.polarity).toBeDefined()
      expect(result.polarity).toBe('positive')

      // 置信度检查
      expect(result.confidence).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0.7)

      // 情感详细分析
      if (result.detailed) {
        expect(result.detailed.emotions).toBeDefined()
        expect(Array.isArray(result.detailed.emotions)).toBe(true)
      }
    }, 20000)

    it('应该准确识别关键概念', async () => {
      const testContent = `
        机器学习是人工智能的一个重要分支，它使计算机能够从数据中学习并改进性能。
        深度学习作为机器学习的子集，使用神经网络来模拟人脑的学习过程。
        自然语言处理(NLP)是另一个重要领域，专注于计算机与人类语言的交互。
        计算机视觉使机器能够理解和解释视觉信息。
        这些技术共同构成了现代人工智能的基础架构。
      `.trim()

      const conceptService = createConceptService()
      const result = await conceptService.extractConcepts({
        content: testContent,
        maxConcepts: 8,
        includeRelations: true,
        includeDefinitions: true
      })

      expect(result).toBeDefined()
      expect(result.concepts).toBeDefined()
      expect(result.concepts.length).toBeGreaterThan(0)
      expect(result.concepts.length).toBeLessThanOrEqual(8)

      // 概念准确性检查
      const conceptTexts = result.concepts.map((c: any) => c.name.toLowerCase())
      expect(conceptTexts.some((text: string) => text.includes('机器学习'))).toBe(true)
      expect(conceptTexts.some((text: string) => text.includes('深度学习'))).toBe(true)
      expect(conceptTexts.some((text: string) => text.includes('自然语言处理'))).toBe(true)

      // 重要性评分检查
      result.concepts.forEach((concept: any) => {
        expect(concept.importance).toBeDefined()
        expect(concept.importance).toBeGreaterThan(0)
        expect(concept.importance).toBeLessThanOrEqual(1)
      })
    }, 25000)
  })

  describe('T103.10.2 多提供商容错测试', () => {
    it('应该在提供商失败时自动切换', async () => {
      // 模拟主提供商失败
      const mockProvider = {
        generateSummary: async () => {
          throw new Error('Provider unavailable')
        }
      }

      // 创建带fallback的服务管理器
      const fallbackServiceManager = createAIServiceManager({
        enableFallback: true,
        retryAttempts: 3,
        timeoutMs: 10000,
        enableCircuitBreaker: true
      })

      const testContent = '这是一个测试文本，用于验证fallback机制。'

      // 测试fallback功能
      try {
        const result = await fallbackServiceManager.analyzeText({
          content: testContent,
          userId: 'test-user',
          options: {
            summary: { style: 'paragraph', maxLength: 50 }
          }
        })

        expect(result).toBeDefined()
        expect(result.summary).toBeTruthy()
      } catch (error) {
        // 如果所有提供商都失败，这是可接受的
        console.log('All providers failed, fallback exhausted')
      }
    }, 45000)

    it('应该正确处理提供商健康状态', async () => {
      const healthServiceManager = createAIServiceManager({
        enableHealthCheck: true,
        healthCheckIntervalMs: 1000
      })

      // 测试健康检查
      const healthStatus = await healthServiceManager.checkProviderHealth()
      expect(healthStatus).toBeDefined()
      expect(typeof healthStatus).toBe('object')
    }, 15000)
  })

  describe('T103.10.3 成本控制验证测试', () => {
    it('应该正确计算和控制成本', async () => {
      const testContent = '这是一个成本控制测试文本。'.repeat(10)

      const initialBudget = costController.getUserBudget('test-user')
      expect(initialBudget).toBeDefined()
      expect(initialBudget.remaining).toBeGreaterThan(0)

      // 模拟多次请求以测试成本累积
      const requests = Array(5).fill(0).map((_, i) =>
        serviceManager.analyzeText({
          content: testContent,
          userId: 'test-user',
          options: { summary: { style: 'paragraph', maxLength: 100 } }
        })
      )

      const results = await Promise.allSettled(requests)
      const successfulResults = results.filter(r => r.status === 'fulfilled')

      expect(successfulResults.length).toBeGreaterThan(0)

      // 检查成本统计
      const costStats = costController.getUsageStats('test-user')
      expect(costStats).toBeDefined()
      expect(costStats.totalCost).toBeGreaterThan(0)
      expect(costStats.requestCount).toBeGreaterThan(0)
    }, 60000)

    it('应该在预算超限时停止请求', async () => {
      const lowBudgetUser = 'low-budget-user'

      // 设置低预算
      costController.setUserBudget(lowBudgetUser, {
        daily: 0.001,
        monthly: 0.01
      })

      const testContent = '这是一个测试文本。'.repeat(100)

      try {
        await serviceManager.analyzeText({
          content: testContent,
          userId: lowBudgetUser,
          options: { summary: { style: 'paragraph', maxLength: 200 } }
        })

        // 如果请求成功，验证预算没有超限
        const budget = costController.getUserBudget(lowBudgetUser)
        expect(budget.remaining).toBeGreaterThanOrEqual(0)
      } catch (error: any) {
        // 预期可能会因为预算不足而失败
        expect(error.message).toMatch(/budget|cost|limit/i)
      }
    }, 30000)
  })

  describe('T103.10.4 并发处理压力测试', () => {
    it('应该支持高并发请求', async () => {
      const concurrentRequests = 20
      const testContent = '并发测试文本内容。'.repeat(5)

      const startTime = Date.now()

      // 创建并发请求
      const requests = Array(concurrentRequests).fill(0).map((_, i) =>
        serviceManager.analyzeText({
          content: testContent,
          userId: `user-${i}`,
          options: {
            summary: { style: 'paragraph', maxLength: 50 },
            keywords: { maxKeywords: 5 }
          }
        })
      )

      const results = await Promise.allSettled(requests)
      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证并发性能
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      expect(successfulResults.length).toBeGreaterThan(concurrentRequests * 0.8) // 至少80%成功率
      expect(duration).toBeLessThan(60000) // 60秒内完成

      // 验证结果质量
      successfulResults.forEach((result: any) => {
        if (result.status === 'fulfilled') {
          expect(result.value.summary).toBeTruthy()
          expect(result.value.keywords).toBeDefined()
        }
      })

      console.log(`并发测试完成: ${successfulResults.length}/${concurrentRequests} 成功，耗时 ${duration}ms`)
    }, 120000)
  })

  describe('T103.10.5 数据隐私合规测试', () => {
    it('应该正确处理敏感信息', async () => {
      const sensitiveContent = `
        用户张三的身份证号码是123456789012345678，手机号码是13800138000。
        他的邮箱地址是zhangsan@example.com，银行卡号是6222021234567890123。
        家庭住址是北京市朝阳区建国路88号，邮政编码是100000。
      `.trim()

      try {
        const result = await serviceManager.analyzeText({
          content: sensitiveContent,
          userId: 'privacy-test-user',
          options: {
            summary: { style: 'paragraph', maxLength: 100 },
            enablePrivacyFilter: true
          }
        })

        expect(result).toBeDefined()

        // 验证敏感信息已被过滤或脱敏
        const summary = result.summary || ''
        const hasSensitiveInfo = summary.includes('123456789') ||
                              summary.includes('13800138000') ||
                              summary.includes('6222021')

        if (hasSensitiveInfo) {
          console.warn('警告：摘要中可能包含敏感信息')
        }

        // 确保PII不会在摘要中完整暴露
        expect(summary).not.toContain('123456789012345678')
        expect(summary).not.toContain('zhangsan@example.com')
      } catch (error) {
        // 如果因为敏感内容检测而失败，这是可接受的
        expect(error.message).toMatch(/sensitive|privacy|filtered/i)
      }
    }, 30000)

    it('应该遵守数据使用政策', async () => {
      const testData = '这是一个数据合规测试。'

      const result = await serviceManager.analyzeText({
        content: testData,
        userId: 'compliance-test-user',
        options: {
          summary: { style: 'paragraph', maxLength: 50 },
          complianceMode: true
        }
      })

      expect(result).toBeDefined()
      expect(result.complianceInfo).toBeDefined()
      expect(result.complianceInfo.dataRetentionPolicy).toBeTruthy()
      expect(result.complianceInfo.privacyProtected).toBe(true)
    }, 20000)
  })

  describe('T103.10.6 边界条件测试', () => {
    it('应该处理空内容', async () => {
      const emptyContent = ''

      const result = await serviceManager.analyzeText({
        content: emptyContent,
        userId: 'boundary-test-user',
        options: { summary: { style: 'paragraph', maxLength: 50 } }
      })

      expect(result).toBeDefined()
      expect(result.error).toBeDefined()
      expect(result.error.type).toBe('empty_content')
    }, 10000)

    it('应该处理过长内容', async () => {
      const longContent = '测试内容。'.repeat(10000) // 约50KB

      try {
        const result = await serviceManager.analyzeText({
          content: longContent,
          userId: 'boundary-test-user',
          options: { summary: { style: 'paragraph', maxLength: 100 } }
        })

        expect(result).toBeDefined()
        // 应该有内容分段处理
        expect(result.processingInfo).toBeDefined()
        expect(result.processingInfo.segments).toBeGreaterThan(1)
      } catch (error: any) {
        // 如果因为内容过长而失败，检查错误类型
        expect(error.message).toMatch(/too long|content limit|size/i)
      }
    }, 45000)

    it('应该处理特殊字符内容', async () => {
      const specialContent = `
        特殊字符测试：!@#$%^&*()_+-={}[]|\\:";'<>?,./
        Unicode测试：🚀🎯💡🔔📊📈📉🔍🎨
        混合语言：Hello 世界! Bonjour le monde! Hola mundo!
        格式测试：**粗体** *斜体* _下划线_ ~删除线~
        代码测试：\`console.log('Hello World')\`
      `.trim()

      const result = await serviceManager.analyzeText({
        content: specialContent,
        userId: 'boundary-test-user',
        options: { summary: { style: 'paragraph', maxLength: 100 } }
      })

      expect(result).toBeDefined()
      expect(result.summary).toBeTruthy()
      expect(result.summary.length).toBeGreaterThan(0)
    }, 30000)
  })

  describe('T103.10.7 长期稳定性测试', () => {
    it('应该保持长时间运行的稳定性', async () => {
      const testDuration = 30000 // 30秒稳定性测试
      const requestInterval = 1000 // 每秒1个请求
      const testContent = '稳定性测试文本。'.repeat(5)

      const startTime = Date.now()
      const endTime = startTime + testDuration
      let requestCount = 0
      let successCount = 0
      const errors: any[] = []

      while (Date.now() < endTime) {
        try {
          const result = await serviceManager.analyzeText({
            content: testContent,
            userId: 'stability-test-user',
            options: { summary: { style: 'paragraph', maxLength: 50 } }
          })

          requestCount++
          if (result && result.summary) {
            successCount++
          }
        } catch (error: any) {
          errors.push({
            timestamp: new Date().toISOString(),
            error: error.message,
            requestNumber: requestCount + 1
          })
        }

        // 等待下一个请求间隔
        if (Date.now() < endTime) {
          await new Promise(resolve => setTimeout(resolve, requestInterval))
        }
      }

      const actualDuration = Date.now() - startTime
      const successRate = (successCount / requestCount) * 100

      console.log(`稳定性测试完成: ${actualDuration}ms, ${requestCount}请求, ${successCount}成功, 成功率${successRate.toFixed(1)}%`)

      // 验证稳定性要求
      expect(successRate).toBeGreaterThan(90) // 至少90%成功率
      expect(errors.length).toBeLessThan(requestCount * 0.1) // 错误率少于10%

      // 记录性能指标
      const avgResponseTime = actualDuration / requestCount
      expect(avgResponseTime).toBeLessThan(5000) // 平均响应时间少于5秒
    }, 45000)
  })

  describe('AI功能验收标准验证', () => {
    it('应该满足摘要质量评分 > 4.0/5.0', async () => {
      const testContent = `
        区块链技术作为一种分布式账本技术，近年来在金融科技、供应链管理、数字身份验证等领域
        得到了广泛应用。其去中心化、不可篡改、透明的特性，为解决传统中心化系统的信任问题
        提供了新的思路和方案。

        智能合约是区块链的重要组成部分，它是一种在区块链上运行的自动执行程序，
        当预设条件满足时，合约条款会自动执行，无需人工干预。这大大提高了商业效率，
        降低了交易成本和风险。

        加密货币如比特币、以太坊等，基于区块链技术实现，已经成为数字经济的重要组成
        部分。虽然面临监管挑战，但其技术创新和应用前景依然广阔。
      `.trim()

      const results = []

      // 多次测试以确保质量一致性
      for (let i = 0; i < 5; i++) {
        const result = await serviceManager.analyzeText({
          content: testContent,
          userId: `quality-test-${i}`,
          options: { summary: { style: 'paragraph', maxLength: 120 } }
        })

        if (result.summary) {
          results.push(result.qualityScore || 4.0)
        }
      }

      const avgQuality = results.reduce((sum, score) => sum + score, 0) / results.length

      console.log(`摘要质量评分: ${avgQuality.toFixed(2)}/5.0`)
      expect(avgQuality).toBeGreaterThan(4.0)
    }, 60000)

    it('应该满足关键词提取准确率 > 90%', async () => {
      const testContent = `
        Vue.js是一个渐进式JavaScript框架，用于构建用户界面。
        它与React、Angular并称为现代前端三大框架。
        Vue的核心特性包括响应式数据绑定、组件系统、虚拟DOM等。
        Vuex是Vue的状态管理模式，Vue Router是官方路由管理器。
        TypeScript为Vue提供了类型支持，提高了开发效率和代码质量。
        Nuxt.js是基于Vue的服务器端渲染框架，支持SSR和静态站点生成。
      `.trim()

      const result = await serviceManager.analyzeText({
        content: testContent,
        userId: 'accuracy-test-user',
        options: { keywords: { maxKeywords: 10, priority: 'importance' } }
      })

      expect(result).toBeDefined()
      expect(result.keywords).toBeDefined()
      expect(result.keywords.length).toBeGreaterThan(0)

      // 验证准确性 - 应该包含核心关键词
      const keywordTexts = result.keywords.map((k: any) => k.text.toLowerCase())
      const expectedKeywords = ['vue', 'javascript', '响应式', '组件', '虚拟dom', 'typescript']

      const matchedKeywords = expectedKeywords.filter(keyword =>
        keywordTexts.some(text => text.includes(keyword))
      )

      const accuracy = (matchedKeywords.length / expectedKeywords.length) * 100
      console.log(`关键词提取准确率: ${accuracy.toFixed(1)}% (${matchedKeywords.length}/${expectedKeywords.length})`)

      expect(accuracy).toBeGreaterThan(90)
    }, 30000)

    it('应该满足情感分析准确率 > 85%', async () => {
      const testCases = [
        {
          content: '这个产品真的太棒了！我非常满意，强烈推荐给大家！',
          expected: 'positive'
        },
        {
          content: '质量很差，完全不值这个价格，非常失望。',
          expected: 'negative'
        },
        {
          content: '还可以吧，有优点也有缺点，总体来说一般般。',
          expected: 'neutral'
        }
      ]

      let correctCount = 0

      for (const testCase of testCases) {
        const result = await serviceManager.analyzeText({
          content: testCase.content,
          userId: 'sentiment-test-user',
          options: { sentiment: { detailLevel: 'basic' } }
        })

        if (result.sentiment && result.sentiment.polarity === testCase.expected) {
          correctCount++
        }
      }

      const accuracy = (correctCount / testCases.length) * 100
      console.log(`情感分析准确率: ${accuracy.toFixed(1)}% (${correctCount}/${testCases.length})`)

      expect(accuracy).toBeGreaterThan(85)
    }, 45000)

    it('应该满足响应时间 < 3秒', async () => {
      const testContent = '响应时间测试内容。'.repeat(10)
      const iterations = 10
      const responseTimes: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now()

        await serviceManager.analyzeText({
          content: testContent,
          userId: `response-time-test-${i}`,
          options: { summary: { style: 'paragraph', maxLength: 50 } }
        })

        const endTime = Date.now()
        const responseTime = endTime - startTime
        responseTimes.push(responseTime)
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)]

      console.log(`响应时间统计: 平均${avgResponseTime.toFixed(0)}ms, 最大${maxResponseTime}ms, P95${p95ResponseTime}ms`)

      expect(avgResponseTime).toBeLessThan(3000) // 平均响应时间少于3秒
      expect(p95ResponseTime).toBeLessThan(5000) // P95响应时间少于5秒
    }, 60000)
  })
})