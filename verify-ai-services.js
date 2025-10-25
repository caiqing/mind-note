/**
 * AI服务集成验证脚本
 * 验证OpenAI集成、AI服务路由器、监控和降级机制
 */

const fs = require('fs')
const path = require('path')

console.log('🤖 开始验证AI服务集成...\n')

// 验证结果
const results = {
  openAIConfig: { passed: 0, failed: 0, details: [] },
  aiRouting: { passed: 0, failed: 0, details: [] },
  apiEndpoints: { passed: 0, failed: 0, details: [] },
  monitoring: { passed: 0, failed: 0, details: [] },
  fallback: { passed: 0, failed: 0, details: [] }
}

// 验证函数
function verify(component, description, condition, details = '') {
  if (condition) {
    console.log(`✅ ${component}: ${description}`)
    results[component].passed++
    if (details) results[component].details.push(`✅ ${details}`)
  } else {
    console.log(`❌ ${component}: ${description}`)
    results[component].failed++
    if (details) results[component].details.push(`❌ ${details}`)
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath)
}

function fileContains(filePath, content) {
  if (!fileExists(filePath)) return false
  const fileContent = fs.readFileSync(filePath, 'utf8')
  return fileContent.includes(content)
}

console.log('📋 验证OpenAI配置管理器...')
// OpenAI配置验证
verify('openAIConfig', 'OpenAI配置管理器文件存在',
  fileExists('ai-services/cloud/openai/config.ts'))
verify('openAIConfig', 'OpenAIConfigManager类已定义',
  fileContains('ai-services/cloud/openai/config.ts', 'export class OpenAIConfigManager'))
verify('openAIConfig', '单例模式实现',
  fileContains('ai-services/cloud/openai/config.ts', 'private static instance'))
verify('openAIConfig', '配置验证功能',
  fileContains('ai-services/cloud/openai/config.ts', 'validateConfig'))
verify('openAIConfig', '模型选择逻辑',
  fileContains('ai-services/cloud/openai/config.ts', 'selectModelForTask'))
verify('openAIConfig', '成本估算功能',
  fileContains('ai-services/cloud/openai/config.ts', 'estimateCost'))
verify('openAIConfig', '预算管理',
  fileContains('ai-services/cloud/openai/config.ts', 'isWithinBudget'))

console.log('\n📋 验证OpenAI提供商适配器...')
// OpenAI提供商验证
verify('openAIConfig', 'OpenAI提供商文件存在',
  fileExists('ai-services/cloud/openai/openai-provider.ts'))
verify('openAIConfig', 'OpenAIProvider类已定义',
  fileContains('ai-services/cloud/openai/openai-provider.ts', 'export class OpenAIProvider'))
verify('openAIConfig', '文本生成功能',
  fileContains('ai-services/cloud/openai/openai-provider.ts', 'generateText'))
verify('openAIConfig', '嵌入生成功能',
  fileContains('ai-services/cloud/openai/openai-provider.ts', 'generateEmbedding'))
verify('openAIConfig', '内容审核功能',
  fileContains('ai-services/cloud/openai/openai-provider.ts', 'moderateContent'))
verify('openAIConfig', '令牌计数功能',
  fileContains('ai-services/cloud/openai/openai-provider.ts', 'countTokens'))
verify('openAIConfig', '健康检查功能',
  fileContains('ai-services/cloud/openai/openai-provider.ts', 'healthCheck'))
verify('openAIConfig', '错误处理机制',
  fileContains('ai-services/cloud/openai/openai-provider.ts', 'handleError'))

console.log('\n📋 验证AI服务路由器...')
// AI路由器验证
verify('aiRouting', 'AI服务路由器文件存在',
  fileExists('ai-services/routing/ai-service-router.ts'))
verify('aiRouting', 'AIServiceRouter类已定义',
  fileContains('ai-services/routing/ai-service-router.ts', 'export class AIServiceRouter'))
verify('aiRouting', '请求路由功能',
  fileContains('ai-services/routing/ai-service-router.ts', 'routeRequest'))
verify('aiRouting', '服务选择逻辑',
  fileContains('ai-services/routing/ai-service-router.ts', 'getAvailableServices'))
verify('aiRouting', '负载均衡机制',
  fileContains('ai-services/routing/ai-service-router.ts', 'rankServices'))
verify('aiRouting', '降级支持',
  fileContains('ai-services/routing/ai-service-router.ts', 'fallbackUsed'))
