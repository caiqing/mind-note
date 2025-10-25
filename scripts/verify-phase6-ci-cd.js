#!/usr/bin/env node

/**
 * Phase 6 CI/CD流水线配置验证脚本
 * 验证CI/CD相关文件和功能的完整性
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Phase 6 CI/CD流水线配置验证')
console.log('=====================================\n')

// 验证结果
const results = {
  passed: 0,
  failed: 0,
  details: []
}

// 验证函数
function verify(name, condition, details = '') {
  if (condition) {
    console.log(`✅ ${name}`)
    results.passed++
    if (details) results.details.push(`✅ ${name}: ${details}`)
  } else {
    console.log(`❌ ${name}`)
    results.failed++
    if (details) results.details.push(`❌ ${name}: ${details}`)
  }
}

// 验证GitHub Actions工作流文件
console.log('📋 检查GitHub Actions工作流文件...')

const workflowFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
  '.github/workflows/security-scan.yml'
]

workflowFiles.forEach(file => {
  verify(
    `工作流文件: ${file}`,
    fs.existsSync(file),
    `${file} 存在`
  )

  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8')
    verify(
      `工作流 ${file} 包含必需字段`,
      content.includes('name:') && content.includes('on:') && content.includes('jobs:'),
      '包含name、on和jobs字段'
    )
  }
})

// 验证CI/CD模块文件
console.log('\n📦 检查CI/CD模块文件...')

const moduleFiles = [
  'src/lib/ci/ci-config-validator.ts',
  'src/lib/ci/github-actions-runner.ts',
  'src/lib/ci/test-config-manager.ts',
  'src/lib/ci/test-executor.ts',
  'src/lib/ci/test-cli.ts'
]

moduleFiles.forEach(file => {
  verify(
    `CI/CD模块: ${file}`,
    fs.existsSync(file),
    `${file} 存在`
  )

  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8')
    verify(
      `模块 ${file} 包含导出`,
      content.includes('export'),
      '包含export语句'
    )
  }
})

// 验证测试文件
console.log('\n🧪 检查CI/CD测试文件...')

const testFiles = [
  'tests/unit/ci/ci-config.test.ts',
  'tests/unit/ci/github-actions.test.ts'
]

testFiles.forEach(file => {
  verify(
    `测试文件: ${file}`,
    fs.existsSync(file),
    `${file} 存在`
  )

  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8')
    verify(
      `测试文件 ${file} 包含测试用例`,
      content.includes('describe(') && content.includes('it('),
      '包含describe和it测试用例'
    )
  }
})

// 验证CI工作流配置
console.log('\n⚙️ 检查CI工作流配置...')

if (fs.existsSync('.github/workflows/ci.yml')) {
  const ciContent = fs.readFileSync('.github/workflows/ci.yml', 'utf8')

  verify(
    'CI工作流包含代码质量检查',
    ciContent.includes('lint') || ciContent.includes('ESLint'),
    '包含lint或ESLint步骤'
  )

  verify(
    'CI工作流包含单元测试',
    ciContent.includes('test') && ciContent.includes('npm run test'),
    '包含单元测试步骤'
  )

  verify(
    'CI工作流包含构建步骤',
    ciContent.includes('build') && ciContent.includes('npm run build'),
    '包含构建步骤'
  )

  verify(
    'CI工作流包含覆盖率报告',
    ciContent.includes('codecov') || ciContent.includes('coverage'),
    '包含覆盖率报告'
  )
}

// 验证部署工作流配置
console.log('\n🚀 检查部署工作流配置...')

if (fs.existsSync('.github/workflows/deploy.yml')) {
  const deployContent = fs.readFileSync('.github/workflows/deploy.yml', 'utf8')

  verify(
    '部署工作流包含Docker构建',
    deployContent.includes('docker') && deployContent.includes('build'),
    '包含Docker构建步骤'
  )

  verify(
    '部署工作流包含环境配置',
    deployContent.includes('environment') || deployContent.includes('staging') || deployContent.includes('production'),
    '包含环境配置'
  )

  verify(
    '部署工作流包含健康检查',
    deployContent.includes('health') || deployContent.includes('curl'),
    '包含健康检查步骤'
  )
}

// 验证安全扫描工作流配置
console.log('\n🔒 检查安全扫描工作流配置...')

if (fs.existsSync('.github/workflows/security-scan.yml')) {
  const securityContent = fs.readFileSync('.github/workflows/security-scan.yml', 'utf8')

  verify(
    '安全扫描包含依赖检查',
    securityContent.includes('npm audit') || securityContent.includes('snyk'),
    '包含依赖漏洞扫描'
  )

  verify(
    '安全扫描包含代码扫描',
    securityContent.includes('codeql') || securityContent.includes('semgrep'),
    '包含代码安全扫描'
  )

  verify(
    '安全扫描包含容器扫描',
    securityContent.includes('trivy') || securityContent.includes('grype'),
    '包含容器安全扫描'
  )
}

// 验证测试配置管理器
console.log('\n📊 检查测试配置管理器...')

if (fs.existsSync('src/lib/ci/test-config-manager.ts')) {
  const configManagerContent = fs.readFileSync('src/lib/ci/test-config-manager.ts', 'utf8')

  verify(
    '测试配置管理器包含环境配置',
    configManagerContent.includes('TestEnvironment') && configManagerContent.includes('environments'),
    '包含TestEnvironment接口和环境配置'
  )

  verify(
    '测试配置管理器包含测试套件配置',
    configManagerContent.includes('TestSuite') && configManagerContent.includes('suites'),
    '包含TestSuite接口和套件配置'
  )

  verify(
    '测试配置管理器包含配置验证',
    configManagerContent.includes('validateConfig'),
    '包含配置验证方法'
  )
}

// 验证测试执行器
console.log('\n🏃 检查测试执行器...')

if (fs.existsSync('src/lib/ci/test-executor.ts')) {
  const executorContent = fs.readFileSync('src/lib/ci/test-executor.ts', 'utf8')

  verify(
    '测试执行器包含执行方法',
    executorContent.includes('executeTestSuite') && executorContent.includes('executeEnvironmentTests'),
    '包含测试执行方法'
  )

  verify(
    '测试执行器包含并行执行',
    executorContent.includes('parallel') || executorContent.includes('concurrency'),
    '支持并行执行'
  )

  verify(
    '测试执行器包含结果报告',
    executorContent.includes('TestExecutionResult') && executorContent.includes('coverage'),
    '包含结果报告和覆盖率'
  )
}

// 验证CLI工具
console.log('\n💻 检查CLI工具...')

if (fs.existsSync('src/lib/ci/test-cli.ts')) {
  const cliContent = fs.readFileSync('src/lib/ci/test-cli.ts', 'utf8')

  verify(
    'CLI工具包含基本命令',
    cliContent.includes('run') && cliContent.includes('pipeline') && cliContent.includes('list'),
    '包含run、pipeline、list等基本命令'
  )

  verify(
    'CLI工具包含配置管理',
    cliContent.includes('validate') && cliContent.includes('init'),
    '包含配置验证和初始化命令'
  )

  verify(
    'CLI工具包含状态检查',
    cliContent.includes('status') || cliContent.includes('check'),
    '包含状态检查功能'
  )
}

// 检查package.json中的相关脚本
console.log('\n📦 检查package.json脚本...')

if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

  const requiredScripts = [
    'test:unit',
    'test:integration',
    'test:e2e',
    'lint',
    'type-check',
    'build'
  ]

  requiredScripts.forEach(script => {
    verify(
      `npm脚本: ${script}`,
      packageJson.scripts && packageJson.scripts[script],
      `${script} 脚本已定义`
    )
  })
}

// 检查依赖包
console.log('\n📚 检查相关依赖包...')

if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

  const requiredPackages = [
    'vitest',
    'typescript',
    'eslint',
    'prettier'
  ]

  requiredPackages.forEach(pkg => {
    const hasPkg = (packageJson.dependencies && packageJson.dependencies[pkg]) ||
                   (packageJson.devDependencies && packageJson.devDependencies[pkg])

    verify(
      `依赖包: ${pkg}`,
      hasPkg,
      `${pkg} 已安装`
    )
  })
}

// 输出验证结果摘要
console.log('\n📈 验证结果摘要')
console.log('==================')
console.log(`✅ 通过: ${results.passed}`)
console.log(`❌ 失败: ${results.failed}`)
console.log(`📊 成功率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`)

if (results.failed > 0) {
  console.log('\n❌ 失败详情:')
  results.details.filter(detail => detail.startsWith('❌')).forEach(detail => {
    console.log(`  ${detail}`)
  })
  console.log('\n🔧 请修复上述问题后重新运行验证')
  process.exit(1)
} else {
  console.log('\n🎉 Phase 6 CI/CD流水线配置验证通过！')
  console.log('\n📋 已完成的功能:')
  console.log('  ✅ CI/CD配置文件验证器')
  console.log('  ✅ GitHub Actions工作流测试')
  console.log('  ✅ CI流水线配置 (代码质量、测试、构建、部署)')
  console.log('  ✅ 安全扫描工作流配置')
  console.log('  ✅ 多环境自动化测试配置')
  console.log('  ✅ 测试执行器和CLI工具')
  console.log('\n🚀 准备进入Phase 7: AI服务集成开发')
}