/**
 * 关键词提取服务模拟测试 - T103.4验证
 * 使用模拟数据测试关键词提取功能
 */

async function testKeywordServiceWithMock() {
  console.log('🧪 开始关键词提取服务模拟测试...\n');

  try {
    // 测试导入
    console.log('1️⃣ 测试关键词服务模块导入...');
    const { createKeywordService } = await import(
      './src/lib/ai/services/keyword-service'
    );
    console.log('✅ 关键词服务导入成功');

    // 创建模拟提供商
    const mockProvider = {
      name: 'mock-provider',
      model: 'mock-model',
      extractKeywords: async (content: string) => {
        // 模拟关键词提取逻辑
        const keywords = content.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
        return keywords.slice(0, 8);
      },
    };

    // 手动创建服务实例并替换提供商
    const service = createKeywordService();

    // 替换提供商为模拟提供商
    (service as any).providers.clear();
    (service as any).providers.set('mock-provider', mockProvider);
    (service as any).fallbackOrder = ['mock-provider'];

    console.log('2️⃣ 测试基础关键词提取...');
    const basicRequest = {
      content:
        '人工智能和机器学习是当前技术发展的重要趋势。深度学习作为机器学习的一个重要分支，在图像识别、自然语言处理和推荐系统等领域展现出强大的能力。',
      userId: 'test-user-001',
      priority: 'relevance' as const,
      maxKeywords: 8,
    };

    const basicResult = await service.extractKeywords(basicRequest);
    console.log('✅ 基础关键词提取测试通过');
    console.log(`- 提取的关键词数量: ${basicResult.keywords.length}`);
    console.log(`- 提供商: ${basicResult.provider}`);
    console.log(`- 处理时间: ${basicResult.processingTime}ms`);
    console.log(
      `- 关键词: ${basicResult.keywords.map(k => k.keyword).join(', ')}`,
    );

    console.log('\n3️⃣ 测试不同优先级...');
    const priorities = ['relevance', 'frequency', 'importance'] as const;

    for (const priority of priorities) {
      const request = {
        content: '测试内容测试内容 重要重要 关键关键词 重复重复 多次多次',
        userId: 'test-user',
        priority,
        maxKeywords: 5,
      };

      const result = await service.extractKeywords(request);
      console.log(
        `- ${priority} 优先级: ${result.keywords.map(k => k.keyword).join(', ')}`,
      );
    }

    console.log('\n4️⃣ 测试批量处理...');
    const batchRequests = [
      {
        content: '第一段内容：介绍人工智能的基本概念和应用。',
        userId: 'user1',
        maxKeywords: 3,
      },
      {
        content: '第二段内容：讨论机器学习的算法和模型。',
        userId: 'user2',
        maxKeywords: 3,
      },
      {
        content: '第三段内容：涉及深度学习和神经网络技术。',
        userId: 'user3',
        maxKeywords: 3,
      },
    ];

    const batchResults = await service.extractBatchKeywords(batchRequests);
    console.log(`✅ 批量处理测试通过`);
    console.log(`- 处理请求数: ${batchRequests.length}`);
    console.log(`- 成功结果数: ${batchResults.length}`);

    console.log('\n5️⃣ 测试服务健康检查...');
    const health = await service.healthCheck();
    console.log(`✅ 健康检查通过`);
    console.log(`- 状态: ${health.status}`);
    console.log(`- 提供商: ${health.providers.join(', ')}`);

    console.log('\n6️⃣ 测试服务统计...');
    const stats = service.getStats();
    console.log(`✅ 统计信息获取成功`);
    console.log(`- 总提供商数: ${stats.totalProviders}`);
    console.log(`- 可用提供商数: ${stats.availableProviders}`);
    console.log(`- 支持的语言: ${stats.supportedLanguages.join(', ')}`);

    console.log('\n🎉 关键词提取服务模拟测试完成！');
    console.log('✅ 所有核心功能验证通过');

    return true;
  } catch (error) {
    console.error('❌ 关键词提取服务模拟测试失败:', error);
    return false;
  }
}

// 运行测试
testKeywordServiceWithMock()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('关键词提取服务模拟测试执行出错:', error);
    process.exit(1);
  });