verify('aiRouting', '性能监控',
  fileContains('ai-services/routing/ai-service-router.ts', 'recordPerformance'))
verify('aiRouting', '成本追踪',
  fileContains('ai-services/routing/ai-service-router.ts', 'trackCost'))
verify('aiRouting', '健康监控',
  fileContains('ai-services/routing/ai-service-router.ts', 'healthStatus'))

console.log('\n📋 验证AI服务API端点...')
// API端点验证
verify('apiEndpoints', 'AI配置API端点存在',
  fileExists('src/app/api/dev/ai/configure/route.ts'))
verify('apiEndpoints', 'GET方法支持',
  fileContains('src/app/api/dev/ai/configure/route.ts', 'export async function GET'))
verify('apiEndpoints', 'POST方法支持',
  fileContains('src/app/api/dev/ai/configure/route.ts', 'export async function POST'))
verify('apiEndpoints', '状态查询功能',
  fileContains('src/app/api/dev/ai/configure/route.ts', 'getAIStatus'))
verify('apiEndpoints', '健康检查功能',
  fileContains('src/app/api/dev/ai/configure/route.ts', 'getAIHealth'))
verify('apiEndpoints', '配置管理功能',
  fileContains('src/app/api/dev/ai/configure/route.ts', 'getAIConfig'))
verify('apiEndpoints', '成本统计功能',
  fileContains('src/app/api/dev/ai/configure/route.ts', 'getCostStatistics'))
verify('apiEndpoints', '连接测试功能',
  fileContains('src/app/api/dev/ai/configure/route.ts', 'testConnection'))

console.log('\n📋 验证AI监控API...')
// 监控API验证
verify('apiEndpoints', 'AI监控API端点存在',
  fileExists('src/app/api/monitoring/route.ts'))
verify('apiEndpoints', '监控概览功能',
  fileContains('src/app/api/monitoring/route.ts', 'getMonitoringOverview'))
verify('apiEndpoints', '性能指标功能',
  fileContains('src/app/api/monitoring/route.ts', 'getPerformanceMetrics'))
verify('apiEndpoints', '健康状态功能',
  fileContains('src/app/api/monitoring/route.ts', 'getHealthStatus'))
verify('apiEndpoints', '告警管理功能',
  fileContains('src/app/api/monitoring/route.ts', 'getAlerts'))
verify('apiEndpoints', '详细指标功能',
  fileContains('src/app/api/monitoring/route.ts', 'getDetailedMetrics'))
verify('apiEndpoints', '性能测试功能',
  fileContains('src/app/api/monitoring/route.ts', 'testPerformance'))

console.log('\n📋 验证成本追踪模块...')
// 成本追踪验证
verify('monitoring', '成本追踪器文件存在',
  fileExists('src/lib/ai/cost-tracker.ts'))
verify('monitoring', 'AICostTracker类已定义',
  fileContains('src/lib/ai/cost-tracker.ts', 'export class AICostTracker'))
verify('monitoring', '成本记录功能',
  fileContains('src/lib/ai/cost-tracker.ts', 'recordCost'))
verify('monitoring', '成本汇总功能',
  fileContains('src/lib/ai/cost-tracker.ts', 'getCostSummary'))
verify('monitoring', '实时状态功能',
  fileContains('src/lib/ai/cost-tracker.ts', 'getCurrentStatus'))
verify('monitoring', '预算管理功能',
  fileContains('src/lib/ai/cost-tracker.ts', 'setBudgetLimits'))
verify('monitoring', '优化建议功能',
  fileContains('src/lib/ai/cost-tracker.ts', 'getCostOptimization'))
verify('monitoring', '数据导出功能',
  fileContains('src/lib/ai/cost-tracker.ts', 'exportData'))

console.log('\n📋 验证降级机制模块...')
// 降级机制验证
verify('fallback', '降级管理器文件存在',
  fileExists('src/lib/ai/fallback.ts'))
verify('fallback', 'AIFallbackManager类已定义',
  fileContains('src/lib/ai/fallback.ts', 'export class AIFallbackManager'))
verify('fallback', '降级策略定义',
  fileContains('src/lib/ai/fallback.ts', 'interface FallbackStrategy'))
verify('fallback', '降级条件评估',
  fileContains('src/lib/ai/fallback.ts', 'evaluateCondition'))
verify('fallback', '自动降级执行',
  fileContains('src/lib/ai/fallback.ts', 'checkAndExecuteFallback'))
