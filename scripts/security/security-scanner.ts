#!/usr/bin/env tsx

/**
 * 安全扫描系统
 *
 * 自动化安全漏洞扫描和依赖检查工具
 * 支持代码安全扫描、依赖漏洞检查、配置安全验证等
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { execFileNoThrow } from '../../src/utils/execFileNoThrow'

// 配置接口
interface SecurityConfig {
  projectRoot: string
  reportsDir: string
  scanTypes: ScanType[]
  severity: SeverityLevel
  excludePatterns: string[]
  failOnVulnerabilities: boolean
}

// 扫描类型
enum ScanType {
  DEPENDENCIES = 'dependencies',    // 依赖漏洞扫描
  CODE_SECURITY = 'code',           // 代码安全扫描
  CONFIGURATION = 'config',         // 配置安全检查
  SECRETS = 'secrets',             // 密钥泄露检测
  INFRASTRUCTURE = 'infra',        // 基础设施安全
  COMPLIANCE = 'compliance'         // 合规性检查
}

// 严重程度
enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 扫描结果
interface ScanResult {
  type: ScanType
  success: boolean
  vulnerabilities: Vulnerability[]
  summary: ScanSummary
  duration: number
  timestamp: Date
}

// 漏洞信息
interface Vulnerability {
  id: string
  title: string
  description: string
  severity: SeverityLevel
  package?: string
  version?: string
  cwe?: string
  cve?: string
  path?: string
  recommendation: string
  references: string[]
}

// 扫描摘要
interface ScanSummary {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  passed: boolean
}

// 扫描器基类
abstract class BaseScanner {
  protected config: SecurityConfig
  protected projectRoot: string

  constructor(config: SecurityConfig) {
    this.config = config
    this.projectRoot = config.projectRoot
  }

  abstract scan(): Promise<ScanResult>

  protected createScanResult(
    type: ScanType,
    vulnerabilities: Vulnerability[],
    duration: number,
    success: boolean = true
  ): ScanResult {
    const summary = this.generateSummary(vulnerabilities)

    return {
      type,
      success,
      vulnerabilities,
      summary,
      duration,
      timestamp: new Date()
    }
  }

  protected generateSummary(vulnerabilities: Vulnerability[]): ScanSummary {
    const summary = {
      total: vulnerabilities.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      passed: true
    }

    vulnerabilities.forEach(vuln => {
      summary[vuln.severity]++
    })

    // 根据配置的严重程度判断是否通过
    summary.passed = this.config.severity === SeverityLevel.LOW ||
      (this.config.severity === SeverityLevel.MEDIUM && summary.critical === 0 && summary.high === 0) ||
      (this.config.severity === SeverityLevel.HIGH && summary.critical === 0) ||
      (this.config.severity === SeverityLevel.CRITICAL && summary.critical === 0 && summary.high === 0)

    return summary
  }

  protected async executeCommand(command: string, args: string[] = [], cwd?: string): Promise<string> {
    const result = await execFileNoThrow(command, args, {
      cwd: cwd || this.projectRoot,
      timeout: 60000
    })

    if (!result.success) {
      throw new Error(`命令执行失败: ${command} ${args.join(' ')}\n错误: ${result.stderr}`)
    }

    return result.stdout
  }

  protected async isCommandAvailable(command: string): Promise<boolean> {
    try {
      const result = await execFileNoThrow('which', [command])
      return result.success
    } catch {
      // 在Windows上使用 where 命令
      if (process.platform === 'win32') {
        try {
          const result = await execFileNoThrow('where', [command])
          return result.success
        } catch {
          return false
        }
      }
      return false
    }
  }
}

// 依赖漏洞扫描器
class DependencyScanner extends BaseScanner {
  async scan(): Promise<ScanResult> {
    const startTime = Date.now()
    const vulnerabilities: Vulnerability[] = []

    try {
      // 检查npm audit
      await this.runNpmAudit(vulnerabilities)

      // 检查Yarn audit（如果使用yarn）
      if (existsSync(join(this.projectRoot, 'yarn.lock'))) {
        await this.runYarnAudit(vulnerabilities)
      }

      // 检查Snyk（如果可用）
      if (await this.isCommandAvailable('snyk')) {
        await this.runSnykScan(vulnerabilities)
      }

    } catch (error: any) {
      console.error('依赖扫描失败:', error.message)
    }

    const duration = Date.now() - startTime
    return this.createScanResult(ScanType.DEPENDENCIES, vulnerabilities, duration)
  }

  private async runNpmAudit(vulnerabilities: Vulnerability[]): Promise<void> {
    try {
      const auditResult = await this.executeCommand('npm', ['audit', '--json'])
      const auditData = JSON.parse(auditResult)

      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([packageName, vulnData]: [string, any]) => {
          const vulnerability = this.parseNpmVulnerability(packageName, vulnData)
          if (vulnerability) {
            vulnerabilities.push(vulnerability)
          }
        })
      }
    } catch (error: any) {
      console.warn('npm audit 失败:', error.message)
    }
  }

  private async runYarnAudit(vulnerabilities: Vulnerability[]): Promise<void> {
    try {
      const auditResult = await this.executeCommand('yarn', ['audit', '--json'])
      const auditLines = auditResult.split('\n').filter(line => line.trim())

      auditLines.forEach(line => {
        try {
          const auditData = JSON.parse(line)
          if (auditData.type === 'auditAdvisory') {
            const vulnerability = this.parseYarnVulnerability(auditData.advisory)
            if (vulnerability) {
              vulnerabilities.push(vulnerability)
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      })
    } catch (error: any) {
      console.warn('yarn audit 失败:', error.message)
    }
  }

  private async runSnykScan(vulnerabilities: Vulnerability[]): Promise<void> {
    try {
      const snykResult = await this.executeCommand('snyk', ['test', '--json'])
      const snykData = JSON.parse(snykResult)

      if (snykData.vulnerabilities) {
        snykData.vulnerabilities.forEach((vulnData: any) => {
          const vulnerability = this.parseSnykVulnerability(vulnData)
          if (vulnerability) {
            vulnerabilities.push(vulnerability)
          }
        })
      }
    } catch (error: any) {
      console.warn('Snyk扫描失败:', error.message)
    }
  }

  private parseNpmVulnerability(packageName: string, vulnData: any): Vulnerability | null {
    if (!vulnData) return null

    return {
      id: vulnData.source || `npm-${packageName}`,
      title: `${packageName} 依赖漏洞`,
      description: vulnData.overview || '发现依赖安全漏洞',
      severity: this.mapSeverity(vulnData.severity),
      package: packageName,
      version: vulnData.versionRange,
      cve: vulnData.cwe ? vulnData.cwe.join(', ') : undefined,
      recommendation: vulnData.fixAvailable ? vulnData.fixAvailable[0]?.version : '请更新到安全版本',
      references: vulnData.url ? [vulnData.url] : []
    }
  }

  private parseYarnVulnerability(advisory: any): Vulnerability | null {
    if (!advisory) return null

    return {
      id: advisory.id || `yarn-${advisory.module_name}`,
      title: advisory.title || `${advisory.module_name} 依赖漏洞`,
      description: advisory.overview || '发现依赖安全漏洞',
      severity: this.mapSeverity(advisory.severity),
      package: advisory.module_name,
      version: advisory.vulnerable_versions,
      cve: advisory.cwe ? advisory.cwe.join(', ') : undefined,
      recommendation: advisory.recommendation || '请更新到安全版本',
      references: advisory.url ? [advisory.url] : []
    }
  }

  private parseSnykVulnerability(vulnData: any): Vulnerability | null {
    if (!vulnData) return null

    return {
      id: vulnData.id || `snyk-${vulnData.package}`,
      title: vulnData.title || `${vulnData.package} 依赖漏洞`,
      description: vulnData.description || '发现依赖安全漏洞',
      severity: this.mapSeverity(vulnData.severity),
      package: vulnData.package,
      version: vulnData.version,
      cve: vulnData.identifiers?.CVE?.join(', ') || vulnData.identifiers?.CWE?.join(', '),
      recommendation: vulnData.recommendation || '请更新到安全版本',
      references: vulnData.references || []
    }
  }

  private mapSeverity(severity: string): SeverityLevel {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return SeverityLevel.CRITICAL
      case 'moderate':
      case 'medium':
        return SeverityLevel.HIGH
      case 'low':
        return SeverityLevel.MEDIUM
      default:
        return SeverityLevel.LOW
    }
  }
}

// 代码安全扫描器
class CodeSecurityScanner extends BaseScanner {
  async scan(): Promise<ScanResult> {
    const startTime = Date.now()
    const vulnerabilities: Vulnerability[] = []

    try {
      // ESLint安全规则扫描
      await this.runESLintSecurity(vulnerabilities)

      // TypeScript编译检查
      await this.runTypeScriptCheck(vulnerabilities)

      // Semgrep扫描（如果可用）
      if (await this.isCommandAvailable('semgrep')) {
        await this.runSemgrepScan(vulnerabilities)
      }

    } catch (error: any) {
      console.error('代码安全扫描失败:', error.message)
    }

    const duration = Date.now() - startTime
    return this.createScanResult(ScanType.CODE_SECURITY, vulnerabilities, duration)
  }

  private async runESLintSecurity(vulnerabilities: Vulnerability[]): Promise<void> {
    try {
      const eslintResult = await this.executeCommand('npx', ['eslint', 'src/', '--format=json'])
      const eslintData = JSON.parse(eslintResult)

      eslintData.forEach((result: any) => {
        result.messages.forEach((message: any) => {
          if (message.ruleId?.startsWith('security') || message.ruleId?.includes('security')) {
            const vulnerability = this.parseESLintVulnerability(result, message)
            if (vulnerability) {
              vulnerabilities.push(vulnerability)
            }
          }
        })
      })
    } catch (error: any) {
      console.warn('ESLint安全扫描失败:', error.message)
    }
  }

  private async runTypeScriptCheck(vulnerabilities: Vulnerability[]): Promise<void> {
    try {
      await this.executeCommand('npx', ['tsc', '--noEmit'])
    } catch (error: any) {
      vulnerabilities.push({
        id: 'typescript-compile-error',
        title: 'TypeScript编译错误',
        description: 'TypeScript编译检查失败，可能存在类型安全问题',
        severity: SeverityLevel.MEDIUM,
        recommendation: '修复TypeScript编译错误，确保类型安全',
        references: []
      })
    }
  }

  private async runSemgrepScan(vulnerabilities: Vulnerability[]): Promise<void> {
    try {
      const semgrepResult = await this.executeCommand('semgrep', ['--config=auto', '--json', 'src/'])
      const semgrepData = JSON.parse(semgrepResult)

      semgrepData.results?.forEach((result: any) => {
        const vulnerability = this.parseSemgrepVulnerability(result)
        if (vulnerability) {
          vulnerabilities.push(vulnerability)
        }
      })
    } catch (error: any) {
      console.warn('Semgrep扫描失败:', error.message)
    }
  }

  private parseESLintVulnerability(result: any, message: any): Vulnerability {
    return {
      id: `eslint-${message.ruleId}`,
      title: message.ruleId || 'ESLint安全问题',
      description: message.message,
      severity: this.mapESLintSeverity(message.severity),
      path: result.filePath,
      recommendation: '根据ESLint建议修复安全问题',
      references: [`https://eslint.org/docs/rules/${message.ruleId}`]
    }
  }

  private parseSemgrepVulnerability(result: any): Vulnerability {
    return {
      id: `semgrep-${result.metadata?.rule_id || 'unknown'}`,
      title: result.metadata?.rule_id || 'Semgrep安全问题',
      description: result.message || '发现潜在的安全问题',
      severity: this.mapSemgrepSeverity(result.metadata?.severity),
      path: result.path,
      recommendation: result.metadata?.fix || '检查并修复代码安全问题',
      references: result.metadata?.references || []
    }
  }

  private mapESLintSeverity(severity: number): SeverityLevel {
    switch (severity) {
      case 2:
        return SeverityLevel.HIGH
      case 1:
        return SeverityLevel.MEDIUM
      default:
        return SeverityLevel.LOW
    }
  }

  private mapSemgrepSeverity(severity: string): SeverityLevel {
    switch (severity?.toLowerCase()) {
      case 'error':
        return SeverityLevel.CRITICAL
      case 'warning':
        return SeverityLevel.HIGH
      case 'info':
        return SeverityLevel.MEDIUM
      default:
        return SeverityLevel.LOW
    }
  }
}

// 配置安全扫描器
class ConfigurationScanner extends BaseScanner {
  async scan(): Promise<ScanResult> {
    const startTime = Date.now()
    const vulnerabilities: Vulnerability[] = []

    try {
      // 检查环境变量安全
      await this.checkEnvironmentVariables(vulnerabilities)

      // 检查配置文件安全
      await this.checkConfigFiles(vulnerabilities)

      // 检查权限设置
      await this.checkFilePermissions(vulnerabilities)

    } catch (error: any) {
      console.error('配置安全扫描失败:', error.message)
    }

    const duration = Date.now() - startTime
    return this.createScanResult(ScanType.CONFIGURATION, vulnerabilities, duration)
  }

  private async checkEnvironmentVariables(vulnerabilities: Vulnerability[]): Promise<void> {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /api[_-]?key/i,
      /private/i,
      /credential/i
    ]

    const envFiles = ['.env', '.env.local', '.env.development', '.env.production']

    envFiles.forEach(envFile => {
      const envPath = join(this.projectRoot, envFile)
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf8')

        sensitivePatterns.forEach(pattern => {
          const matches = content.match(new RegExp(`.*${pattern.source}.*`, 'gi'))
          if (matches) {
            vulnerabilities.push({
              id: `env-${envFile}-sensitive`,
              title: `敏感信息泄露风险: ${envFile}`,
              description: `在${envFile}中发现可能包含敏感信息的配置`,
              severity: SeverityLevel.HIGH,
              path: envPath,
              recommendation: '避免在环境文件中存储敏感信息，使用环境变量或密钥管理服务',
              references: ['https://owasp.org/www-project-cheat-sheets/crets_Cheat_Sheet.html']
            })
          }
        })
      }
    })
  }

  private async checkConfigFiles(vulnerabilities: Vulnerability[]): Promise<void> {
    const configFiles = [
      'package.json',
      'next.config.js',
      'tsconfig.json',
      '.env.example',
      'README.md'
    ]

    configFiles.forEach(configFile => {
      const configPath = join(this.projectRoot, configFile)
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf8')

        // 检查硬编码的密码或密钥
        const hardcodedSecrets = content.match(/["'](password|secret|token|key)["']\s*:\s*["'][^"']+["']/gi)
        if (hardcodedSecrets) {
          vulnerabilities.push({
            id: `config-${configFile}-hardcoded-secrets`,
            title: `硬编码敏感信息: ${configFile}`,
            description: `在${configFile}中发现硬编码的敏感信息`,
            severity: SeverityLevel.CRITICAL,
            path: configPath,
            recommendation: '移除硬编码的敏感信息，使用环境变量或配置管理服务',
            references: ['https://owasp.org/www-project-cheat-sheets/crets_Cheat_Sheet.html']
          })
        }
      }
    })
  }

  private async checkFilePermissions(vulnerabilities: Vulnerability[]): Promise<void> {
    const sensitiveFiles = [
      '.env',
      '.env.local',
      'config/secrets.json',
      'private/key.pem'
    ]

    for (const file of sensitiveFiles) {
      const filePath = join(this.projectRoot, file)
      if (existsSync(filePath)) {
        try {
          const result = await this.executeCommand('ls', ['-la', filePath])
          const parts = result.trim().split(/\s+/)
          const permissions = parts[0]

          // 检查是否对其他用户可读
          if (permissions && permissions[7] !== '0') {
            vulnerabilities.push({
              id: `permissions-${file}`,
              title: `文件权限过于开放: ${file}`,
              description: `敏感文件${file}对其他用户可读`,
              severity: SeverityLevel.HIGH,
              path: filePath,
              recommendation: '修改文件权限，限制敏感文件的访问权限',
              references: []
            })
          }
        } catch (error) {
          // 忽略权限检查错误
        }
      }
    }
  }
}

// 密钥泄露扫描器
class SecretsScanner extends BaseScanner {
  async scan(): Promise<ScanResult> {
    const startTime = Date.now()
    const vulnerabilities: Vulnerability[] = []

    try {
      // 使用GitLeaks扫描（如果可用）
      if (await this.isCommandAvailable('gitleaks')) {
        await this.runGitLeaksScan(vulnerabilities)
      }

      // 使用TruffleHog扫描（如果可用）
      if (await this.isCommandAvailable('trufflehog')) {
        await this.runTruffleHogScan(vulnerabilities)
      }

    } catch (error: any) {
      console.error('密钥泄露扫描失败:', error.message)
    }

    const duration = Date.now() - startTime
    return this.createScanResult(ScanType.SECRETS, vulnerabilities, duration)
  }

  private async runGitLeaksScan(vulnerabilities: Vulnerability[]): Promise<void> {
    try {
      const gitleaksResult = await this.executeCommand('gitleaks', ['detect', '--json', '--verbose'])
      const gitleaksData = JSON.parse(gitleaksResult)

      if (gitleaksData && Array.isArray(gitleaksData)) {
        gitleaksData.forEach((finding: any) => {
          const vulnerability = this.parseGitLeaksFinding(finding)
          if (vulnerability) {
            vulnerabilities.push(vulnerability)
          }
        })
      }
    } catch (error: any) {
      console.warn('GitLeaks扫描失败:', error.message)
    }
  }

  private async runTruffleHogScan(vulnerabilities: Vulnerability[]): Promise<void> {
    try {
      const trufflehogResult = await this.executeCommand('trufflehog', ['--json', '.'])
      const trufflehogLines = trufflehogResult.split('\n').filter(line => line.trim())

      trufflehogLines.forEach(line => {
        try {
          const finding = JSON.parse(line)
          const vulnerability = this.parseTruffleHogFinding(finding)
          if (vulnerability) {
            vulnerabilities.push(vulnerability)
          }
        } catch (e) {
          // 忽略解析错误
        }
      })
    } catch (error: any) {
      console.warn('TruffleHog扫描失败:', error.message)
    }
  }

  private parseGitLeaksFinding(finding: any): Vulnerability | null {
    if (!finding) return null

    return {
      id: `gitleaks-${finding.ruleID || 'unknown'}`,
      title: finding.rule || '密钥泄露风险',
      description: finding.commit || '发现可能泄露的密钥信息',
      severity: SeverityLevel.CRITICAL,
      path: finding.file,
      recommendation: '移除代码中的密钥信息，使用环境变量或密钥管理服务',
      references: []
    }
  }

  private parseTruffleHogFinding(finding: any): Vulnerability | null {
    if (!finding) return null

    return {
      id: `trufflehog-${finding.type || 'unknown'}`,
      title: `${finding.type || '密钥'}泄露风险`,
      description: `发现泄露的${finding.type || '密钥'}信息`,
      severity: SeverityLevel.CRITICAL,
      path: finding.path,
      recommendation: '移除代码中的密钥信息，使用环境变量或密钥管理服务',
      references: []
    }
  }
}

// 安全扫描管理器
class SecurityScannerManager {
  private config: SecurityConfig
  private scanners: Map<ScanType, BaseScanner>

  constructor(config: SecurityConfig) {
    this.config = config
    this.scanners = new Map()

    // 初始化扫描器
    if (config.scanTypes.includes(ScanType.DEPENDENCIES)) {
      this.scanners.set(ScanType.DEPENDENCIES, new DependencyScanner(config))
    }
    if (config.scanTypes.includes(ScanType.CODE_SECURITY)) {
      this.scanners.set(ScanType.CODE_SECURITY, new CodeSecurityScanner(config))
    }
    if (config.scanTypes.includes(ScanType.CONFIGURATION)) {
      this.scanners.set(ScanType.CONFIGURATION, new ConfigurationScanner(config))
    }
    if (config.scanTypes.includes(ScanType.SECRETS)) {
      this.scanners.set(ScanType.SECRETS, new SecretsScanner(config))
    }
  }

  async runFullScan(): Promise<ScanResult[]> {
    console.log('🔍 开始安全扫描...')
    console.log(`📁 项目路径: ${this.config.projectRoot}`)
    console.log(`📊 报告目录: ${this.config.reportsDir}`)
    console.log(`⚠️  严重程度阈值: ${this.config.severity}`)
    console.log('')

    const results: ScanResult[] = []
    const overallStartTime = Date.now()

    // 确保报告目录存在
    if (!existsSync(this.config.reportsDir)) {
      mkdirSync(this.config.reportsDir, { recursive: true })
    }

    // 并行运行所有扫描
    const scanPromises = Array.from(this.scanners.entries()).map(async ([type, scanner]) => {
      console.log(`🔍 开始 ${type} 扫描...`)
      const startTime = Date.now()

      try {
        const result = await scanner.scan()
        const duration = Date.now() - startTime

        console.log(`✅ ${type} 扫描完成 (${duration}ms)`)
        console.log(`   📊 发现 ${result.summary.total} 个问题`)
        console.log(`   🔴 严重: ${result.summary.critical}`)
        console.log(`   🟠 高危: ${result.summary.high}`)
        console.log(`   🟡 中危: ${result.summary.medium}`)
        console.log(`   🟢 低危: ${result.summary.low}`)
        console.log('')

        return result
      } catch (error: any) {
        console.error(`❌ ${type} 扫描失败:`, error.message)

        // 返回失败结果
        return this.createFailureResult(type, Date.now() - startTime, error.message)
      }
    })

    const scanResults = await Promise.all(scanPromises)
    results.push(...scanResults)

    // 生成综合报告
    await this.generateReport(results)

    // 输出总体结果
    const overallDuration = Date.now() - overallStartTime
    const overallSummary = this.generateOverallSummary(results)

    console.log('🎉 安全扫描完成!')
    console.log(`⏱️  总用时: ${overallDuration}ms`)
    console.log('')
    console.log('📊 总体统计:')
    console.log(`   🔴 严重: ${overallSummary.critical}`)
    console.log(`   🟠 高危: ${overallSummary.high}`)
    console.log(`   🟡 中危: ${overallSummary.medium}`)
    console.log(`   🟢 低危: ${overallSummary.low}`)
    console.log(`   ✅ 通过: ${overallSummary.passed ? '是' : '否'}`)

    if (this.config.failOnVulnerabilities && !overallSummary.passed) {
      console.log('')
      console.log('❌ 扫描未通过，请修复安全问题后重试')
      process.exit(1)
    }

    return results
  }

  private async generateReport(results: ScanResult[]): Promise<void> {
    const reportPath = join(this.config.reportsDir, 'security-scan-report.json')
    const htmlReportPath = join(this.config.reportsDir, 'security-scan-report.html')

    // 生成JSON报告
    const reportData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      results,
      summary: this.generateOverallSummary(results)
    }

    writeFileSync(reportPath, JSON.stringify(reportData, null, 2))

    // 生成HTML报告
    const htmlReport = this.generateHTMLReport(reportData)
    writeFileSync(htmlReportPath, htmlReport)

    console.log(`📄 报告已生成:`)
    console.log(`   JSON: ${reportPath}`)
    console.log(`   HTML: ${htmlReportPath}`)
  }

  private generateHTMLReport(reportData: any): string {
    const { results, summary } = reportData

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>安全扫描报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .summary { padding: 20px; border-bottom: 1px solid #e5e7eb; }
        .results { padding: 20px; }
        .result-card { margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .result-header { padding: 15px; font-weight: bold; }
        .critical { background: #dc2626; color: white; }
        .high { background: #ea580c; color: white; }
        .medium { background: #d97706; color: white; }
        .low { background: #65a30d; color: white; }
        .passed { background: #16a34a; color: white; }
        .vulnerability { padding: 15px; border-bottom: 1px solid #e5e7eb; }
        .vulnerability:last-child { border-bottom: none; }
        .severity-badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; color: white; }
        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat { text-align: center; flex: 1; }
        .stat-number { font-size: 24px; font-weight: bold; }
        .stat-label { color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 安全扫描报告</h1>
            <p>生成时间: ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary">
            <h2>📊 总体统计</h2>
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">${summary.total}</div>
                    <div class="stat-label">总问题数</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${summary.critical}</div>
                    <div class="stat-label">严重</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${summary.high}</div>
                    <div class="stat-label">高危</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${summary.medium}</div>
                    <div class="stat-label">中危</div>
                </div>
                <div class="stat">
                    <div class="stat-number">${summary.low}</div>
                    <div class="stat-label">低危</div>
                </div>
            </div>
            <p>扫描状态: ${summary.passed ? '✅ 通过' : '❌ 未通过'}</p>
        </div>

        <div class="results">
            <h2>🔍 详细结果</h2>
            ${results.map((result: any) => `
                <div class="result-card">
                    <div class="result-header ${result.summary.passed ? 'passed' : 'critical'}">
                        ${result.type} 扫描
                        <span style="float: right">
                            ${result.summary.total} 个问题 (${result.duration}ms)
                        </span>
                    </div>
                    ${result.vulnerabilities.map((vuln: any) => `
                        <div class="vulnerability">
                            <h4>${vuln.title}</h4>
                            <p>${vuln.description}</p>
                            <span class="severity-badge" style="background: ${this.getSeverityColor(vuln.severity)}">
                                ${vuln.severity.toUpperCase()}
                            </span>
                            ${vuln.path ? `<p><strong>文件:</strong> ${vuln.path}</p>` : ''}
                            <p><strong>建议:</strong> ${vuln.recommendation}</p>
                            ${vuln.references.length > 0 ? `
                                <p><strong>参考:</strong></p>
                                <ul>
                                    ${vuln.references.map((ref: string) => `<li><a href="${ref}" target="_blank">${ref}</a></li>`).join('')}
                                </ul>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        function getSeverityColor(severity) {
            switch (severity) {
                case 'critical': return '#dc2626';
                case 'high': return '#ea580c';
                case 'medium': return '#d97706';
                case 'low': return '#65a30d';
                default: return '#6b7280';
            }
        }
    </script>
</body>
</html>
    `
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#dc2626'
      case 'high': return '#ea580c'
      case 'medium': return '#d97706'
      case 'low': return '#65a30d'
      default: return '#6b7280'
    }
  }

  private generateOverallSummary(results: ScanResult[]): ScanSummary {
    const summary: ScanSummary = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      passed: true
    }

    results.forEach(result => {
      summary.total += result.summary.total
      summary.critical += result.summary.critical
      summary.high += result.summary.high
      summary.medium += result.summary.medium
      summary.low += result.summary.low
      summary.passed = summary.passed && result.summary.passed
    })

    return summary
  }

  private createFailureResult(type: ScanType, duration: number, error: string): ScanResult {
    return {
      type,
      success: false,
      vulnerabilities: [{
        id: `${type}-scan-error`,
        title: `${type} 扫描失败`,
        description: error,
        severity: SeverityLevel.CRITICAL,
        recommendation: '检查扫描工具配置和依赖',
        references: []
      }],
      summary: {
        total: 1,
        critical: 1,
        high: 0,
        medium: 0,
        low: 0,
        passed: false
      },
      duration,
      timestamp: new Date()
    }
  }
}

// 默认配置
const defaultConfig: SecurityConfig = {
  projectRoot: process.cwd(),
  reportsDir: join(process.cwd(), 'reports', 'security'),
  scanTypes: [
    ScanType.DEPENDENCIES,
    ScanType.CODE_SECURITY,
    ScanType.CONFIGURATION,
    ScanType.SECRETS
  ],
  severity: SeverityLevel.MEDIUM,
  excludePatterns: [
    'node_modules/**',
    'coverage/**',
    'dist/**',
    'build/**',
    '.git/**'
  ],
  failOnVulnerabilities: false
}

// 主函数
async function main() {
  const args = process.argv.slice(2)

  // 解析命令行参数
  const config = { ...defaultConfig }

  if (args.includes('--fail-on-vulnerabilities')) {
    config.failOnVulnerabilities = true
  }

  const severityIndex = args.findIndex(arg => arg.startsWith('--severity='))
  if (severityIndex !== -1) {
    const severity = args[severityIndex].split('=')[1] as SeverityLevel
    if (Object.values(SeverityLevel).includes(severity)) {
      config.severity = severity
    }
  }

  const reportsIndex = args.findIndex(arg => arg.startsWith('--reports-dir='))
  if (reportsIndex !== -1) {
    config.reportsDir = args[reportsIndex].split('=')[1]
  }

  // 创建扫描管理器并运行扫描
  const scanner = new SecurityScannerManager(config)
  await scanner.runFullScan()
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('安全扫描失败:', error)
    process.exit(1)
  })
}

export {
  SecurityScannerManager,
  DependencyScanner,
  CodeSecurityScanner,
  ConfigurationScanner,
  SecretsScanner,
  ScanType,
  SeverityLevel,
  type SecurityConfig,
  type ScanResult,
  type Vulnerability
}