/**
 * T020 [P] [US1] E2E test for note creation workflow
 *
 * This test ensures the complete note creation workflow works end-to-end,
 * from user authentication to note creation, editing, and saving.
 */

import { test, expect } from '@playwright/test'

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User',
}

const testNote = {
  title: 'My Test Note',
  content: '# My Test Note\n\nThis is a test note created during E2E testing.\n\n## Features\n\n- Rich text editing\n- Auto-save functionality\n- Markdown support',
}

test.describe('Note Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - in real implementation, this would be actual login
    await page.goto('/auth/signin')

    // Mock the authentication process
    await page.evaluate((user) => {
      localStorage.setItem('next-auth.session-token', 'mock-session-token')
      localStorage.setItem('user-data', JSON.stringify({
        user: {
          id: 'test-user-id',
          email: user.email,
          name: user.name,
        }
      }))
    }, testUser)

    // Navigate to notes page
    await page.goto('/notes')
  })

  test('should create a new note successfully', async ({ page }) => {
    // 1. Navigate to notes list page
    await expect(page).toHaveTitle(/Notes - MindNote/)
    await expect(page.locator('h1')).toContainText('My Notes')

    // 2. Click on "New Note" button
    await page.click('[data-testid="new-note-button"]')

    // 3. Should be redirected to note editor
    await expect(page).toHaveURL(/\/notes\/[a-zA-Z0-9-]+/)
    await expect(page.locator('[data-testid="note-editor"]')).toBeVisible()

    // 4. Fill in note title
    await page.fill('[data-testid="note-title-input"]', testNote.title)

    // 5. Fill in note content using rich text editor
    const editor = page.locator('[data-testid="rich-text-editor"] .ProseMirror')
    await editor.fill(testNote.content)

    // 6. Wait for auto-save indicator
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved')

    // 7. Verify note is saved by refreshing the page
    await page.reload()
    await expect(page.locator('[data-testid="note-title-input"]')).toHaveValue(testNote.title)
    await expect(editor).toContainText(testNote.content)

    // 8. Navigate back to notes list
    await page.click('[data-testid="back-to-notes-button"]')
    await expect(page).toHaveURL('/notes')

    // 9. Verify new note appears in the list
    const noteCard = page.locator(`[data-testid="note-card"]:has-text("${testNote.title}")`)
    await expect(noteCard).toBeVisible()
    await expect(noteCard.locator('[data-testid="note-excerpt"]')).toContainText('This is a test note')
  })

  test('should handle auto-save functionality', async ({ page }) => {
    // 1. Create a new note
    await page.click('[data-testid="new-note-button"]')

    // 2. Start typing content
    const editor = page.locator('[data-testid="rich-text-editor"] .ProseMirror')
    await page.fill('[data-testid="note-title-input"]', 'Auto-save Test')
    await editor.fill('Initial content')

    // 3. Should see "Saving..." indicator
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saving')

    // 4. Wait for auto-save to complete
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved', { timeout: 5000 })

    // 5. Add more content and verify auto-save triggers again
    await editor.fill('Initial content\n\nAdditional content')
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saving')
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved', { timeout: 5000 })

    // 6. Simulate network disconnection and verify offline behavior
    await page.context().setOffline(true)
    await editor.fill('Offline content')
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Offline')

    // 7. Restore connection and verify sync
    await page.context().setOffline(false)
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Syncing')
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved', { timeout: 10000 })
  })

  test('should handle rich text editing features', async ({ page }) => {
    // 1. Create a new note
    await page.click('[data-testid="new-note-button"]')
    await page.fill('[data-testid="note-title-input"]', 'Rich Text Test')

    // 2. Test text formatting buttons
    const editor = page.locator('[data-testid="rich-text-editor"] .ProseMirror')
    await editor.fill('This is bold text')

    // Select text and make it bold
    await editor.selectText('bold')
    await page.click('[data-testid="bold-button"]')

    // Verify formatting is applied
    await expect(editor.locator('strong')).toContainText('bold')

    // 3. Test heading levels
    await editor.press('Enter')
    await editor.type('## Heading 2')
    await editor.press('Enter')
    await editor.type('### Heading 3')

    // Verify headings are created
    await expect(editor.locator('h2')).toContainText('Heading 2')
    await expect(editor.locator('h3')).toContainText('Heading 3')

    // 4. Test list creation
    await editor.press('Enter')
    await editor.type('- First item')
    await editor.press('Enter')
    await editor.type('- Second item')

    // Verify list is created
    await expect(editor.locator('ul li')).toHaveCount(2)

    // 5. Test code block
    await page.click('[data-testid="code-block-button"]')
    await editor.type('console.log("Hello, World!");')

    // Verify code block is created
    await expect(editor.locator('pre code')).toContainText('console.log')

    // 6. Test link creation
    await editor.press('Enter')
    await page.click('[data-testid="link-button"]')
    await page.fill('[data-testid="link-url-input"]', 'https://example.com')
    await page.fill('[data-testid="link-text-input"]', 'Example Link')
    await page.click('[data-testid="link-submit-button"]')

    // Verify link is created
    const link = editor.locator('a[href="https://example.com"]')
    await expect(link).toContainText('Example Link')
  })

  test('should handle note validation and error states', async ({ page }) => {
    // 1. Try to create note with empty title
    await page.click('[data-testid="new-note-button"]')

    // 2. Fill content but leave title empty
    const editor = page.locator('[data-testid="rich-text-editor"] .ProseMirror')
    await editor.fill('Content without title')

    // 3. Try to navigate away - should show validation warning
    await page.click('[data-testid="back-to-notes-button"]')

    // 4. Should show confirmation dialog
    await expect(page.locator('[data-testid="unsaved-changes-dialog"]')).toBeVisible()
    await expect(page.locator('[data-testid="unsaved-changes-dialog"]')).toContainText(
      'You have unsaved changes. Are you sure you want to leave?'
    )

    // 5. Choose to save changes
    await page.click('[data-testid="save-changes-button"]')

    // 6. Should show validation error for empty title
    await expect(page.locator('[data-testid="validation-error"]')).toContainText(
      'Title is required'
    )

    // 7. Fill title and save successfully
    await page.fill('[data-testid="note-title-input"]', 'Valid Title')
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved')
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    // 1. Create a new note
    await page.click('[data-testid="new-note-button"]')
    await page.fill('[data-testid="note-title-input"]', 'Keyboard Shortcuts Test')

    // 2. Test Ctrl+S for save
    const editor = page.locator('[data-testid="rich-text-editor"] .ProseMirror')
    await editor.fill('Test content')
    await page.keyboard.press('Control+s')

    // Should show save indicator
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saving')
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved', { timeout: 5000 })

    // 3. Test Ctrl+B for bold
    await editor.selectText('Test')
    await page.keyboard.press('Control+b')
    await expect(editor.locator('strong')).toContainText('Test')

    // 4. Test Ctrl+I for italic
    await editor.selectText('content')
    await page.keyboard.press('Control+i')
    await expect(editor.locator('em')).toContainText('content')

    // 5. Test Ctrl+K for link
    await editor.press('End')
    await editor.type('Example')
    await editor.selectText('Example')
    await page.keyboard.press('Control+k')

    // Should open link dialog
    await expect(page.locator('[data-testid="link-dialog"]')).toBeVisible()
  })

  test('should handle responsive design on mobile', async ({ page }) => {
    // 1. Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // 2. Navigate to notes
    await page.goto('/notes')

    // 3. Verify mobile layout
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
    await expect(page.locator('[data-testid="notes-grid"]')).toHaveClass(/mobile/)

    // 4. Create new note on mobile
    await page.click('[data-testid="mobile-new-note-button"]')
    await expect(page).toHaveURL(/\/notes\/[a-zA-Z0-9-]+/)

    // 5. Verify mobile editor layout
    await expect(page.locator('[data-testid="mobile-editor"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-toolbar"]')).toBeVisible()

    // 6. Test mobile keyboard doesn't cover content
    await page.tap('[data-testid="note-title-input"]')
    await page.fill('[data-testid="note-title-input"]', 'Mobile Test Note')

    // Verify viewport adjustment for keyboard
    const editorHeight = await page.locator('[data-testid="rich-text-editor"]').evaluate(el => el.clientHeight)
    expect(editorHeight).toBeGreaterThan(200)
  })

  test('should handle note export functionality', async ({ page }) => {
    // 1. Create a note with content
    await page.click('[data-testid="new-note-button"]')
    await page.fill('[data-testid="note-title-input"]', 'Export Test Note')

    const editor = page.locator('[data-testid="rich-text-editor"] .ProseMirror')
    await editor.fill(testNote.content)

    // Wait for auto-save
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved')

    // 2. Test markdown export
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-markdown-button"]')
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toMatch(/Export-Test-Note.*\.md$/)

    // 3. Test PDF export (if available)
    if (await page.locator('[data-testid="export-pdf-button"]').isVisible()) {
      const pdfDownloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="export-pdf-button"]')
      const pdfDownload = await pdfDownloadPromise

      expect(pdfDownload.suggestedFilename()).toMatch(/Export-Test-Note.*\.pdf$/)
    }
  })

  test('should handle batch operations', async ({ page }) => {
    // 1. Create multiple notes for batch testing
    const notes = [
      { title: 'Batch Test 1', content: 'First test note' },
      { title: 'Batch Test 2', content: 'Second test note' },
      { title: 'Batch Test 3', content: 'Third test note' },
    ]

    for (const note of notes) {
      await page.click('[data-testid="new-note-button"]')
      await page.fill('[data-testid="note-title-input"]', note.title)

      const editor = page.locator('[data-testid="rich-text-editor"] .ProseMirror')
      await editor.fill(note.content)

      await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved')
      await page.click('[data-testid="back-to-notes-button"]')
    }

    // 2. Test batch selection
    await page.click('[data-testid="batch-select-button"]')

    // Select multiple notes
    for (const note of notes) {
      await page.click(`[data-testid="note-checkbox"][data-note-title="${note.title}"]`)
    }

    // 3. Test batch archive
    await page.click('[data-testid="batch-archive-button"]')
    await expect(page.locator('[data-testid="batch-confirm-dialog"]')).toBeVisible()
    await page.click('[data-testid="confirm-batch-action"]')

    // Verify notes are archived
    for (const note of notes) {
      await expect(page.locator(`[data-testid="note-card"][data-note-title="${note.title}"]`)).not.toBeVisible()
    }

    // 4. Test batch export
    // Go to archived notes and export them
    await page.click('[data-testid="show-archived-button"]')

    const batchDownloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="batch-export-button"]')
    const batchDownload = await batchDownloadPromise

    expect(batchDownload.suggestedFilename()).toMatch(/batch-export.*\.zip$/)
  })

  test('should handle performance with large notes', async ({ page }) => {
    // 1. Create a large note
    await page.click('[data-testid="new-note-button"]')
    await page.fill('[data-testid="note-title-input"]', 'Large Note Test')

    // Generate large content
    const largeContent = '# Large Note\n\n' +
      Array.from({ length: 100 }, (_, i) => `## Section ${i + 1}\n\n${'This is a paragraph with some content. '.repeat(20)}\n`).join('\n')

    const editor = page.locator('[data-testid="rich-text-editor"] .ProseMirror')

    // Measure performance
    const startTime = Date.now()
    await editor.fill(largeContent)
    const fillTime = Date.now() - startTime

    // Should fill content within reasonable time
    expect(fillTime).toBeLessThan(5000)

    // 2. Test auto-save performance with large content
    const saveStartTime = Date.now()
    await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved', { timeout: 10000 })
    const saveTime = Date.now() - saveStartTime

    // Should save within reasonable time
    expect(saveTime).toBeLessThan(10000)

    // 3. Test scrolling performance
    const scrollStartTime = Date.now()
    await editor.press('End')
    const scrollTime = Date.now() - scrollStartTime

    // Should scroll within reasonable time
    expect(scrollTime).toBeLessThan(1000)
  })
})