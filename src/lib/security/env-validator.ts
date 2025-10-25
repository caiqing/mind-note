/**
 * 环境变量安全验证工具
 *
 * 验证环境变量的安全性并提供改进建议
 */

interface ValidationResult {
  isValid: boolean
  issues: SecurityIssue[]
  score: number
  recommendations: string[]
}

interface SecurityIssue {
  type: 'critical' | 'high' | 'medium' | 'low'
  variable: string
  message: string
  suggestion: string
}

export class EnvironmentValidator {
  private static readonly CRITICAL_PATTERNS = [
    { pattern: /(password|secret|key)\s*=\s*['"]?['"]?$/i, message: '密码或密钥为空' },
    { pattern: /(password|secret|key)\s*=\s*['"]?(test|dev|example|demo)['"]?$/i, message: '使用了测试/示例密码' },
    { pattern: /(password|secret|key)\s*=\s*['"]?(123|password|admin|root)['"]?$/i, message: '使用了弱密码' },
    { pattern: /(api[_-]?key)\s*=\s*['"]?(sk-example|sk-ant-example)['"]?$/i, message: '使用了示例API密钥' },
    { pattern: /(secret)\s*=\s*['"]?[^'" ]{1,31}['"]?$/i, message: '密钥长度不足32位' }
  ]

  private static readonly HIGH_RISK_PATTERNS = [
    { pattern: /(cors[_-]?origin)\s*=\s*['"]?\*['"]?$/i, message: 'CORS配置过于宽松' },
    { pattern: /(node[_-]?env)\s*=\s*['"]?production['"]?$/i, message: '在生产环境文件中发现生产环境标识' }
  ]

  private static readonly MEDIUM_RISK_PATTERNS = [
    { pattern: /(log[_-]?level)\s*=\s*['"]?debug['"]?$/i, message: '生产环境不建议使用debug日志级别' },
    { pattern: /(database[_-]?url)\s*=\s*['"]?[^:\s]*:(?!\/\/).*@/i, message: '数据库密码可能直接暴露在连接字符串中' }
  ]

  static validateEnvironment(envContent: string): ValidationResult {
    const issues: SecurityIssue[] = []
    const recommendations: string[] = []
    let totalScore = 100

    // 检查Critical级别问题
    this.CRITICAL_PATTERNS.forEach(({ pattern, message, suggestion }) => {
      const matches = envContent.match(pattern)
      if (matches) {
        issues.push({
          type: 'critical',
          variable: matches[0] || 'unknown',
          message,
          suggestion: suggestion || '请使用强密码或随机生成的密钥'
        })
        totalScore -= 25
      }
    })

    // 检查High级别问题
    this.HIGH_RISK_PATTERNS.forEach(({ pattern, message, suggestion }) => {
      const matches = envContent.match(pattern)
      if (matches) {
        issues.push({
          type: 'high',
          variable: matches[0] || 'unknown',
          message,
          suggestion: suggestion || '请限制访问范围或使用具体域名'
        })
        totalScore -= 15
      }
    })

    // 检查Medium级别问题
    this.MEDIUM_RISK_PATTERNS.forEach(({ pattern, message, suggestion }) => {
      const matches = envContent.match(pattern)
      if (matches) {
        issues.push({
          type: 'medium',
          variable: matches[0] || 'unknown',
          message,
          suggestion: suggestion || '请根据环境调整配置'
        })
        totalScore -= 8
      }
    })

    // 生成建议
    if (issues.length > 0) {
      recommendations.push('运行 `node scripts/generate-secrets.js` 生成安全密钥')
      recommendations.push('使用 `.env.local.template` 作为配置模板')
      recommendations.push('确保 `.env.local` 文件已添加到 `.gitignore`')
    }

    // 检查文件安全性
    if (envContent.includes('sk-') && envContent.includes('example')) {
      recommendations.push('移除所有示例API密钥，配置真实的AI服务提供商')
    }

    // 检查数据库配置
    if (!envContent.includes('ssl') && envContent.includes('DATABASE_URL')) {
      recommendations.push('生产环境数据库连接应启用SSL')
    }

    return {
      isValid: issues.filter(i => i.type === 'critical').length === 0,
      issues,
      score: Math.max(0, totalScore),
      recommendations
    }
  }

  static generateSecurityReport(envContent: string): string {
    const result = this.validateEnvironment(envContent)

    let report = '# 🔒 环境变量安全审查报告\n\n'

    report += `## 安全评分: ${result.score}/100\n\n`

    if (result.issues.length === 0) {
      report += '✅ **未发现安全问题**\n\n'
      report += '您的环境变量配置看起来是安全的。请继续保持良好的安全实践！\n'
      return report
    }

    // 按严重程度分组
    const criticalIssues = result.issues.filter(i => i.type === 'critical')
    const highIssues = result.issues.filter(i => i.type === 'high')
    const mediumIssues = result.issues.filter(i => i.type === 'medium')

    if (criticalIssues.length > 0) {
      report += '## 🚨 Critical 级别问题\n\n'
      criticalIssues.forEach(issue => {
        report += `- **${issue.variable}**: ${issue.message}\n`
        report += `  - 建议: ${issue.suggestion}\n\n`
      })
    }

    if (highIssues.length > 0) {
      report += '## ⚠️ High 级别问题\n\n'
      highIssues.forEach(issue => {
        report += `- **${issue.variable}**: ${issue.message}\n`
        report += `  - 建议: ${issue.suggestion}\n\n`
      })
    }

    if (mediumIssues.length > 0) {
      report += '## ⚡ Medium 级别问题\n\n'
      mediumIssues.forEach(issue => {
        report += `- **${issue.variable}**: ${issue.message}\n`
        report += `  - 建议: ${issue.suggestion}\n\n`
      })
    }

    report += '## 🛠️ 修复建议\n\n'
    result.recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`
    })

    report += '\n## 📋 安全最佳实践\n\n'
    report += '1. 使用强密码 (至少32位，包含大小写字母、数字和特殊字符)\n'
    report += '2. 定期轮换密钥和API密钥\n'
    report += '3. 使用环境变量管理服务\n'
    report += '4. 启用数据库SSL连接\n'
    report += '5. 限制CORS访问范围\n'
    report += '6. 在生产环境中禁用debug日志\n'

    return report
  }

  static async checkEnvironmentFile(filePath: string): Promise<ValidationResult> {
    try {
      const fs = await import('fs/promises')
      const content = await fs.readFile(filePath, 'utf-8')
      return this.validateEnvironment(content)
    } catch (error) {
      return {
        isValid: false,
        issues: [{
          type: 'critical',
          variable: 'file_access',
          message: '无法读取环境变量文件',
          suggestion: '请检查文件路径和权限'
        }],
        score: 0,
        recommendations: ['确保环境变量文件存在且可读']
      }
    }
  }
}

// 导出默认验证器实例
export const envValidator = EnvironmentValidator