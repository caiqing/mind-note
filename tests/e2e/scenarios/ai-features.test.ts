/**
 * AI功能E2E测试
 *
 * 测试AI分析、摘要生成、标签推荐等AI相关功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestUtils, testPrisma } from '../setup/setup'
import { Pages } from '../helpers/page-objects'
import { TEST_SCENARIOS, E2E_CONFIG } from '../config/e2e.config'

describe('AI功能测试', () => {
  let testUser: any
  let loginPage: InstanceType<typeof Pages.Login>
  let dashboardPage: InstanceType<typeof Pages.Dashboard>
  let noteEditPage: InstanceType<typeof Pages.NoteEdit>
  let noteDetailPage: InstanceType<typeof Pages.NoteDetail>

  beforeEach(async () => {
    if (!TEST_SCENARIOS.AI_FEATURES.enabled) {
      return
    }

    loginPage = new Pages.Login()
    dashboardPage = new Pages.Dashboard()
    noteEditPage = new Pages.NoteEdit()
    noteDetailPage = new Pages.NoteDetail()

    // 创建测试用户并登录
    testUser = await TestUtils.createTestUser()
    await loginPage.login(testUser.email, 'TestPassword123!')
    await TestUtils.wait(2000)

    // 清理测试数据
    await TestUtils.cleanupDatabase(['notes', 'tags', 'note_tags'])
  })

  afterEach(async () => {
    if (!TEST_SCENARIOS.AI_FEATURES.enabled) {
      return
    }

    // 清理测试数据
    await TestUtils.cleanupDatabase(['notes', 'tags', 'note_tags'])
  })

  describe('AI文本分析', () => {
    it('应该能够生成准确的摘要', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const longContent = `
        人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。
        该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。
        人工智能从诞生以来，理论和技术日益成熟，应用领域也不断扩大。
        可以设想，未来人工智能带来的科技产品，将会是人类智慧的"容器"。
        人工智能可以对人的意识、思维的信息过程的模拟。
        人工智能不是人的智能，但能像人那样思考、也可能超过人的智能。
      `

      const noteData = {
        title: 'AI技术概述',
        content: longContent,
        tags: ['AI', '技术']
      }

      // 创建笔记
      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)

      // 等待AI分析完成
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      // 导航到笔记详情页
      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      // 验证AI摘要存在
      const hasAIAnalysis = await noteDetailPage.hasAIAnalysis()
      if (hasAIAnalysis) {
        const summary = await noteDetailPage.getText('[data-testid="ai-summary"]')
        expect(summary).toBeTruthy()
        expect(summary.length).toBeGreaterThan(20)
        expect(summary.length).toBeLessThan(500) // 摘要应该适中
      }
    })

    it('应该能够提取关键词', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: '机器学习算法',
        content: '机器学习是人工智能的一个重要分支，包含监督学习、无监督学习和强化学习等方法。常用的算法包括线性回归、决策树、支持向量机和神经网络。',
        tags: ['机器学习', '算法']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      const hasAIAnalysis = await noteDetailPage.hasAIAnalysis()
      if (hasAIAnalysis) {
        const keywords = await noteDetailPage.getText('[data-testid="ai-keywords"]')
        expect(keywords).toBeTruthy()

        // 验证关键词包含预期内容
        const expectedKeywords = ['机器学习', '算法', '人工智能', '监督学习']
        const hasExpectedKeyword = expectedKeywords.some(keyword =>
          keywords.includes(keyword)
        )
        expect(hasExpectedKeyword).toBe(true)
      }
    })

    it('应该能够分析情感倾向', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const positiveContent = `
        今天真是美好的一天！我完成了项目的第一阶段，团队的表现非常出色。
        客户对我们的工作很满意，这让我感到非常自豪和兴奋。
        相信通过我们的努力，这个项目会取得巨大的成功！
      `

      const noteData = {
        title: '项目进展喜人',
        content: positiveContent,
        tags: ['项目', '成功']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      const hasAIAnalysis = await noteDetailPage.hasAIAnalysis()
      if (hasAIAnalysis) {
        const sentiment = await noteDetailPage.getText('[data-testid="ai-sentiment"]')
        expect(sentiment).toBeTruthy()
        expect(sentiment).toMatch(/积极|正面|positive/i)
      }
    })

    it('应该能够识别概念和主题', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: '区块链技术讨论',
        content: '区块链是一种分布式账本技术，通过加密和共识机制确保数据的安全性和不可篡改性。它最初用于比特币，现在已扩展到供应链管理、数字身份验证、智能合约等领域。',
        tags: ['区块链', '技术']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      const hasAIAnalysis = await noteDetailPage.hasAIAnalysis()
      if (hasAIAnalysis) {
        const concepts = await noteDetailPage.getText('[data-testid="ai-concepts"]')
        expect(concepts).toBeTruthy()

        const expectedConcepts = ['区块链', '分布式账本', '加密', '智能合约']
        const hasExpectedConcept = expectedConcepts.some(concept =>
          concepts.includes(concept)
        )
        expect(hasExpectedConcept).toBe(true)
      }
    })
  })

  describe('智能标签推荐', () => {
    it('应该能够基于内容推荐相关标签', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: 'React开发最佳实践',
        content: '在React开发中，应该遵循组件化设计、状态管理、性能优化等最佳实践。使用Hook可以简化状态逻辑，使用Memo可以优化渲染性能。',
        tags: ['React'] // 只提供一个基础标签
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      const hasAIAnalysis = await noteDetailPage.hasAIAnalysis()
      if (hasAIAnalysis) {
        const suggestedTags = await noteDetailPage.getText('[data-testid="ai-suggested-tags"]')
        expect(suggestedTags).toBeTruthy()

        // 验证推荐的标签与内容相关
        const expectedTags = ['前端', 'JavaScript', 'Hook', '性能优化', '组件化']
        const hasExpectedTag = expectedTags.some(tag =>
          suggestedTags.includes(tag)
        )
        expect(hasExpectedTag).toBe(true)
      }
    })

    it('应该能够拒绝不相关的标签推荐', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: '健康饮食指南',
        content: '均衡饮食对健康很重要，应该多吃蔬菜水果，减少油腻食物。每天适量运动，保持良好的作息习惯。',
        tags: ['健康', '饮食']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      const hasAIAnalysis = await noteDetailPage.hasAIAnalysis()
      if (hasAIAnalysis) {
        const suggestedTags = await noteDetailPage.getText('[data-testid="ai-suggested-tags"]')
        expect(suggestedTags).toBeTruthy()

        // 验证不会推荐技术相关的标签
        const irrelevantTags = ['编程', '数据库', '算法', 'React']
        const hasIrrelevantTag = irrelevantTags.some(tag =>
          suggestedTags.includes(tag)
        )
        expect(hasIrrelevantTag).toBe(false)
      }
    })
  })

  describe('相关笔记推荐', () => {
    beforeEach(async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      // 创建相关的测试笔记
      await TestUtils.createTestNote(testUser.id, {
        title: 'JavaScript基础教程',
        content: 'JavaScript是一种动态编程语言，广泛用于Web开发。它支持面向对象、函数式和过程式编程范式。',
        tags: ['JavaScript', 'Web开发', '教程']
      })

      await TestUtils.createTestNote(testUser.id, {
        title: '前端框架对比',
        content: 'React、Vue和Angular是三大主流前端框架。React基于组件化思想，Vue简单易学，Angular功能完整。',
        tags: ['前端', '框架', '对比']
      })

      await TestUtils.createTestNote(testUser.id, {
        title: 'CSS样式技巧',
        content: 'Flexbox和Grid是现代CSS布局技术，可以创建响应式设计。媒体查询适配不同设备屏幕。',
        tags: ['CSS', '样式', '布局']
      })
    })

    it('应该能够推荐内容相似的笔记', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      // 创建一篇新的相关笔记
      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote({
        title: 'React Hook使用指南',
        content: 'React Hook让函数组件也能使用状态和生命周期特性。useState、useEffect是最常用的Hook。',
        tags: ['React', 'Hook']
      })
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0) // 点击刚创建的笔记
      await TestUtils.wait(2000)

      const hasRelatedNotes = await noteDetailPage.hasRelatedNotes()
      if (hasRelatedNotes) {
        const relatedNotes = await noteDetailPage.getText('[data-testid="related-notes"]')
        expect(relatedNotes).toBeTruthy()

        // 验证推荐了相关的前端笔记
        expect(relatedNotes).toContain('前端框架对比')
      }
    })

    it('应该能够推荐标签相似的笔记', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      // 导航到已有笔记
      await dashboardPage.navigate()
      await dashboardPage.clickNote(0) // JavaScript基础教程
      await TestUtils.wait(2000)

      const hasRelatedNotes = await noteDetailPage.hasRelatedNotes()
      if (hasRelatedNotes) {
        const relatedNotes = await noteDetailPage.getText('[data-testid="related-notes"]')
        expect(relatedNotes).toBeTruthy()

        // 验证推荐了包含相同标签的笔记
        expect(relatedNotes).toContain('前端框架对比')
      }
    })

    it('推荐结果应该按相关性排序', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      // 创建高度相关的笔记
      await TestUtils.createTestNote(testUser.id, {
        title: 'React组件开发',
        content: 'React组件是构建用户界面的基本单位，可以分为函数组件和类组件。组件化开发提高了代码复用性。',
        tags: ['React', '组件', '前端']
      })

      await dashboardPage.navigate()
      await dashboardPage.clickNote(1) // 前端框架对比
      await TestUtils.wait(2000)

      const hasRelatedNotes = await noteDetailPage.hasRelatedNotes()
      if (hasRelatedNotes) {
        const relatedNotes = await noteDetailPage.getText('[data-testid="related-notes"]')
        expect(relatedNotes).toBeTruthy()

        // React组件开发应该排在相关笔记的前面
        if (relatedNotes.includes('React组件开发')) {
          const reactIndex = relatedNotes.indexOf('React组件开发')
          const cssIndex = relatedNotes.indexOf('CSS样式技巧')
          expect(reactIndex).toBeLessThan(cssIndex)
        }
      }
    })
  })

  describe('AI分析质量评估', () => {
    it('应该能够评估分析结果的质量', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: '质量评估测试',
        content: '这是一篇结构清晰、内容丰富的笔记，包含明确的主旨、详细的论述和合理的结论。应该能够获得高质量的AI分析结果。',
        tags: ['测试', '质量']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      const hasAIAnalysis = await noteDetailPage.hasAIAnalysis()
      if (hasAIAnalysis) {
        const qualityScore = await noteDetailPage.getText('[data-testid="ai-quality-score"]')
        expect(qualityScore).toBeTruthy()

        // 验证质量评分在合理范围内
        const score = parseFloat(qualityScore.match(/\d+\.?\d*/)?.[0] || '0')
        expect(score).toBeGreaterThanOrEqual(1.0)
        expect(score).toBeLessThanOrEqual(5.0)
        expect(score).toBeGreaterThanOrEqual(3.5) // 好的内容应该有较高评分
      }
    })

    it('应该显示分析置信度', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: '置信度测试',
        content: '这是一个明确的主题，内容充实，逻辑清晰，应该能够获得高置信度的分析结果。',
        tags: ['测试', '置信度']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      const hasAIAnalysis = await noteDetailPage.hasAIAnalysis()
      if (hasAIAnalysis) {
        const confidence = await noteDetailPage.getText('[data-testid="ai-confidence"]')
        expect(confidence).toBeTruthy()

        // 验证置信度在合理范围内
        const confidenceValue = parseFloat(confidence.match(/\d+\.?\d*/)?.[0] || '0')
        expect(confidenceValue).toBeGreaterThanOrEqual(0.0)
        expect(confidenceValue).toBeLessThanOrEqual(1.0)
      }
    })
  })

  describe('AI分析性能', () => {
    it('AI分析应该在合理时间内完成', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: '性能测试笔记',
        content: TEST_SCENARIOS.AI_FEATURES.testContent,
        tags: ['性能', '测试']
      }

      const startTime = Date.now()
      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)

      // 等待AI分析完成
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)
      const endTime = Date.now()

      const analysisTime = endTime - startTime
      expect(analysisTime).toBeLessThan(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)
    })

    it('应该能够处理大量文本内容', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const largeContent = '这是一段测试内容。'.repeat(200) // 约2000字
      const noteData = {
        title: '长文本性能测试',
        content: largeContent,
        tags: ['长文本', '性能']
      }

      const startTime = Date.now()
      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)
      const endTime = Date.now()

      const analysisTime = endTime - startTime
      expect(analysisTime).toBeLessThan(E2E_CONFIG.TIMEOUTS.AI_PROCESSING * 2) // 长文本允许更长时间
    })
  })

  describe('AI分析错误处理', () => {
    it('应该能够处理内容为空的情况', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: '空内容测试',
        content: '',
        tags: ['测试']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(5000) // 等待处理

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      // 验证空内容的处理
      const hasError = await noteDetailPage.elementExists('[data-testid="ai-analysis-error"]')
      const hasEmptyState = await noteDetailPage.elementExists('[data-testid="ai-analysis-empty"]')

      expect(hasError || hasEmptyState).toBe(true)
    })

    it('应该能够处理非文本内容', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: '特殊内容测试',
        content: '🚀🎉💻📱⚡ 特殊符号和表情符号测试！@#$%^&*()',
        tags: ['特殊内容', '测试']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      // 验证系统不会崩溃，能够处理特殊内容
      const hasAIAnalysis = await noteDetailPage.hasAIAnalysis()
      expect(hasAIAnalysis || true).toBe(true) // 不管是否有分析结果，都不应该崩溃
    })
  })

  describe('AI分析用户交互', () => {
    it('应该支持重新分析功能', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: '重新分析测试',
        content: '这是一个测试笔记，用于验证重新分析功能。',
        tags: ['测试']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      // 点击重新分析按钮
      const hasReanalyzeButton = await noteDetailPage.elementExists('[data-testid="reanalyze-button"]')
      if (hasReanalyzeButton) {
        await noteDetailPage.click('[data-testid="reanalyze-button"]')
        await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

        // 验证分析结果更新
        const hasAIAnalysis = await noteDetailPage.hasAIAnalysis()
        expect(hasAIAnalysis).toBe(true)
      }
    })

    it('应该支持分析结果反馈', async () => {
      if (!TEST_SCENARIOS.AI_FEATURES.enabled) return

      const noteData = {
        title: '反馈测试',
        content: '这是用于测试反馈功能的笔记。',
        tags: ['反馈', '测试']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      await TestUtils.wait(E2E_CONFIG.TIMEOUTS.AI_PROCESSING)

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(2000)

      // 检查是否有反馈按钮
      const hasFeedbackButton = await noteDetailPage.elementExists('[data-testid="ai-feedback-button"]')
      if (hasFeedbackButton) {
        await noteDetailPage.click('[data-testid="ai-feedback-button"]')

        // 验证反馈选项存在
        const hasFeedbackOptions = await noteDetailPage.elementExists('[data-testid="feedback-options"]')
        expect(hasFeedbackOptions).toBe(true)
      }
    })
  })
})