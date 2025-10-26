/**
 * 基础OpenAI功能测试 - T103.1验证
 */

async function testBasicOpenAIIntegration() {
  console.log('🧪 开始基础OpenAI集成测试...\n');

  try {
    // 测试导入
    console.log('1️⃣ 测试模块导入...');
    const { createOpenAIProviderV2 } = await import(
      './src/lib/ai/providers/openai-provider-v2'
    );
    console.log('✅ OpenAI提供商导入成功');

    // 测试实例化
    console.log('2️⃣ 测试提供商实例化...');
    const provider = createOpenAIProviderV2();
    console.log('✅ OpenAI提供商实例化成功');

    // 测试基础方法存在
    console.log('3️⃣ 测试方法存在性...');
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

    console.log('\n🎉 基础集成测试完成！');

    // 检查环境变量
    console.log('\n🔧 检查环境配置:');
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      console.log('✅ OPENAI_API_KEY 已配置');
      console.log(`密钥前缀: ${openaiKey.substring(0, 7)}...`);
    } else {
      console.log('❌ OPENAI_API_KEY 未配置');
      console.log('💡 请在.env文件中设置OPENAI_API_KEY');
    }

    return true;
  } catch (error) {
    console.error('❌ 基础集成测试失败:', error);
    return false;
  }
}

// 运行测试
testBasicOpenAIIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试执行出错:', error);
    process.exit(1);
  });
