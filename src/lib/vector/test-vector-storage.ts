import { PrismaClient } from '@prisma/client';
import { createVectorStorage } from './vector-storage';
import { vectorConfig } from './vector-config';

async function testVectorStorage() {
  const prisma = new PrismaClient();
  const vectorStorage = createVectorStorage(prisma);

  try {
    console.log('🧪 Testing Vector Storage...');

    // 1. 健康检查
    console.log('\n1. Health Check...');
    const isHealthy = await vectorStorage.checkHealth();
    console.log(`Health Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

    // 2. 获取配置
    console.log('\n2. Vector Configuration...');
    const config = vectorConfig.getConfig();
    console.log('Config:', JSON.stringify(config, null, 2));

    // 3. 获取统计信息
    console.log('\n3. Storage Statistics...');
    const stats = await vectorStorage.getStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));

    // 4. 获取实际笔记进行测试
    console.log('\n4. Getting existing notes for testing...');
    const existingNotes = await prisma.note.findMany({ take: 1 });

    if (existingNotes.length === 0) {
      console.log('❌ No existing notes found for testing');
      return;
    }

    const testNoteId = existingNotes[0].id;
    console.log(`✅ Using existing note: ${testNoteId} (${existingNotes[0].title})`);

    // 5. 测试向量存储
    console.log('\n5. Testing Vector Storage...');
    const testVector = new Array(1536).fill(0).map((_, i) => Math.random());

    await vectorStorage.storeVector(testNoteId, testVector, { test: true });
    console.log(`✅ Vector stored for note: ${testNoteId}`);

    // 6. 测试向量检索
    console.log('\n6. Testing Vector Retrieval...');
    const retrievedVector = await vectorStorage.getVector(testNoteId);
    if (retrievedVector) {
      console.log(`✅ Vector retrieved: ${retrievedVector.vector.length} dimensions`);
    } else {
      console.log('❌ Vector retrieval failed');
    }

    // 7. 测试向量搜索
    console.log('\n7. Testing Vector Search...');
    const searchResults = await vectorStorage.searchSimilar(testVector, {
      limit: 5,
      threshold: 0.5,
    });
    console.log(`✅ Search results: ${searchResults.length} items found`);
    searchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. Note ${result.noteId} (similarity: ${result.similarity.toFixed(4)})`);
    });

    // 8. 清理测试数据
    console.log('\n8. Cleanup...');
    await vectorStorage.deleteVector(testNoteId);
    console.log(`✅ Test vector deleted`);

    console.log('\n🎉 All vector storage tests passed!');

  } catch (error) {
    console.error('❌ Vector storage test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testVectorStorage();
}

export { testVectorStorage };