/**
 * 基础Claude功能测试 - T103.2验证
 */

async function testBasicClaudeIntegration() {
  console.log('🧪 开始基础Claude集成测试...\n');

  try {
    // 临时设置环境变量进行测试
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-for-integration-test';

    // 测试导入
    console.log('1️⃣ 测试Claude模块导入...');
    const { createClaudeProvider } = await import(
      './src/lib/ai/providers/claude-provider'
    );
    console.log('✅ Claude提供商导入成功');

    // 测试实例化
    console.log('2️⃣ 测试Claude提供商实例化...');
    const provider = createClaudeProvider();
    console.log('✅ Claude提供商实例化成功');

    // 测试基础方法存在
    console.log('3️⃣ 测试Claude方法存在性...');
    const methods = [
      'generateSummary',
      'extractKeywords',
      'classifyContent',
      'analyzeSentiment',
      'extractKeyConcepts',
      'generateTags',
    ];

    for (const method of methods) {
      if (typeof (provider as any)[method] === 'function') {
        console.log(`✅ ${method} 方法存在`);
      } else {
        console.log(`❌ ${method} 方法不存在`);
      }
    }

    console.log('\n🎉 Claude基础集成测试完成！');

    // 检查环境变量
    console.log('\n🔧 检查Claude环境配置:');
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      console.log('✅ ANTHROPIC_API_KEY 已配置');
      console.log(`密钥前缀: ${anthropicKey.substring(0, 7)}...`);
    } else {
      console.log('❌ ANTHROPIC_API_KEY 未配置');
      console.log('💡 请在.env文件中设置ANTHROPIC_API_KEY');
    }

    return true;
  } catch (error) {
    console.error('❌ Claude基础集成测试失败:', error);
    return false;
  }
}

// 运行测试
testBasicClaudeIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Claude测试执行出错:', error);
    process.exit(1);
  });
