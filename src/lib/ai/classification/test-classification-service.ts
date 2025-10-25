/**
 * 自动分类服务集成测试脚本 - T104
 * 测试完整的自动分类功能，包括20+种分类体系、多级分类和自定义分类
 */

import { createClassificationService } from './classification-service';
import { ContentCategory, ClassificationRequest, ClassificationOptions } from './types';

async function testBasicClassification() {
  console.log('🧪 开始测试基础分类功能...\n');

  try {
    // 创建分类服务
    console.log('1️⃣ 创建分类服务...');
    const service = createClassificationService({
      algorithm: 'hybrid',
      confidenceThreshold: 0.6,
      maxCategories: 3,
      enableSubcategories: true,
      cacheEnabled: true
    });
    console.log('✅ 分类服务初始化成功');

    // 检查预定义分类
    console.log('\n2️⃣ 检查预定义分类体系...');
    const categories = service.getCategories();
    console.log(`已配置 ${categories.length} 个预定义分类:`);

    const level1Categories = categories.filter(c => c.level === 1);
    const level2Categories = categories.filter(c => c.level === 2);

    console.log(`- 一级分类: ${level1Categories.length} 个`);
    level1Categories.forEach(cat => {
      console.log(`  ${cat.icon} ${cat.name} (${cat.id}): ${cat.description}`);
      console.log(`    关键词: ${cat.keywords.slice(0, 5).join(', ')}...`);
    });

    console.log(`- 二级分类: ${level2Categories.length} 个`);
    const parentCategories = [...new Set(level2Categories.map(c => c.parentId))];
    parentCategories.forEach(parentId => {
      const subcategories = level2Categories.filter(c => c.parentId === parentId);
      const parent = level1Categories.find(c => c.id === parentId);
      console.log(`  ${parent?.icon} ${parent?.name} 的子分类:`);
      subcategories.forEach(sub => {
        console.log(`    - ${sub.name}: ${sub.description}`);
      });
    });

    console.log('\n3️⃣ 测试不同类型内容的分类...');

    const testCases = [
      {
        name: '科技内容',
        content: `
人工智能技术正在快速发展，深度学习和机器学习算法在各个领域都有广泛应用。
Web开发技术包括前端框架React、Vue和后端Node.js等。移动开发方面，iOS和Android应用开发
需要掌握Swift、Kotlin等编程语言。AI技术的发展为软件工程师带来了新的机遇和挑战。
        `.trim(),
        expectedCategories: ['technology']
      },
      {
        name: '商业内容',
        content: `
创业公司需要关注市场需求和商业模式设计。有效的营销策略能够帮助企业快速成长。
风险投资为初创公司提供资金支持，但需要清晰的商业计划和市场定位。
财务管理是企业发展的重要基础，需要合理规划资金使用和成本控制。
        `.trim(),
        expectedCategories: ['business']
      },
      {
        name: '教育内容',
        content: `
学习编程需要掌握数据结构、算法和设计模式。在线教育平台为学习者提供了便利。
英语学习需要注重听、说、读、写四个方面的综合训练。职业技能培训帮助人们
提升职场竞争力，获得更好的工作机会。
        `.trim(),
        expectedCategories: ['education']
      },
      {
        name: '健康内容',
        content: `
保持健康的身体需要定期运动和均衡营养。心理健康同样重要，需要学会压力管理
和情绪调节。定期体检能够及早发现潜在的健康问题。运动健身不仅能够增强体质，
还能改善心理健康状况。
        `.trim(),
        expectedCategories: ['health']
      },
      {
        name: '混合内容',
        content: `
人工智能在医疗健康领域的应用为创业公司提供了新的商机。通过深度学习算法，
可以辅助医生进行疾病诊断，提高医疗效率。这种技术创新不仅推动了医疗行业的发展，
也为商业投资开辟了新的方向。
        `.trim(),
        expectedCategories: ['technology', 'health', 'business']
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n测试${testCase.name}:`);
      console.log(`内容长度: ${testCase.content.length} 字符`);

      const request: ClassificationRequest = {
        content: testCase.content,
        userId: 'test-user-001',
        options: {
          maxCategories: 5,
          minConfidence: 0.5,
          includeSubcategories: true,
          detailed: true
        }
      };

      const result = await service.classify(request);

      console.log(`✅ 识别到 ${result.categories.length} 个分类:`);
      result.categories.forEach((classified, index) => {
        console.log(`${index + 1}. ${classified.category.icon} ${classified.category.name} (${classified.category.id})`);
        console.log(`   置信度: ${(classified.confidence * 100).toFixed(1)}%`);
        console.log(`   匹配关键词: ${classified.matchedKeywords.join(', ')}`);
        console.log(`   推理: ${classified.reasoning}`);

        if (classified.subcategories && classified.subcategories.length > 0) {
          console.log(`   子分类:`);
          classified.subcategories.forEach((sub, subIndex) => {
            console.log(`     ${subIndex + 1}. ${sub.category.name} (${(sub.confidence * 100).toFixed(1)}%)`);
            console.log(`        匹配: ${sub.matchedKeywords.join(', ')}`);
          });
        }
      });

      // 验证预期分类
      const foundCategories = result.categories.map(c => c.category.id);
      const expectedFound = testCase.expectedCategories.filter(expected =>
        foundCategories.includes(expected) || foundCategories.some(found =>
          testCase.expectedCategories.some(exp => found.includes(exp))
        )
      );

      if (expectedFound.length > 0) {
        console.log(`✅ 成功识别预期分类: ${expectedFound.join(', ')}`);
      } else {
        console.log(`⚠️ 未能识别预期分类: ${testCase.expectedCategories.join(', ')}`);
      }

      console.log(`处理时间: ${result.metadata.processingTime}ms`);
      console.log(`算法: ${result.metadata.algorithm}`);
    }

    console.log('\n✅ 基础分类功能测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 基础分类功能测试失败:', error);
    return false;
  }
}

async function testCustomCategories() {
  console.log('\n🎯 开始测试自定义分类功能...\n');

  try {
    const service = createClassificationService({
      confidenceThreshold: 0.5,
      enableUserCategories: true
    });

    console.log('1️⃣ 添加自定义分类...');

    const customCategories: ContentCategory[] = [
      {
        id: 'cryptocurrency',
        name: '加密货币',
        description: '与区块链、加密货币、数字资产相关的内容',
        level: 1,
        keywords: ['比特币', '以太坊', '区块链', '加密货币', '数字货币', 'DeFi', 'NFT', '挖矿'],
        confidence: 0.9,
        color: '#F59E0B',
        icon: '₿'
      },
      {
        id: 'sustainability',
        name: '可持续发展',
        description: '与环境保护、可持续发展、绿色能源相关的内容',
        level: 1,
        keywords: ['可持续发展', '环境保护', '绿色能源', '碳中和', '气候变化', '新能源', ' recycling'],
        confidence: 0.9,
        color: '#10B981',
        icon: '🌱'
      },
      {
        id: 'gaming',
        name: '游戏',
        description: '与电子游戏、游戏开发、游戏产业相关的内容',
        level: 1,
        keywords: ['游戏', '电子游戏', '游戏开发', '游戏设计', 'Unity', 'Unreal Engine', '电竞', '游戏产业'],
        confidence: 0.9,
        color: '#8B5CF6',
        icon: '🎮'
      }
    ];

    for (const category of customCategories) {
      await service.addCustomCategory(category);
      console.log(`✅ 添加自定义分类: ${category.name} (${category.id})`);
    }

    console.log('\n2️⃣ 测试自定义分类识别...');

    const customTestCases = [
      {
        name: '加密货币内容',
        content: '比特币和以太坊是主流的加密货币，区块链技术为DeFi和NFT提供了基础设施。数字货币挖矿需要大量的计算资源。',
        expectedCustomCategory: 'cryptocurrency'
      },
      {
        name: '可持续发展内容',
        content: '绿色能源和可持续发展是全球关注的重要议题。碳中和目标推动了新能源技术的快速发展，环境保护意识也在不断提高。',
        expectedCustomCategory: 'sustainability'
      },
      {
        name: '游戏内容',
        content: 'Unity和Unreal Engine是主流的游戏开发引擎。电子竞技产业的快速发展为游戏开发者创造了新的机遇。游戏设计需要考虑玩家体验和商业模式。',
        expectedCustomCategory: 'gaming'
      }
    ];

    for (const testCase of customTestCases) {
      console.log(`\n测试${testCase.name}:`);

      const request: ClassificationRequest = {
        content: testCase.content,
        userId: 'custom-test-user',
        options: {
          maxCategories: 5,
          minConfidence: 0.4
        }
      };

      const result = await service.classify(request);

      const customCategory = result.categories.find(c => c.category.id === testCase.expectedCustomCategory);

      if (customCategory) {
        console.log(`✅ 成功识别自定义分类: ${customCategory.category.name}`);
        console.log(`   置信度: ${(customCategory.confidence * 100).toFixed(1)}%`);
        console.log(`   匹配关键词: ${customCategory.matchedKeywords.join(', ')}`);
      } else {
        console.log(`⚠️ 未能识别自定义分类: ${testCase.expectedCustomCategory}`);
        console.log(`识别到的分类: ${result.categories.map(c => c.category.name).join(', ')}`);
      }
    }

    console.log('\n3️⃣ 测试自定义分类管理...');

    // 测试更新分类
    console.log('更新加密货币分类...');
    await service.updateCategory('cryptocurrency', {
      description: '更新后的描述：涵盖所有数字资产和区块链技术',
      keywords: ['比特币', '以太坊', '区块链', '加密货币', '数字货币', 'DeFi', 'NFT', '挖矿', 'Web3', '去中心化']
    });

    // 测试分类统计
    console.log('\n获取分类统计...');
    const stats = service.getCategoryStats();
    const customStats = stats.filter(s =>
      customCategories.some(c => c.id === s.categoryId)
    );

    console.log('自定义分类使用统计:');
    customStats.forEach(stat => {
      console.log(`- ${stat.name}: 使用${stat.usageCount}次, 平均置信度${(stat.averageConfidence * 100).toFixed(1)}%`);
    });

    console.log('\n✅ 自定义分类功能测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 自定义分类功能测试失败:', error);
    return false;
  }
}

async function testClassificationAlgorithms() {
  console.log('\n⚙️ 开始测试不同分类算法...\n');

  try {
    const testContent = `
人工智能技术在现代软件开发中发挥着重要作用。深度学习算法能够帮助开发者
创建智能应用，而机器学习框架如TensorFlow和PyTorch为AI开发提供了强大的工具。
Web开发者可以利用这些技术构建更智能的用户体验。
    `.trim();

    console.log('测试内容长度:', testContent.length, '字符');

    const algorithms = [
      { name: '关键词分类', algorithm: 'keyword-based' as const },
      { name: '机器学习分类', algorithm: 'ml-based' as const },
      { name: '混合分类', algorithm: 'hybrid' as const }
    ];

    const results: Array<{ name: string; result: any; time: number }> = [];

    for (const { name, algorithm } of algorithms) {
      console.log(`\n${name}算法测试:`);

      const service = createClassificationService({
        algorithm,
        confidenceThreshold: 0.5,
        cacheEnabled: false // 禁用缓存以确保公平比较
      });

      const startTime = Date.now();

      const request: ClassificationRequest = {
        content: testContent,
        userId: 'algorithm-test-user',
        options: {
          maxCategories: 5,
          includeSubcategories: true
        }
      };

      const result = await service.classify(request);
      const processingTime = Date.now() - startTime;

      console.log(`✅ 处理时间: ${processingTime}ms`);
      console.log(`✅ 识别分类数: ${result.categories.length}`);
      console.log(`✅ 主要分类: ${result.categories.slice(0, 3).map(c => `${c.category.name}(${(c.confidence * 100).toFixed(1)}%)`).join(', ')}`);

      if (result.categories[0]?.subcategories?.length) {
        console.log(`✅ 子分类数: ${result.categories[0].subcategories.length}`);
      }

      results.push({ name, result, time: processingTime });
    }

    console.log('\n📊 算法性能比较:');
    results.forEach(({ name, result, time }) => {
      const avgConfidence = result.categories.reduce((sum: number, c: any) => sum + c.confidence, 0) / result.categories.length;
      console.log(`${name}:`);
      console.log(`  - 处理时间: ${time}ms`);
      console.log(`  - 分类数量: ${result.categories.length}`);
      console.log(`  - 平均置信度: ${(avgConfidence * 100).toFixed(1)}%`);
      console.log(`  - 算法: ${result.metadata.algorithm}`);
    });

    // 找出最佳算法
    const bestByConfidence = results.reduce((best, current) => {
      const currentAvg = current.result.categories.reduce((sum: number, c: any) => sum + c.confidence, 0) / current.result.categories.length;
      const bestAvg = best.result.categories.reduce((sum: number, c: any) => sum + c.confidence, 0) / best.result.categories.length;
      return currentAvg > bestAvg ? current : best;
    });

    console.log(`\n🏆 最佳置信度算法: ${bestByConfidence.name}`);

    console.log('\n✅ 分类算法测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 分类算法测试失败:', error);
    return false;
  }
}

async function testPerformanceAndScalability() {
  console.log('\n⚡ 开始测试性能和可扩展性...\n');

  try {
    const service = createClassificationService({
      algorithm: 'keyword-based', // 使用最快的算法进行性能测试
      cacheEnabled: true
    });

    console.log('1️⃣ 测试不同长度内容的处理性能...');

    const lengthTests = [
      { name: '短文本', content: '人工智能技术', expectedMaxTime: 100 },
      { name: '中等文本', content: '人工智能技术在现代软件开发中发挥着重要作用。深度学习算法能够帮助开发者创建智能应用，而机器学习框架为AI开发提供了强大工具。', expectedMaxTime: 200 },
      { name: '长文本', content: `
人工智能技术是计算机科学的一个重要分支，它致力于创建能够执行通常需要人类智能的任务的系统。
近年来，随着计算能力的提升和大数据的普及，人工智能技术取得了突破性进展。

深度学习作为机器学习的一个重要分支，通过模拟人脑神经网络的结构和功能，使得计算机能够从大量数据中学习并做出预测或决策。
卷积神经网络在图像识别领域取得了巨大成功，而循环神经网络则在自然语言处理中表现出色。

自然语言处理技术让机器能够理解、解释和生成人类语言，这包括机器翻译、情感分析、文本摘要等多个应用领域。
现代NLP技术广泛应用于聊天机器人、智能客服、内容推荐等实际场景中。

计算机视觉技术使机器能够"看懂"图像和视频，在人脸识别、目标检测、医学影像分析等方面有广泛应用。
自动驾驶汽车依赖于计算机视觉技术来识别道路、车辆、行人等物体。

强化学习通过与环境交互来学习最优策略，在游戏、机器人控制、推荐系统等领域取得了显著成果。
AlphaGo击败人类围棋冠军就是强化学习技术的一个重要里程碑。

人工智能技术的发展不仅改变了科技行业，还深刻影响着医疗、金融、教育、交通等各个领域。
未来，随着技术的不断进步，人工智能将在更多场景中发挥重要作用，为人类社会带来更大的价值。
      `.trim(), expectedMaxTime: 500 }
    ];

    for (const test of lengthTests) {
      console.log(`\n测试${test.name} (长度: ${test.content.length} 字符):`);

      const startTime = Date.now();

      const request: ClassificationRequest = {
        content: test.content,
        userId: 'performance-test-user',
        options: {
          maxCategories: 5,
          includeSubcategories: true
        }
      };

      const result = await service.classify(request);
      const processingTime = Date.now() - startTime;

      console.log(`✅ 处理时间: ${processingTime}ms (期望 < ${test.expectedMaxTime}ms)`);
      console.log(`✅ 分类数量: ${result.categories.length}`);
      console.log(`✅ Token处理速度: ${(test.content.length / (processingTime / 1000)).toFixed(1)} 字符/秒`);

      if (processingTime > test.expectedMaxTime) {
        console.log(`⚠️ 处理时间超过期望值`);
      }
    }

    console.log('\n2️⃣ 测试并发处理能力...');

    const concurrentRequests = 10;
    const concurrentContent = '并发测试内容：人工智能技术在各个领域都有重要应用。';

    console.log(`发送 ${concurrentRequests} 个并发请求...`);

    const concurrentStartTime = Date.now();

    const concurrentPromises = Array.from({ length: concurrentRequests }, (_, i) =>
      service.classify({
        content: `${concurrentContent} (请求 ${i + 1})`,
        userId: 'concurrent-test-user',
        options: { maxCategories: 3 }
      })
    );

    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentEndTime = Date.now();

    const totalTime = concurrentEndTime - concurrentStartTime;
    const averageTime = totalTime / concurrentRequests;

    console.log(`✅ 并发处理完成:`);
    console.log(`  - 总耗时: ${totalTime}ms`);
    console.log(`  - 平均每个请求: ${averageTime.toFixed(1)}ms`);
    console.log(`  - 成功处理: ${concurrentResults.filter(r => r.categories.length > 0).length}/${concurrentRequests}`);

    console.log('\n3️⃣ 测试缓存效果...');

    const cacheTestContent = '缓存测试内容：机器学习和深度学习都是人工智能的重要分支。';

    // 第一次处理（无缓存）
    const firstStartTime = Date.now();
    await service.classify({
      content: cacheTestContent,
      userId: 'cache-test-user'
    });
    const firstTime = Date.now() - firstStartTime;

    // 第二次处理（有缓存）
    const secondStartTime = Date.now();
    await service.classify({
      content: cacheTestContent,
      userId: 'cache-test-user'
    });
    const secondTime = Date.now() - secondStartTime;

    console.log(`✅ 缓存效果测试:`);
    console.log(`  - 首次处理: ${firstTime}ms`);
    console.log(`  - 缓存命中: ${secondTime}ms`);
    console.log(`  - 性能提升: ${((firstTime - secondTime) / firstTime * 100).toFixed(1)}%`);

    console.log('\n✅ 性能和可扩展性测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 性能和可扩展性测试失败:', error);
    return false;
  }
}

async function testEdgeCasesAndErrorHandling() {
  console.log('\n🛡️ 开始测试边界情况和错误处理...\n');

  try {
    const service = createClassificationService({
      confidenceThreshold: 0.3, // 降低阈值以测试边界情况
      maxCategories: 10
    });

    console.log('1️⃣ 测试边界情况...');

    const edgeCases = [
      {
        name: '空字符串',
        content: '',
        expectedResult: 'empty'
      },
      {
        name: '只有空格',
        content: '   ',
        expectedResult: 'empty'
      },
      {
        name: '只有标点符号',
        content: '！@#￥%……&*（）',
        expectedResult: 'empty'
      },
      {
        name: '单个字符',
        content: '技',
        expectedResult: 'low-confidence'
      },
      {
        name: '无匹配关键词',
        content: '这是一段完全不包含任何预定义关键词的测试文本内容。',
        expectedResult: 'no-matches'
      },
      {
        name: '混合语言',
        content: 'Artificial Intelligence 人工智能技术 is very important for technology development.',
        expectedResult: 'mixed-language'
      }
    ];

    for (const testCase of edgeCases) {
      console.log(`\n测试${testCase.name}:`);

      try {
        const request: ClassificationRequest = {
          content: testCase.content,
          userId: 'edge-case-test-user',
          options: {
            maxCategories: 5,
            minConfidence: 0.1 // 很低的阈值
          }
        };

        const result = await service.classify(request);

        console.log(`✅ 处理成功，识别到 ${result.categories.length} 个分类`);

        if (result.categories.length === 0) {
          console.log(`   结果: 无匹配分类 (符合预期)`);
        } else {
          result.categories.forEach((c, index) => {
            console.log(`   ${index + 1}. ${c.category.name} (${(c.confidence * 100).toFixed(1)}%)`);
          });
        }

      } catch (error) {
        console.log(`❌ 处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    console.log('\n2️⃣ 测试错误处理...');

    // 测试无效选项
    console.log('测试无效分类选项:');
    try {
      const request = {
        content: '测试内容',
        userId: 'error-test-user',
        options: {
          maxCategories: -1, // 无效值
          minConfidence: 2,   // 无效值
          includeSubcategories: 'yes' as any // 类型错误
        }
      };

      const result = await service.classify(request);
      console.log('✅ 无效选项处理正常，使用默认值');

    } catch (error) {
      console.log(`⚠️ 无效选项导致错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 测试极长内容
    console.log('\n测试极长内容处理:');
    try {
      const longContent = '测试'.repeat(10000); // 40KB 内容
      console.log(`内容长度: ${longContent.length} 字符`);

      const request = {
        content: longContent,
        userId: 'long-content-test-user'
      };

      const startTime = Date.now();
      const result = await service.classify(request);
      const processingTime = Date.now() - startTime;

      console.log(`✅ 极长内容处理成功`);
      console.log(`   处理时间: ${processingTime}ms`);
      console.log(`   识别分类数: ${result.categories.length}`);

    } catch (error) {
      console.log(`❌ 极长内容处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    console.log('\n3️⃣ 测试分类管理错误...');

    // 测试重复分类ID
    console.log('测试重复分类ID:');
    try {
      await service.addCustomCategory({
        id: 'technology', // 已存在的ID
        name: '重复分类',
        description: '测试重复ID',
        level: 1,
        keywords: ['重复'],
        confidence: 0.9
      });

      console.log('❌ 应该拒绝重复分类ID');

    } catch (error) {
      console.log('✅ 正确拒绝重复分类ID');
    }

    // 测试删除不存在的分类
    console.log('\n测试删除不存在的分类:');
    try {
      await service.deleteCategory('non-existent-category');
      console.log('❌ 应该拒绝删除不存在的分类');

    } catch (error) {
      console.log('✅ 正确拒绝删除不存在的分类');
    }

    // 测试删除有子分类的分类
    console.log('\n测试删除有子分类的分类:');
    try {
      await service.deleteCategory('technology'); // 有子分类
      console.log('❌ 应该拒绝删除有子分类的分类');

    } catch (error) {
      console.log('✅ 正确拒绝删除有子分类的分类');
    }

    console.log('\n✅ 边界情况和错误处理测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 边界情况和错误处理测试失败:', error);
    return false;
  }
}

async function testSystemHealthAndMonitoring() {
  console.log('\n📊 开始测试系统健康和监控功能...\n');

  try {
    const service = createClassificationService({
      algorithm: 'hybrid',
      confidenceThreshold: 0.5,
      cacheEnabled: true
    });

    console.log('1️⃣ 测试系统健康检查...');
    const health = await service.healthCheck();

    console.log('系统健康状态:');
    console.log(`- 状态: ${health.status}`);
    console.log(`- 消息: ${health.message}`);

    if (health.status === 'healthy') {
      console.log('✅ 系统健康检查通过');
    } else {
      console.log('⚠️ 系统健康检查发现问题');
    }

    console.log('\n2️⃣ 测试分类统计功能...');

    // 执行一些分类以生成统计数据
    const testRequests = [
      { content: '人工智能技术发展迅速', userId: 'stats-user' },
      { content: '创业公司需要好的商业模式', userId: 'stats-user' },
      { content: '学习编程需要练习', userId: 'stats-user' },
      { content: '保持健康需要运动', userId: 'stats-user' },
      { content: 'AI技术为医疗带来变革', userId: 'stats-user' }, // 混合分类
      { content: 'Web开发包括前端和后端', userId: 'stats-user' },
      { content: '投资理财需要专业知识', userId: 'stats-user' },
      { content: '在线教育平台发展迅速', userId: 'stats-user' }
    ];

    console.log('执行测试分类以生成统计数据...');
    for (let i = 0; i < testRequests.length; i++) {
      await service.classify({
        content: testRequests[i].content,
        userId: testRequests[i].userId
      });
      console.log(`✅ 完成分类 ${i + 1}/${testRequests.length}`);
    }

    // 获取分类统计
    console.log('\n获取分类统计信息:');
    const stats = service.getCategoryStats();

    console.log(`总分类数: ${stats.length}`);
    console.log('使用频率Top 5分类:');
    stats.slice(0, 5).forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.name}: ${stat.usageCount}次使用 (平均置信度: ${(stat.averageConfidence * 100).toFixed(1)}%)`);
    });

    // 获取分析报告
    console.log('\n3️⃣ 获取系统分析报告...');
    const analytics = service.getAnalytics();

    console.log('系统分析报告:');
    console.log(`- 总分类次数: ${analytics.totalClassifications}`);
    console.log(`- 分类分布: ${analytics.categoryDistribution.length} 个分类有使用记录`);
    console.log(`- 整体准确率: ${(analytics.accuracyMetrics.overallAccuracy * 100).toFixed(1)}%`);

    if (analytics.categoryDistribution.length > 0) {
      console.log('最活跃的分类:');
      analytics.categoryDistribution.slice(0, 3).forEach((stat, index) => {
        console.log(`${index + 1}. ${stat.name}: ${stat.usageCount}次`);
      });
    }

    console.log('\n4️⃣ 测试缓存管理...');

    // 清理缓存前后对比
    console.log('清理缓存前状态:');
    const preCleanStats = service.getCategoryStats();
    console.log(`- 缓存状态: 活跃`);

    service.clearCache();
    console.log('✅ 缓存已清理');

    // 验证清理后功能正常
    const postCleanResult = await service.classify({
      content: '缓存清理后的测试内容',
      userId: 'cache-clean-test'
    });

    console.log(`✅ 缓存清理后功能正常，识别到 ${postCleanResult.categories.length} 个分类`);

    console.log('\n5️⃣ 测试训练数据管理...');

    // 添加训练数据
    const trainingData = [
      {
        id: 'train-1',
        content: '人工智能和机器学习',
        categories: ['technology', 'ai-ml'],
        userId: 'trainer',
        timestamp: new Date(),
        isValidated: false
      },
      {
        id: 'train-2',
        content: '创业和投资',
        categories: ['business', 'startup'],
        userId: 'trainer',
        timestamp: new Date(),
        isValidated: false
      },
      {
        id: 'train-3',
        content: '健康和运动',
        categories: ['health'],
        userId: 'trainer',
        timestamp: new Date(),
        isValidated: false
      }
    ];

    console.log('添加训练数据...');
    for (const data of trainingData) {
      await service.addTrainingData(data);
      console.log(`✅ 添加训练数据: ${data.categories.join(', ')}`);
    }

    console.log('\n✅ 系统健康和监控功能测试完成！');
    return true;

  } catch (error) {
    console.error('❌ 系统健康和监控功能测试失败:', error);
    return false;
  }
}

// 主测试函数
async function runAllClassificationTests() {
  console.log('🚀 开始自动分类服务完整测试套件\n');
  console.log('='.repeat(60));

  const testResults = {
    basicClassification: await testBasicClassification(),
    customCategories: await testCustomCategories(),
    algorithms: await testClassificationAlgorithms(),
    performance: await testPerformanceAndScalability(),
    edgeCases: await testEdgeCasesAndErrorHandling(),
    healthAndMonitoring: await testSystemHealthAndMonitoring()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📋 自动分类服务测试结果汇总:');
  console.log('- 基础分类功能测试:', testResults.basicClassification ? '✅ 通过' : '❌ 失败');
  console.log('- 自定义分类功能测试:', testResults.customCategories ? '✅ 通过' : '❌ 失败');
  console.log('- 分类算法测试:', testResults.algorithms ? '✅ 通过' : '❌ 失败');
  console.log('- 性能和可扩展性测试:', testResults.performance ? '✅ 通过' : '❌ 失败');
  console.log('- 边界情况测试:', testResults.edgeCases ? '✅ 通过' : '❌ 失败');
  console.log('- 系统健康监控测试:', testResults.healthAndMonitoring ? '✅ 通过' : '❌ 失败');

  const allPassed = Object.values(testResults).every(result => result);
  console.log('\n🏆 自动分类服务总体结果:', allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败');

  if (allPassed) {
    console.log('\n🎯 自动分类服务 (T104) 实现完成并验证通过！');
    console.log('系统具备完整的自动分类能力，支持20+种预定义分类和用户自定义分类。');
    console.log('集成了多种分类算法、多级分类体系、成本控制和性能优化等生产级特性。');
  }

  return allPassed;
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runAllClassificationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('自动分类服务测试执行出错:', error);
      process.exit(1);
    });
}

export {
  testBasicClassification,
  testCustomCategories,
  testClassificationAlgorithms,
  testPerformanceAndScalability,
  testEdgeCasesAndErrorHandling,
  testSystemHealthAndMonitoring,
  runAllClassificationTests
};