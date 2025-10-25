/**
 * Integration test for Git hooks execution
 * 测试Git hooks执行的集成测试
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { execFileNoThrow } from '../../src/utils/execFileNoThrow'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Git Hooks Integration Tests', () => {
  const testDir = path.join(os.tmpdir(), `mindnote-test-${Date.now()}`)
  let originalDir: string

  beforeAll(async () => {
    originalDir = process.cwd()

    // 创建临时测试目录
    await fs.mkdir(testDir, { recursive: true })

    // 初始化Git仓库
    process.chdir(testDir)

    await execFileNoThrow('git', ['init'])
    await execFileNoThrow('git', ['config', 'user.name', 'Test User'])
    await execFileNoThrow('git', ['config', 'user.email', 'test@example.com'])

    // 复制项目配置文件
    const projectRoot = path.join(originalDir)
    const huskyDir = path.join(testDir, '.husky')
    await fs.mkdir(huskyDir, { recursive: true })

    // 创建基本的package.json
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'mindnote-test',
        version: '1.0.0',
        scripts: {
          lint: 'echo "lint simulation"',
          'lint:fix': 'echo "lint:fix simulation"',
          test: 'echo "test simulation"'
        }
      }, null, 2)
    )
  })

  afterAll(async () => {
    process.chdir(originalDir)
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch (error) {
      // 忽略清理错误
    }
  })

  describe('Pre-commit Hook', () => {
    it('should run linting before commit', async () => {
      // 创建pre-commit hook脚本
      const preCommitHook = `#!/bin/bash
echo "Running pre-commit checks..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Commit aborted."
  exit 1
fi
echo "✅ Pre-commit checks passed."
exit 0
`

      await fs.writeFile(
        path.join(testDir, '.husky', 'pre-commit'),
        preCommitHook
      )
      await fs.chmod(path.join(testDir, '.husky', 'pre-commit'), '755')

      // 创建一个测试文件
      const testFile = 'test-file.js'
      await fs.writeFile(
        path.join(testDir, testFile),
        'const x = 1;\nconsole.log(x);\n'
      )

      // 添加文件到Git
      await execFileNoThrow('git', ['add', testFile])

      // 尝试提交 - 应该成功
      const result = await execFileNoThrow('git', ['commit', '-m', 'test commit'])

      expect(result.success).toBe(true)
      expect(result.stdout).toContain('Pre-commit checks passed')
    })

    it('should reject commit with linting errors', async () => {
      // 创建一个会导致linting错误的pre-commit hook
      const preCommitHook = `#!/bin/bash
echo "Running pre-commit checks..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Commit aborted."
  exit 1
fi
echo "✅ Pre-commit checks passed."
exit 0
`

      await fs.writeFile(
        path.join(testDir, '.husky', 'pre-commit'),
        preCommitHook
      )

      // 创建一个有问题的文件
      const badFile = 'bad-file.js'
      await fs.writeFile(
        path.join(testDir, badFile),
        'var x = 1; // 使用var而不是let/const\n'
      )

      // 添加文件到Git
      await execFileNoThrow('git', ['add', badFile])

      // 尝试提交 - 应该失败
      const result = await execFileNoThrow('git', ['commit', '-m', 'bad commit'])

      expect(result.success).toBe(false)
      expect(result.stderr).toContain('Linting failed')
    })
  })

  describe('Hook Configuration', () => {
    it('should have correct hook file permissions', async () => {
      const preCommitPath = path.join(testDir, '.husky', 'pre-commit')

      // 确保hook文件是可执行的
      const stats = await fs.stat(preCommitPath)
      // 检查文件权限 (755 = rwxr-xr-x)
      expect(stats.mode & 0o111).toBe(0o111) // 可执行权限
    })

    it('should contain proper shebang', async () => {
      const preCommitPath = path.join(testDir, '.husky', 'pre-commit')
      const content = await fs.readFile(preCommitPath, 'utf8')

      expect(content).toMatch(/^#!\/bin\/bash/)
    })
  })
})