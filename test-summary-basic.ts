/**
 * 基础摘要服务测试 - T103.3验证
 */

async function testBasicSummaryService() {
  console.log('🧪 开始基础摘要服务集成测试...\n');

  try {
    // 临时设置环境变量进行测试
    process.env.OPENAI_API_KEY = 'sk-test-key-for-integration-test';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-for-integration-test';

    // 测试导入
    console.log('1️⃣ 测试摘要服务模块导入...');
    const { createSummaryService } = await import('./src/lib/ai/services/summary-service');
    console.log('✅ 摘要服务导入成功');

    // 测试实例化
    console.log('2️⃣ 测试摘要服务实例化...');
    const service = createSummaryService();
    console.log('✅ 摘要服务实例化成功');

    // 测试基础方法存在
    console.log('3️⃣ 测试摘要服务方法存在性...');
    const methods = ['generateSummary', 'generateBatchSummaries', 'getAvailableProviders', 'healthCheck', 'getStats'];

    for (const method of methods) {
      if (typeof (service as any)[method] === 'function') {
        console.log(`✅ ${method} 方法存在`);
      } else {
        console.log(`❌ ${method} 方法不存在`);
      }
    }

    // 测试服务统计
    console.log('4️⃣ 测试服务统计信息...');
    const stats = service.getStats();
    console.log(`- 总提供商数: ${stats.totalProviders}`);
    console.log(`- 可用提供商数: ${stats.availableProviders}`);
    console.log(`- 支持的语言: ${stats.supportedLanguages.join(', ')}`);
    console.log(`- 支持的样式: ${stats.supportedStyles.join(', ')}`);

    console.log('\n🎉 摘要服务基础集成测试完成！');

    return true;

  } catch (error) {
    console.error('❌ 摘要服务基础集成测试失败:', error);
    return false;
  }
}

// 运行测试
testBasicSummaryService()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('摘要服务测试执行出错:', error);
    process.exit(1);
  });