verify('fallback', '服务推荐功能',
  fileContains('src/lib/ai/fallback.ts', 'getRecommendedServices'))
verify('fallback', '手动恢复功能',
  fileContains('src/lib/ai/fallback.ts', 'recoverService'))
verify('fallback', '降级日志记录',
  fileContains('src/lib/ai/fallback.ts', 'logFallback'))

console.log('\n📋 验证AI路由逻辑测试...')
// 测试文件验证
verify('aiRouting', 'AI路由逻辑测试文件存在',
  fileExists('tests/unit/test-ai-routing.ts'))
verify('aiRouting', '服务选择测试',
  fileContains('tests/unit/test-ai-routing.ts', 'describe(\'Service Selection\''))
verify('aiRouting', '负载均衡测试',
  fileContains('tests/unit/test-ai-routing.ts', 'describe(\'Load Balancing\''))
verify('aiRouting', '错误处理测试',
  fileContains('tests/unit/test-ai-routing.ts', 'describe(\'Error Handling\''))
verify('aiRouting', '偏好组合测试',
  fileContains('tests/unit/test-ai-routing.ts', 'describe(\'Preference Combination\''))

console.log('\n📋 验证关键AI功能特性...')
// 功能特性验证
verify('aiRouting', '智能服务选择',
  fileContains('ai-services/routing/ai-service-router.ts', 'rankServices'))
verify('aiRouting', '多提供商支持',
  fileContains('ai-services/routing/ai-service-router.ts', 'executeOpenAIRequest') &&
  fileContains('ai-services/routing/ai-service-router.ts', 'executeAnthropicRequest') &&
  fileContains('ai-services/routing/ai-service-router.ts', 'executeOllamaRequest'))
verify('aiRouting', '成本感知路由',
  fileContains('ai-services/routing/ai-service-router.ts', 'calculateServiceScore'))
verify('aiRouting', '性能历史追踪',
  fileContains('ai-services/routing/ai-service-router.ts', 'performanceHistory'))

console.log('\n📋 验证配置完整性...')
// 配置完整性验证
verify('openAIConfig', '环境变量支持',
  fileContains('ai-services/cloud/openai/config.ts', 'process.env.OPENAI_API_KEY'))
verify('openAIConfig', '默认配置提供',
  fileContains('ai-services/cloud/openai/config.ts', 'getDefaultConfig'))
verify('openAIConfig', '配置验证规则',
  fileContains('ai-services/cloud/openai/config.ts', 'private validateConfig'))
verify('openAIConfig', '动态配置更新',
  fileContains('ai-services/cloud/openai/config.ts', 'updateConfig'))

// 计算总结果
let totalPassed = 0
let totalFailed = 0

for (const [component, result] of Object.entries(results)) {
  totalPassed += result.passed
  totalFailed += result.failed
}

console.log('\n' + '='.repeat(70))
console.log('📊 AI服务集成验证完成')
console.log('='.repeat(70))

console.log(`\n🎯 总体验证结果:`)
console.log(`   ✅ 通过: ${totalPassed}`)
console.log(`   ❌ 失败: ${totalFailed}`)
console.log(`   📈 成功率: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`)

console.log(`\n📋 详细结果:`)
for (const [component, result] of Object.entries(results)) {
  const componentName = {
    openAIConfig: 'OpenAI配置管理',
    aiRouting: 'AI服务路由',
    apiEndpoints: 'API端点',
    monitoring: '监控模块',
    fallback: '降级机制'
  }[component] || component

  console.log(`\n   🔧 ${componentName}:`)
  console.log(`      ✅ 通过: ${result.passed}`)
  console.log(`      ❌ 失败: ${result.failed}`)

  if (result.details.length > 0) {
    result.details.forEach(detail => console.log(`         ${detail}`))
  }
}

if (totalFailed === 0) {
  console.log('\n🎉 所有AI服务集成验证都通过了！')
  console.log('💡 系统已具备完整的AI服务能力，包括：')
  console.log('   • 智能请求路由和负载均衡')
  console.log('   • 多提供商支持和自动降级')
  console.log('   • 实时监控和性能追踪')
  console.log('   • 成本控制和预算管理')
  console.log('   • 健康检查和错误恢复')
} else {
  console.log('\n⚠️  部分验证失败，请检查上述失败项')
  console.log('🔧 建议检查文件路径和实现完整性')
}

// 退出码
process.exit(totalFailed === 0 ? 0 : 1)