#!/usr/bin/env tsx

/**
 * E2E测试CLI工具
 *
 * 提供命令行接口来运行E2E测试
 */

import { e2eTestRunner } from '../utils/test-runner'
import { program } from 'commander'

program
  .name('e2e-cli')
  .description('MindNote E2E测试命令行工具')
  .version('1.0.0')

// 运行所有测试
program
  .command('run-all')
  .description('运行所有E2E测试')
  .option('--headless', '无头模式运行浏览器', false)
  .option('--record-video', '录制测试视频', false)
  .option('--timeout <number>', '测试超时时间（毫秒）', '30000')
  .option('--parallel', '并行运行测试', false)
  .action(async (options) => {
    console.log('🚀 开始运行所有E2E测试...')

    const result = await e2eTestRunner.runAllTests({
      headless: options.headless,
      recordVideo: options.recordVideo,
      timeout: parseInt(options.timeout),
      parallel: options.parallel
    })

    if (result.success) {
      console.log('✅ 所有E2E测试通过')
      process.exit(0)
    } else {
      console.error('❌ 部分E2E测试失败')
      console.error('详细信息:', result.output)
      process.exit(1)
    }
  })

// 运行特定测试套件
program
  .command('run-suite <suite>')
  .description('运行指定的测试套件')
  .argument('<suite>', '测试套件名称（如: auth-flow, note-management, ai-features）')
  .option('--headless', '无头模式运行浏览器', false)
  .option('--record-video', '录制测试视频', false)
  .option('--timeout <number>', '测试超时时间（毫秒）', '30000')
  .action(async (suite, options) => {
    console.log(`🧪 运行测试套件: ${suite}`)

    const result = await e2eTestRunner.runTestSuite(suite, {
      headless: options.headless,
      recordVideo: options.recordVideo,
      timeout: parseInt(options.timeout)
    })

    if (result.success) {
      console.log(`✅ 测试套件 ${suite} 通过`)
      process.exit(0)
    } else {
      console.error(`❌ 测试套件 ${suite} 失败`)
      console.error('详细信息:', result.output)
      process.exit(1)
    }
  })

// 运行特定测试场景
program
  .command('run-scenario <scenario>')
  .description('运行指定的测试场景')
  .argument('<scenario>', '测试场景名称')
  .option('--headless', '无头模式运行浏览器', false)
  .option('--record-video', '录制测试视频', false)
  .option('--timeout <number>', '测试超时时间（毫秒）', '30000')
  .action(async (scenario, options) => {
    console.log(`🎯 运行测试场景: ${scenario}`)

    const result = await e2eTestRunner.runTestScenario(scenario, {
      headless: options.headless,
      recordVideo: options.recordVideo,
      timeout: parseInt(options.timeout)
    })

    if (result.success) {
      console.log(`✅ 测试场景 ${scenario} 通过`)
      process.exit(0)
    } else {
      console.error(`❌ 测试场景 ${scenario} 失败`)
      console.error('详细信息:', result.output)
      process.exit(1)
    }
  })

// 验证测试环境
program
  .command('validate')
  .description('验证E2E测试环境配置')
  .action(async () => {
    console.log('🔍 验证E2E测试环境...')

    const validation = await e2eTestRunner.validateEnvironment()

    if (validation.valid) {
      console.log('✅ 测试环境验证通过')
      process.exit(0)
    } else {
      console.error('❌ 测试环境验证失败:')
      validation.issues.forEach(issue => console.error(`  - ${issue}`))
      process.exit(1)
    }
  })

// 清理测试数据
program
  .command('cleanup')
  .description('清理E2E测试数据和报告')
  .action(async () => {
    console.log('🧹 清理E2E测试数据...')

    await e2eTestRunner.cleanupTestData()
    console.log('✅ 清理完成')
  })

// 列出可用的测试套件
program
  .command('list-suites')
  .description('列出所有可用的测试套件')
  .action(() => {
    console.log('📋 可用的测试套件:')
    console.log('  • auth-flow - 用户认证流程测试')
    console.log('  • note-management - 笔记管理功能测试')
    console.log('  • ai-features - AI功能测试')
    console.log('  • search - 搜索功能测试')
    console.log('  • tags - 标签管理测试')
    console.log('  • notifications - 通知功能测试')
    console.log('  • responsive - 响应式设计测试')
    console.log('  • performance - 性能测试')
  })

// 显示帮助信息
program
  .command('help')
  .description('显示帮助信息')
  .action(() => {
    program.outputHelp()
  })

// 解析命令行参数
program.parse()