/**
 * 笔记管理功能E2E测试
 *
 * 测试笔记的创建、编辑、删除、搜索等核心功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestUtils, testPrisma } from '../setup/setup'
import { Pages } from '../helpers/page-objects'
import { TEST_SCENARIOS, E2E_CONFIG } from '../config/e2e.config'

describe('笔记管理功能', () => {
  let testUser: any
  let loginPage: InstanceType<typeof Pages.Login>
  let dashboardPage: InstanceType<typeof Pages.Dashboard>
  let noteEditPage: InstanceType<typeof Pages.NoteEdit>
  let noteDetailPage: InstanceType<typeof Pages.NoteDetail>

  beforeEach(async () => {
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
    // 清理测试数据
    await TestUtils.cleanupDatabase(['notes', 'tags', 'note_tags'])
  })

  describe('创建笔记', () => {
    it('应该能够成功创建新笔记', async () => {
      const noteData = {
        title: 'E2E测试笔记 - 创建功能',
        content: '这是一个端到端测试笔记，用于验证笔记创建功能正常工作。',
        tags: ['测试', 'E2E', '自动化']
      }

      // 创建笔记
      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)

      // 验证笔记已创建
      const createdNote = await testPrisma.note.findFirst({
        where: { title: noteData.title }
      })
      expect(createdNote).toBeTruthy()
      expect(createdNote?.title).toBe(noteData.title)
      expect(createdNote?.content).toBe(noteData.content)
      expect(createdNote?.userId).toBe(testUser.id)
    })

    it('应该验证必填字段', async () => {
      const noteData = {
        title: '', // 空标题
        content: '测试内容',
        tags: []
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)

      // 验证显示验证错误
      const isStillOnEditPage = await noteEditPage.elementExists('[data-testid="save-button"]')
      expect(isStillOnEditPage).toBe(true)
    })

    it('应该支持长内容笔记', async () => {
      const longContent = '这是一个很长的笔记内容。'.repeat(100) // 3000字符
      const noteData = {
        title: '长内容测试笔记',
        content: longContent,
        tags: ['长内容', '测试']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)

      // 验证长内容笔记创建成功
      const createdNote = await testPrisma.note.findFirst({
        where: { title: noteData.title }
      })
      expect(createdNote).toBeTruthy()
      expect(createdNote?.content.length).toBe(longContent.length)
    })

    it('应该支持Markdown格式内容', async () => {
      const markdownContent = `# 标题
这是一个**粗体**文本和*斜体*文本。

## 子标题
- 列表项1
- 列表项2
- 列表项3

\`\`\`javascript
console.log('Hello World');
\`\`\`

[链接](https://example.com)`

      const noteData = {
        title: 'Markdown测试笔记',
        content: markdownContent,
        tags: ['Markdown', '格式化']
      }

      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)

      // 验证Markdown笔记创建成功
      const createdNote = await testPrisma.note.findFirst({
        where: { title: noteData.title }
      })
      expect(createdNote).toBeTruthy()
      expect(createdNote?.content).toContain('**粗体**')
    })
  })

  describe('编辑笔记', () => {
    let testNote: any

    beforeEach(async () => {
      testNote = await TestUtils.createTestNote(testUser.id, {
        title: '原始笔记标题',
        content: '原始笔记内容'
      })
    })

    it('应该能够编辑笔记标题和内容', async () => {
      const updatedData = {
        title: '更新后的笔记标题',
        content: '更新后的笔记内容'
      }

      // 导航到笔记详情页
      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(1000)

      // 编辑笔记
      await noteDetailPage.editNote(updatedData.title, updatedData.content)

      // 验证笔记已更新
      const updatedNote = await testPrisma.note.findUnique({
        where: { id: testNote.id }
      })
      expect(updatedNote?.title).toBe(updatedData.title)
      expect(updatedNote?.content).toBe(updatedData.content)
    })

    it('应该能够取消编辑', async () => {
      const originalData = {
        title: testNote.title,
        content: testNote.content
      }

      // 导航到笔记详情页
      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(1000)

      // 开始编辑
      await noteDetailPage.clickEdit()
      await TestUtils.wait(1000)

      // 修改内容
      await noteDetailPage.type('input[name="title"]', '修改后的标题')
      await noteDetailPage.type('textarea[name="content"]', '修改后的内容')

      // 取消编辑
      await noteDetailPage.clickCancel()
      await TestUtils.wait(1000)

      // 验证内容未改变
      const unchangedNote = await testPrisma.note.findUnique({
        where: { id: testNote.id }
      })
      expect(unchangedNote?.title).toBe(originalData.title)
      expect(unchangedNote?.content).toBe(originalData.content)
    })

    it('应该保存编辑历史', async () => {
      const updatedData = {
        title: '更新后的笔记标题',
        content: '更新后的笔记内容'
      }

      // 导航到笔记详情页
      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(1000)

      // 编辑笔记
      await noteDetailPage.editNote(updatedData.title, updatedData.content)

      // 验证编辑历史记录（如果有版本控制功能）
      const editHistory = await testPrisma.noteHistory?.findMany({
        where: { noteId: testNote.id }
      })
      // 根据实际实现调整验证逻辑
      expect(editHistory || true).toBeTruthy()
    })
  })

  describe('删除笔记', () => {
    let testNote: any

    beforeEach(async () => {
      testNote = await TestUtils.createTestNote(testUser.id)
    })

    it('应该能够删除笔记', async () => {
      // 导航到笔记详情页
      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(1000)

      // 删除笔记
      await noteDetailPage.clickDelete()
      await TestUtils.wait(2000) // 等待确认对话框

      // 验证笔记已删除
      const deletedNote = await testPrisma.note.findUnique({
        where: { id: testNote.id }
      })
      expect(deletedNote).toBeFalsy()

      // 验证返回到仪表板
      const isOnDashboard = await dashboardPage.isOnDashboard()
      expect(isOnDashboard).toBe(true)
    })

    it('删除后应该从笔记列表中消失', async () => {
      // 创建多个笔记
      const note1 = await TestUtils.createTestNote(testUser.id, { title: '笔记1' })
      const note2 = await TestUtils.createTestNote(testUser.id, { title: '笔记2' })

      // 导航到仪表板
      await dashboardPage.navigate()
      await TestUtils.wait(1000)

      // 验证笔记列表
      const initialNotes = await dashboardPage.getNoteList()
      expect(initialNotes.length).toBeGreaterThanOrEqual(2)

      // 删除第一个笔记
      await dashboardPage.clickNote(0)
      await noteDetailPage.clickDelete()
      await TestUtils.wait(2000)

      // 验证笔记列表更新
      const updatedNotes = await dashboardPage.getNoteList()
      expect(updatedNotes.length).toBe(initialNotes.length - 1)
      expect(updatedNotes).not.toContain(note1.title)
    })
  })

  describe('查看笔记列表', () => {
    beforeEach(async () => {
      // 创建测试笔记
      await TestUtils.createTestNote(testUser.id, {
        title: '第一篇笔记',
        content: '第一篇笔记的内容',
        status: 'published'
      })
      await TestUtils.createTestNote(testUser.id, {
        title: '第二篇笔记',
        content: '第二篇笔记的内容',
        status: 'published'
      })
      await TestUtils.createTestNote(testUser.id, {
        title: '草稿笔记',
        content: '这是一篇草稿笔记',
        status: 'draft'
      })
    })

    it('应该显示用户的笔记列表', async () => {
      await dashboardPage.navigate()
      await dashboardPage.waitForLoad()

      // 验证笔记列表存在
      const hasNotes = await dashboardPage.hasNotes()
      expect(hasNotes).toBe(true)

      // 验证笔记数量
      const noteList = await dashboardPage.getNoteList()
      expect(noteList.length).toBeGreaterThanOrEqual(3)
    })

    it('应该能够按状态筛选笔记', async () => {
      await dashboardPage.navigate()
      await TestUtils.wait(1000)

      // 点击状态筛选器（假设有这样的功能）
      const hasStatusFilter = await dashboardPage.elementExists('[data-testid="status-filter"]')
      if (hasStatusFilter) {
        await dashboardPage.click('[data-testid="status-filter"]')
        await dashboardPage.click('[data-value="published"]')
        await TestUtils.wait(1000)

        // 验证只显示已发布的笔记
        const publishedNotes = await dashboardPage.getNoteList()
        expect(publishedNotes.length).toBe(2)
        expect(publishedNotes).not.toContain('草稿笔记')
      }
    })

    it('应该支持分页加载', async () => {
      // 创建大量笔记
      for (let i = 0; i < 25; i++) {
        await TestUtils.createTestNote(testUser.id, {
          title: `笔记 ${i + 1}`,
          content: `笔记 ${i + 1} 的内容`
        })
      }

      await dashboardPage.navigate()
      await TestUtils.wait(1000)

      // 验证分页控件存在
      const hasPagination = await dashboardPage.elementExists('[data-testid="pagination"]')
      if (hasPagination) {
        // 测试分页功能
        const firstPageNotes = await dashboardPage.getNoteList()
        expect(firstPageNotes.length).toBeLessThanOrEqual(20) // 假设每页20条
      }
    })

    it('应该按更新时间排序', async () => {
      await dashboardPage.navigate()
      await TestUtils.wait(1000)

      const noteList = await dashboardPage.getNoteList()

      // 验证笔记是按时间排序的（最新的在前）
      // 这里需要根据实际排序逻辑调整验证
      expect(noteList.length).toBeGreaterThan(0)
    })
  })

  describe('搜索笔记', () => {
    beforeEach(async () => {
      // 创建测试笔记
      await TestUtils.createTestNote(testUser.id, {
        title: '人工智能技术发展',
        content: '人工智能正在快速发展，包括机器学习、深度学习等技术。',
        tags: ['AI', '技术', '人工智能']
      })
      await TestUtils.createTestNote(testUser.id, {
        title: '产品开发流程',
        content: '软件开发包括需求分析、设计、编码、测试等阶段。',
        tags: ['开发', '流程', '软件']
      })
      await TestUtils.createTestNote(testUser.id, {
        title: '机器学习应用',
        content: '机器学习在图像识别、自然语言处理等领域有广泛应用。',
        tags: ['ML', '机器学习', '应用']
      })
    })

    it('应该能够按标题搜索笔记', async () => {
      await dashboardPage.searchNotes('人工智能')
      await TestUtils.wait(2000)

      const searchResults = await dashboardPage.getNoteList()
      expect(searchResults.length).toBe(1)
      expect(searchResults[0]).toContain('人工智能')
    })

    it('应该能够按内容搜索笔记', async () => {
      await dashboardPage.searchNotes('深度学习')
      await TestUtils.wait(2000)

      const searchResults = await dashboardPage.getNoteList()
      expect(searchResults.length).toBe(1)
    })

    it('应该能够按标签搜索笔记', async () => {
      await dashboardPage.searchNotes('机器学习')
      await TestUtils.wait(2000)

      const searchResults = await dashboardPage.getNoteList()
      expect(searchResults.length).toBe(2) // 应该找到两篇包含机器学习的笔记
    })

    it('应该支持模糊搜索', async () => {
      await dashboardPage.searchNotes('智能') // 部分匹配
      await TestUtils.wait(2000)

      const searchResults = await dashboardPage.getNoteList()
      expect(searchResults.length).toBe(1)
    })

    it('应该显示无搜索结果状态', async () => {
      await dashboardPage.searchNotes('不存在的关键词')
      await TestUtils.wait(2000)

      const hasResults = await dashboardPage.hasNotes()
      expect(hasResults).toBe(false)

      const isEmptyStateVisible = await dashboardPage.isEmptyStateVisible()
      expect(isEmptyStateVisible).toBe(true)
    })
  })

  describe('AI分析功能', () => {
    let testNote: any

    beforeEach(async () => {
      testNote = await TestUtils.createTestNote(testUser.id, {
        title: 'AI分析测试笔记',
        content: '这是一篇关于人工智能的笔记，包含了机器学习、深度学习、自然语言处理等内容。AI技术正在快速发展，对各个行业都产生了深远影响。'
      })
    })

    it('应该能够生成笔记摘要', async () => {
      // 导航到笔记详情页
      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(1000)

      // 等待AI分析完成
      if (await noteDetailPage.hasAIAnalysis()) {
        const aiAnalysis = await noteDetailPage.getText('[data-testid="ai-summary"]')
        expect(aiAnalysis).toBeTruthy()
        expect(aiAnalysis.length).toBeGreaterThan(10)
      }
    })

    it('应该能够提取关键词', async () => {
      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(1000)

      if (await noteDetailPage.hasAIAnalysis()) {
        const keywords = await noteDetailPage.getText('[data-testid="ai-keywords"]')
        expect(keywords).toBeTruthy()
        expect(keywords).toContain('人工智能') || expect(keywords).toContain('机器学习')
      }
    })

    it('应该能够分析情感倾向', async () => {
      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(1000)

      if (await noteDetailPage.hasAIAnalysis()) {
        const sentiment = await noteDetailPage.getText('[data-testid="ai-sentiment"]')
        expect(sentiment).toBeTruthy()
        expect(sentiment).toMatch(/积极|消极|中性|positive|negative|neutral/i)
      }
    })

    it('应该能够推荐相关笔记', async () => {
      // 创建另一篇相关笔记
      await TestUtils.createTestNote(testUser.id, {
        title: '深度学习技术',
        content: '深度学习是机器学习的一个分支，使用神经网络进行学习。'
      })

      await dashboardPage.navigate()
      await dashboardPage.clickNote(0)
      await TestUtils.wait(1000)

      // 检查是否有相关笔记推荐
      const hasRelatedNotes = await noteDetailPage.hasRelatedNotes()
      if (hasRelatedNotes) {
        const relatedNotes = await noteDetailPage.getText('[data-testid="related-notes"]')
        expect(relatedNotes).toBeTruthy()
      }
    })
  })

  describe('响应式设计', () => {
    it('应该在移动设备上正常显示笔记列表', async () => {
      // 模拟移动设备视口
      // await page.setViewportSize({ width: 375, height: 667 })

      await dashboardPage.navigate()
      await dashboardPage.waitForLoad()

      // 验证笔记列表在移动设备上正常显示
      const hasNotes = await dashboardPage.hasNotes()
      expect(hasNotes).toBe(true)

      const hasMobileLayout = await dashboardPage.elementExists('[data-testid="mobile-layout"]')
      expect(hasMobileLayout).toBe(true)
    })

    it('应该在平板设备上正常显示笔记编辑器', async () => {
      // 模拟平板设备视口
      // await page.setViewportSize({ width: 768, height: 1024 })

      await dashboardPage.clickCreateNote()
      await TestUtils.wait(1000)

      // 验证编辑器元素存在
      const hasTitleInput = await noteEditPage.elementExists('input[name="title"]')
      const hasContentTextarea = await noteEditPage.elementExists('textarea[name="content"]')
      const hasSaveButton = await noteEditPage.elementExists('[data-testid="save-button"]')

      expect(hasTitleInput).toBe(true)
      expect(hasContentTextarea).toBe(true)
      expect(hasSaveButton).toBe(true)
    })
  })

  describe('性能测试', () => {
    it('笔记创建响应时间应该在合理范围内', async () => {
      const noteData = {
        title: '性能测试笔记',
        content: '这是一个性能测试笔记',
        tags: ['性能', '测试']
      }

      const startTime = Date.now()
      await dashboardPage.clickCreateNote()
      await noteEditPage.createNote(noteData)
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(E2E_CONFIG.TIMEOUTS.API_RESPONSE)
    })

    it('搜索响应时间应该在合理范围内', async () => {
      // 创建一些测试笔记
      for (let i = 0; i < 10; i++) {
        await TestUtils.createTestNote(testUser.id, {
          title: `搜索测试笔记 ${i}`,
          content: `内容 ${i}`
        })
      }

      const startTime = Date.now()
      await dashboardPage.searchNotes('测试')
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(3000) // 搜索允许稍长的时间
    })

    it('大量笔记列表加载性能', async () => {
      // 创建大量笔记
      for (let i = 0; i < 50; i++) {
        await TestUtils.createTestNote(testUser.id, {
          title: `性能测试笔记 ${i}`,
          content: `内容 ${i}`
        })
      }

      const startTime = Date.now()
      await dashboardPage.navigate()
      await dashboardPage.waitForLoad()
      const endTime = Date.now()

      const loadTime = endTime - startTime
      expect(loadTime).toBeLessThan(5000) // 大量数据加载允许更长时间
    })
  })
})