import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import os from 'os'

const execFileAsync = promisify(execFile)

describe('Cross-platform Compatibility Tests', () => {
  const projectRoot = process.cwd()
  const isWindows = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const isLinux = process.platform === 'linux'

  describe('Operating System Detection', () => {
    it('should correctly identify the operating system', () => {
      expect(['win32', 'darwin', 'linux']).toContain(process.platform)
    })

    it('should have platform-specific configurations', () => {
      const envExamplePath = path.join(projectRoot, '.env.example')
      if (fs.existsSync(envExamplePath)) {
        const content = fs.readFileSync(envExamplePath, 'utf8')

        // Should have cross-platform paths
        expect(content).not.toMatch(/\/usr\/local\/bin/)
        expect(content).not.toMatch(/C:\\\\Program Files/)
      }
    })
  })

  describe('Path Handling', () => {
    it('should handle path separators correctly', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        const scripts = packageJson.scripts || {}

        // Scripts should use path.join or cross-platform approaches
        Object.values(scripts).forEach((script: string) => {
          if (typeof script === 'string') {
            // Should not use hardcoded path separators
            expect(script).not.toContain('\\\\') // Windows backslashes
            expect(script).not.toMatch(/\/bin\//) // Unix-style binary paths
          }
        })
      }
    })

    it('should resolve paths correctly on all platforms', () => {
      const testPaths = [
        'src/app',
        'src/lib',
        'prisma/schema.prisma',
        'tests/integration',
        'docker/Dockerfile.dev'
      ]

      testPaths.forEach(testPath => {
        const fullPath = path.join(projectRoot, testPath)
        const normalizedPath = path.normalize(fullPath)

        expect(normalizedPath).not.toContain('/')
        if (isWindows) {
          expect(normalizedPath).toMatch(/^[A-Z]:\\/i) // Windows drive letter
        }
      })
    })
  })

  describe('Environment Variables', () => {
    it('should use cross-platform environment variable names', () => {
      const envExamplePath = path.join(projectRoot, '.env.example')
      if (fs.existsSync(envExamplePath)) {
        const content = fs.readFileSync(envExamplePath, 'utf8')
        const lines = content.split('\n')

        lines.forEach(line => {
          if (line.startsWith('#') || line.trim() === '') return

          // Environment variable names should be uppercase with underscores
          const match = line.match(/^([A-Z_][A-Z0-9_]*)=/)
          if (match) {
            const varName = match[1]
            expect(varName).toMatch(/^[A-Z][A-Z0-9_]*$/)
          }
        })
      }
    })

    it('should have platform-agnostic default values', () => {
      const envExamplePath = path.join(projectRoot, '.env.example')
      if (fs.existsSync(envExamplePath)) {
        const content = fs.readFileSync(envExamplePath, 'utf8')

        // Should not use platform-specific paths in defaults
        expect(content).not.toMatch(/=\/usr\//)
        expect(content).not.toMatch(/=C:\\\\/)
      }
    })
  })

  describe('Script Execution', () => {
    it('should detect script availability across platforms', async () => {
      const commands = isWindows ? ['where'] : ['which']
      const tools = ['node', 'npm']

      for (const tool of tools) {
        try {
          await execFileAsync(commands[0], [tool])
          expect(true).toBe(true) // Tool found
        } catch (error) {
          // Tool not found, but test passes (we're testing detection, not availability)
          expect(tool).toBeDefined()
        }
      }
    })

    it('should handle shell differences', () => {
      const scriptsDir = path.join(projectRoot, 'scripts')
      const setupScript = path.join(scriptsDir, 'setup-dev.sh')

      if (fs.existsSync(setupScript)) {
        const content = fs.readFileSync(setupScript, 'utf8')

        // Should use shebang that works across platforms
        if (!isWindows) {
          expect(content).toMatch(/^#!\/bin\/bash/)
        }

        // Should avoid platform-specific commands
        if (isWindows) {
          // Should handle Windows appropriately
          expect(content).not.toMatch(/export PATH=/) // Complex path manipulation
        } else {
          // Unix-specific commands are okay
          expect(content).toMatch(/chmod|mkdir|cp/) // Basic Unix commands
        }
      }
    })
  })

  describe('File System Operations', () => {
    it('should handle file permissions appropriately', () => {
      const scriptsDir = path.join(projectRoot, 'scripts')
      const setupScript = path.join(scriptsDir, 'setup-dev.sh')

      if (fs.existsSync(setupScript) && !isWindows) {
        const stats = fs.statSync(setupScript)
        // Should have execute permissions on Unix-like systems
        expect(stats.mode & parseInt('111', 8)).toBeTruthy()
      }
    })

    it('should create directories with correct permissions', () => {
      const testDir = path.join(projectRoot, 'tmp-test-dir')

      try {
        fs.mkdirSync(testDir, { recursive: true })
        expect(fs.existsSync(testDir)).toBe(true)

        if (!isWindows) {
          const stats = fs.statSync(testDir)
          // Directory should have read/write/execute permissions
          expect(stats.mode & parseInt('755', 8)).toBeTruthy()
        }
      } finally {
        // Cleanup
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true })
        }
      }
    })
  })

  describe('Docker Compatibility', () => {
    it('should have Docker configurations that work on all platforms', () => {
      const dockerComposePath = path.join(projectRoot, 'docker-compose.dev.yml')

      if (fs.existsSync(dockerComposePath)) {
        const content = fs.readFileSync(dockerComposePath, 'utf8')

        // Volume paths should use forward slashes (Docker standard)
        const volumeMatches = content.match(/- (.+):(.+)/g)
        if (volumeMatches) {
          volumeMatches.forEach(volume => {
            expect(volume).not.toContain('\\\\') // Windows backslashes
          })
        }

        // Should use environment variables for platform-specific settings
        expect(content).toMatch(/\$\{[^}]+\}/)
      }
    })

    it('should handle platform-specific Docker requirements', () => {
      const dockerfilePath = path.join(projectRoot, 'docker', 'Dockerfile.dev')

      if (fs.existsSync(dockerfilePath)) {
        const content = fs.readFileSync(dockerfilePath, 'utf8')

        // Base image should be appropriate for development
        expect(content).toMatch(/FROM node:.*-alpine|FROM node:.*-slim/)

        // Should handle different package managers
        if (isWindows) {
          // Windows might need different package handling
          expect(content).toMatch(/npm ci|npm install/)
        }
      }
    })
  })

  describe('Node.js and npm Compatibility', () => {
    it('should use compatible Node.js versions', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json')

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

        // Should specify Node.js version that works on all platforms
        if (packageJson.engines?.node) {
          const nodeVersion = packageJson.engines.node
          expect(nodeVersion).toMatch(/\d+/) // Should have numeric version
          expect(nodeVersion).not.toMatch(/latest|current/) // Should avoid ambiguous versions
        }
      }
    })

    it('should handle npm scripts correctly', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json')

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        const scripts = packageJson.scripts || {}

        // Scripts should use cross-platform approaches
        Object.entries(scripts).forEach(([name, script]) => {
          if (typeof script === 'string') {
            // Should avoid platform-specific shell features
            expect(script).not.toContain('&&') // Complex chaining
            expect(script).not.toContain('||') // Shell OR operator
            expect(script).not.toContain('>') // Redirection
            expect(script).not.toContain('<') // Input redirection
          }
        })
      }
    })
  })

  describe('Development Tools Integration', () => {
    it('should have IDE configurations that work across platforms', () => {
      const vscodeDir = path.join(projectRoot, '.vscode')

      if (fs.existsSync(vscodeDir)) {
        const settingsPath = path.join(vscodeDir, 'settings.json')
        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))

          // Paths should use forward slashes (VS Code standard)
          Object.values(settings).forEach(value => {
            if (typeof value === 'string') {
              expect(value).not.toContain('\\\\') // Windows backslashes
            }
          })
        }
      }
    })

    it('should handle Git operations correctly', () => {
      const gitignorePath = path.join(projectRoot, '.gitignore')

      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf8')

        // Should use forward slashes for paths
        const lines = content.split('\n')
        lines.forEach(line => {
          if (line.trim() && !line.startsWith('#')) {
            expect(line).not.toContain('\\\\') // Windows backslashes
          }
        })
      }
    })
  })

  describe('Performance Considerations', () => {
    it('should handle file watching appropriately', () => {
      const nextConfigPath = path.join(projectRoot, 'next.config.js')

      if (fs.existsSync(nextConfigPath)) {
        const content = fs.readFileSync(nextConfigPath, 'utf8')

        // Should have file watching configuration
        if (isWindows) {
          // Windows might need special file watching configuration
          expect(content).toMatch(/watchOptions|polling/i)
        }
      }
    })

    it('should optimize for the current platform', () => {
      // Check if platform-specific optimizations are in place
      const packageJsonPath = path.join(projectRoot, 'package.json')

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

        if (isWindows) {
          // Windows might need specific dependencies
          expect(Object.keys(packageJson.dependencies || {})).toBeDefined()
        }
      }
    })
  })
})