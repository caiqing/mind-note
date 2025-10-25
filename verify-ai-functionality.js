#!/usr/bin/env node

/**
 * AI功能完整性验证脚本
 * 验证AI服务集成的基础架构和验收标准
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始AI功能完整性验证...\n');

// 定义检查项目
const checks = [
  {
    name: 'AI配置管理器',
    file: 'src/lib/ai/ai-config.ts',
    checks: [
      { pattern: 'class AIConfigManager', description: 'AI配置管理器类' },
      { pattern: 'getInstance', description: '单例模式实现' },
      { pattern: 'loadProvidersFromEnv', description: '环境变量加载' },
      { pattern: 'costLimits', description: '成本限制配置' },
      { pattern: 'fallbackOrder', description: 'fallback提供商顺序' }
    ]
  },
  {
    name: 'AI服务基础类',
    file: 'src/lib/ai/services/base-service.ts',
    checks: [
      { pattern: 'class BaseAIService', description: 'AI服务基类' },
      { pattern: 'validateInput', description: '输入验证方法' },
      { pattern: 'executeWithRetry', description: '重试机制' },
      { pattern: 'calculateCost', description: '成本计算方法' },
      { pattern: 'checkUserBudget', description: '预算检查方法' }
    ]
  },
  {
    name: 'AI日志系统',
    file: 'src/lib/ai/services/logger.ts',
    checks: [
      { pattern: 'class AIServiceLogger', description: 'AI日志记录器' },
      { pattern: 'getInstance', description: '单例模式' },
      { pattern: 'LogLevel', description: '日志级别枚举' },
      { pattern: 'LogEntry', description: '日志条目接口' }
    ]
  },
  {
    name: 'AI类型定义',
    file: 'src/types/ai-analysis.ts',
    checks: [
      { pattern: 'AnalysisResult', description: '分析结果类型' },
      { pattern: 'AnalysisOptions', description: '分析选项类型' },
      { pattern: 'ClassificationResult', description: '分类结果类型' },
      { pattern: 'SentimentResult', description: '情感分析结果类型' },
      { pattern: 'ANALYSIS_TYPES', description: '分析类型常量' },
      { pattern: 'CONTENT_CATEGORIES', description: '内容分类常量' }
    ]
  },
  {
    name: 'AI提供商配置',
    file: 'src/lib/ai/ai-config.ts',
    checks: [
      { pattern: 'OPENAI_API_KEY', description: 'OpenAI配置' },
      { pattern: 'ANTHROPIC_API_KEY', description: 'Anthropic配置' },
      { pattern: 'ZHIPU_API_KEY', description: '智谱AI配置' },
      { pattern: 'OLLAMA_BASE_URL', description: 'Ollama本地配置' },
      { pattern: 'maxCostPerNote', description: '单次成本限制' },
      { pattern: 'dailyBudget', description: '日预算配置' }
    ]
  }
];

// 定义验收标准
const acceptanceCriteria = {
  summaryQuality: {
    name: '摘要质量评分',
    threshold: 4.0,
    unit: '/5.0',
    status: 'defined'
  },
  keywordAccuracy: {
    name: '关键词提取准确率',
    threshold: 90,
    unit: '%',
    status: 'defined'
  },
  sentimentAccuracy: {
    name: '情感分析准确率',
    threshold: 85,
    unit: '%',
    status: 'defined'
  },
  responseTime: {
    name: '平均响应时间',
    threshold: 3000,
    unit: 'ms',
    status: 'defined'
  },
  concurrencySupport: {
    name: '并发支持',
    threshold: 20,
    unit: 'requests',
    status: 'defined'
  }
};

let totalChecks = 0;
let passedChecks = 0;

// 执行检查
function checkFile(checkItem) {
  console.log(`\n📁 检查 ${checkItem.name}:`);

  if (!fs.existsSync(checkItem.file)) {
    console.log(`❌ 文件不存在: ${checkItem.file}`);
    return false;
  }

  const content = fs.readFileSync(checkItem.file, 'utf8');
  let filePassed = 0;

  checkItem.checks.forEach(check => {
    totalChecks++;
    if (content.includes(check.pattern)) {
      console.log(`  ✅ ${check.description}`);
      filePassed++;
    } else {
      console.log(`  ❌ ${check.description} (缺少: ${check.pattern})`);
    }
  });

  const fileRate = (filePassed / checkItem.checks.length) * 100;
  console.log(`  📊 通过率: ${filePassed}/${checkItem.checks.length} (${fileRate.toFixed(1)}%)`);

  if (fileRate === 100) {
    passedChecks += checkItem.checks.length;
    return true;
  }

  return false;
}

// 检查AI服务文件结构
function checkAIStructure() {
  console.log('\n🏗️  AI服务文件结构检查:');

  const aiFiles = [
    'src/lib/ai/ai-config.ts',
    'src/lib/ai/services/base-service.ts',
    'src/lib/ai/services/logger.ts',
    'src/lib/ai/services/summary-service.ts',
    'src/lib/ai/services/keyword-service.ts',
    'src/lib/ai/services/sentiment-service.ts',
    'src/lib/ai/services/concept-service.ts',
    'src/lib/ai/services/ai-service-manager.ts',
    'src/lib/ai/providers/openai-provider.ts',
    'src/lib/ai/providers/claude-provider.ts',
    'src/types/ai-analysis.ts'
  ];

  let existingFiles = 0;
  aiFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
      existingFiles++;
    } else {
      console.log(`  ❌ ${file} (缺失)`);
    }
  });

  const structureRate = (existingFiles / aiFiles.length) * 100;
  console.log(`  📊 文件完整性: ${existingFiles}/${aiFiles.length} (${structureRate.toFixed(1)}%)`);

  return structureRate >= 80; // 80%以上认为通过
}

// 检查测试覆盖
function checkTestCoverage() {
  console.log('\n🧪 AI功能测试覆盖检查:');

  const testFiles = [
    'tests/ai/ai-quality-assessment.test.ts',
    'tests/ai/basic-ai-functionality.test.ts'
  ];

  let existingTests = 0;
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
      existingTests++;
    } else {
      console.log(`  ❌ ${file} (缺失)`);
    }
  });

  const testRate = (existingTests / testFiles.length) * 100;
  console.log(`  📊 测试覆盖: ${existingTests}/${testFiles.length} (${testRate.toFixed(1)}%)`);

  return testRate >= 50; // 50%以上认为通过
}

// 显示验收标准
function showAcceptanceCriteria() {
  console.log('\n🎯 AI功能验收标准:');

  Object.entries(acceptanceCriteria).forEach(([key, criteria]) => {
    const status = criteria.status === 'defined' ? '✅' : '❌';
    console.log(`  ${status} ${criteria.name}: ${criteria.threshold}${criteria.unit}`);
  });
}

// 主函数
function main() {
  let passedGroups = 0;

  // 执行所有检查
  checks.forEach(check => {
    if (checkFile(check)) {
      passedGroups++;
    }
  });

  // 检查文件结构
  const structureOk = checkAIStructure();
  if (structureOk) passedGroups++;

  // 检查测试覆盖
  const testOk = checkTestCoverage();
  if (testOk) passedGroups++;

  // 显示验收标准
  showAcceptanceCriteria();

  // 计算总体通过率
  const totalGroups = checks.length + 2; // +2 for structure and tests
  const groupRate = (passedGroups / totalGroups) * 100;
  const checkRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

  console.log('\n📈 验证结果汇总:');
  console.log(`  🏗️  组件通过率: ${passedGroups}/${totalGroups} (${groupRate.toFixed(1)}%)`);
  console.log(`  🔍 检查项通过率: ${passedChecks}/${totalChecks} (${checkRate.toFixed(1)}%)`);

  // 评估AI服务集成状态
  console.log('\n🤖 AI服务集成状态评估:');
  if (groupRate >= 80 && checkRate >= 75) {
    console.log('  ✅ 优秀 - AI服务集成基本完成，架构完善');
    console.log('  🚀 可以进入性能优化和实际测试阶段');
  } else if (groupRate >= 60 && checkRate >= 60) {
    console.log('  ⚠️  良好 - AI服务基础架构就绪，需要完善部分功能');
    console.log('  🔧 建议优先修复缺失的核心组件');
  } else {
    console.log('  ❌ 需要改进 - AI服务集成不够完整');
    console.log('  🛠️  需要重点开发基础组件');
  }

  console.log('\n🎯 下一步行动建议:');
  if (checkRate < 100) {
    console.log('  1. 修复缺失的基础功能组件');
  }
  if (!structureOk) {
    console.log('  2. 完善AI服务文件结构');
  }
  if (!testOk) {
    console.log('  3. 增加AI功能测试用例');
  }
  console.log('  4. 进行实际AI功能性能测试');
  console.log('  5. 验证验收标准是否达标');

  console.log('\n✨ AI功能验证完成！');
}

// 运行验证
main();