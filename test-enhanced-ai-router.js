#!/usr/bin/env node

/**
 * 增强版AI路由器测试脚本
 * 演示并发请求、负载均衡和智能路由功能
 */

const { performance } = require('perf_hooks')

// 模拟增强版AI路由器（简化版本用于演示）
class MockEnhancedAIRouter {
  constructor() {
    this.services = [
      { id: 'openai', name: 'OpenAI GPT-4', latency: 1500, cost: 0.03, quality: 0.95 },
      { id: 'anthropic', name: 'Claude 3 Sonnet', latency: 1200, cost: 0.015, quality: 0.92 },
      { id: 'openai-fast', name: 'OpenAI GPT-3.5', latency: 800, cost: 0.002, quality: 0.85 }
    ]
    this.requestCount = 0
    this.responseCache = new Map()
  }

  // 模拟并发请求处理
  async routeConcurrentRequest(request, maxConcurrency = 2) {
    const startTime = performance.now()
    this.requestCount++

    console.log(`🚀 处理并发请求 #${this.requestCount} (并发数: ${maxConcurrency})`)
    console.log(`   提示词: "${request.prompt.substring(0, 50)}..."`)

    // 选择最佳服务
    const availableServices = this.services.slice(0, maxConcurrency)
    const promises = availableServices.map(service =>
      this.mockServiceCall(service, request)
    )

    try {
      const results = await Promise.allSettled(promises)
      const successfulResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)

      if (successfulResults.length === 0) {
        throw new Error('所有并发请求都失败了')
      }

      // 选择最佳结果
      const bestResult = successfulResults.reduce((best, current) =>
        current.score > best.score ? current : best
      )

      const responseTime = performance.now() - startTime

      console.log(`✅ 并发请求成功完成`)
      console.log(`   选择提供商: ${bestResult.service.name}`)
      console.log(`   响应时间: ${responseTime.toFixed(0)}ms`)
      console.log(`   成功率: ${successfulResults.length}/${maxConcurrency}`)
      console.log(`   评分: ${bestResult.score.toFixed(3)}`)

      return {
        requestId: `req_${this.requestCount}`,
        provider: bestResult.service.id,
        model: bestResult.service.name,
        content: bestResult.content,
        responseTime,
        success: true,
        metadata: {
          concurrentResults: {
            totalRequests: maxConcurrency,
            successfulRequests: successfulResults.length,
            selectedProvider: bestResult.service.id
          },
          performanceScore: bestResult.score
        }
      }

    } catch (error) {
      console.log(`❌ 并发请求失败: ${error.message}`)
      throw error
    }
  }

  // 模拟服务调用
  async mockServiceCall(service, request) {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, service.latency))

    // 模拟偶发失败（5%失败率）
    if (Math.random() < 0.05) {
      throw new Error(`${service.name} 临时不可用`)
    }

    // 生成模拟响应
    const responses = [
      `基于${service.name}的分析：这是一个很有趣的问题。让我为您提供详细的解答...`,
      `${service.name}认为：根据您的问题，我建议从以下几个角度来考虑...`,
      `${service.name}回复：经过深入思考，我认为最佳方案是...`
    ]

    const content = responses[Math.floor(Math.random() * responses.length)]

    // 计算综合评分
    const timeScore = Math.max(0, 1 - service.latency / 3000)
    const costScore = Math.max(0, 1 - service.cost / 0.05)
    const score = (service.quality * 0.4) + (timeScore * 0.3) + (costScore * 0.3)

    return {
      service,
      content,
      score,
      usage: {
        promptTokens: Math.floor(Math.random() * 100) + 50,
        completionTokens: Math.floor(Math.random() * 200) + 100,
        estimatedCost: service.cost * (Math.random() * 0.5 + 0.5)
      }
    }
  }

  // 模拟负载均衡
  async distributeLoad(requests, strategy = 'weighted') {
    console.log(`\n📊 开始负载均衡测试 (策略: ${strategy})`)
    console.log(`   请求数量: ${requests.length}`)

    const startTime = performance.now()
    const results = []

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i]

      // 根据策略选择服务
      let selectedService
      switch (strategy) {
        case 'round-robin':
          selectedService = this.services[i % this.services.length]
          break
        case 'weighted':
          // 权重基于质量和成本
          const weights = this.services.map(s => s.quality / s.cost)
          const totalWeight = weights.reduce((a, b) => a + b, 0)
          let random = Math.random() * totalWeight
          let acc = 0
          for (let j = 0; j < this.services.length; j++) {
            acc += weights[j]
            if (random <= acc) {
              selectedService = this.services[j]
              break
            }
          }
          break
        case 'least-connections':
          // 选择延迟最低的服务
          selectedService = this.services.reduce((min, s) =>
            s.latency < min.latency ? s : min
          )
          break
        default:
          selectedService = this.services[0]
      }

      try {
        const result = await this.mockServiceCall(selectedService, request)
        results.push({
          requestId: `load_${i + 1}`,
          provider: selectedService.id,
          success: true,
          responseTime: selectedService.latency,
          score: result.score,
          content: result.content.substring(0, 100) + '...'
        })
      } catch (error) {
        results.push({
          requestId: `load_${i + 1}`,
          provider: selectedService.id,
          success: false,
          error: error.message
        })
      }
    }

    const totalTime = performance.now() - startTime
    const successCount = results.filter(r => r.success).length

    console.log(`✅ 负载均衡测试完成`)
    console.log(`   总耗时: ${totalTime.toFixed(0)}ms`)
    console.log(`   成功率: ${successCount}/${requests.length} (${(successCount/requests.length*100).toFixed(1)}%)`)
    console.log(`   平均响应时间: ${(totalTime/requests.length).toFixed(0)}ms`)

    return results
  }

  // 模拟服务预热
  async warmupServices() {
    console.log(`\n🔥 开始服务预热...`)

    const warmupPromises = this.services.map(async (service) => {
      try {
        await this.mockServiceCall(service, { prompt: '健康检查' })
        console.log(`   ✅ ${service.name} 预热成功`)
        return { service: service.id, status: 'healthy' }
      } catch (error) {
        console.log(`   ❌ ${service.name} 预热失败: ${error.message}`)
        return { service: service.id, status: 'unhealthy' }
      }
    })

    const results = await Promise.allSettled(warmupPromises)
    const healthyCount = results.filter(r =>
      r.status === 'fulfilled' && r.value.status === 'healthy'
    ).length

    console.log(`🔥 预热完成: ${healthyCount}/${this.services.length} 服务健康`)
    return results
  }

  // 获取统计信息
  getStats() {
    return {
      totalRequests: this.requestCount,
      availableServices: this.services.length,
      cacheSize: this.responseCache.size
    }
  }
}

// 测试函数
async function runTests() {
  console.log('🎯 增强版AI路由器测试开始\n')

  const router = new MockEnhancedAIRouter()

  // 测试1: 服务预热
  console.log('='.repeat(60))
  console.log('测试1: 服务预热')
  console.log('='.repeat(60))
  await router.warmupServices()

  // 测试2: 单个并发请求
  console.log('\n' + '='.repeat(60))
  console.log('测试2: 单个并发请求')
  console.log('='.repeat(60))

  const singleRequest = {
    prompt: '请解释什么是人工智能，以及它在现代科技中的应用',
    preferences: { quality: 'excellent', speed: 'fast' }
  }

  await router.routeConcurrentRequest(singleRequest, 2)

  // 测试3: 多个并发请求
  console.log('\n' + '='.repeat(60))
  console.log('测试3: 多个并发请求')
  console.log('='.repeat(60))

  const concurrentRequests = [
    { prompt: '分析一下区块链技术的未来发展前景' },
    { prompt: '如何提高软件开发的效率和质量？' },
    { prompt: '解释量子计算的基本原理和应用领域' }
  ]

  console.log(`\n并发处理 ${concurrentRequests.length} 个请求...`)
  const concurrentPromises = concurrentRequests.map((req, index) =>
    router.routeConcurrentRequest({
      ...req,
      requestId: `concurrent_${index + 1}`
    }, 2)
  )

  const concurrentResults = await Promise.allSettled(concurrentPromises)
  const concurrentSuccessCount = concurrentResults.filter(r => r.status === 'fulfilled').length
  console.log(`\n🎯 并发请求结果: ${concurrentSuccessCount}/${concurrentRequests.length} 成功`)

  // 测试4: 负载均衡测试
  console.log('\n' + '='.repeat(60))
  console.log('测试4: 负载均衡测试')
  console.log('='.repeat(60))

  const loadRequests = Array.from({ length: 12 }, (_, i) => ({
    prompt: `负载测试请求 ${i + 1}: 请分析当前技术趋势${i + 1}`
  }))

  // 测试不同的负载均衡策略
  const strategies = ['round-robin', 'weighted', 'least-connections']

  for (const strategy of strategies) {
    await router.distributeLoad(loadRequests.slice(0, 6), strategy)
    console.log('') // 空行分隔
  }

  // 测试5: 性能压力测试
  console.log('='.repeat(60))
  console.log('测试5: 性能压力测试')
  console.log('='.repeat(60))

  const stressTestStart = performance.now()
  const stressRequests = Array.from({ length: 20 }, (_, i) => ({
    prompt: `压力测试 ${i + 1}: 快速回答这个问题${i + 1}`
  }))

  console.log(`\n开始处理 ${stressRequests.length} 个压力测试请求...`)

  const stressPromises = stressRequests.map((req, index) =>
    router.routeConcurrentRequest({
      ...req,
      requestId: `stress_${index + 1}`,
      preferences: { speed: 'fast', cost: 'low' }
    }, 2)
  )

  const stressResults = await Promise.allSettled(stressPromises)
  const stressTestTime = performance.now() - stressTestStart
  const stressSuccessCount = stressResults.filter(r => r.status === 'fulfilled').length

  console.log(`\n🔥 压力测试完成`)
  console.log(`   总请求数: ${stressRequests.length}`)
  console.log(`   成功请求: ${stressSuccessCount}`)
  console.log(`   成功率: ${(stressSuccessCount/stressRequests.length*100).toFixed(1)}%`)
  console.log(`   总耗时: ${stressTestTime.toFixed(0)}ms`)
  console.log(`   QPS: ${(stressSuccessCount/(stressTestTime/1000)).toFixed(2)} 请求/秒`)
  console.log(`   平均响应时间: ${(stressTestTime/stressRequests.length).toFixed(0)}ms`)

  // 最终统计
  console.log('\n' + '='.repeat(60))
  console.log('🎉 测试总结')
  console.log('='.repeat(60))

  const finalStats = router.getStats()
  console.log(`总请求数: ${finalStats.totalRequests}`)
  console.log(`可用服务: ${finalStats.availableServices}`)
  console.log(`缓存条目: ${finalStats.cacheSize}`)

  // 成功率统计
  const allResults = [...concurrentResults, ...stressResults]
  const totalSuccessCount = allResults.filter(r => r.status === 'fulfilled').length
  const totalRequestsCount = allResults.length

  console.log(`\n📊 总体性能指标:`)
  console.log(`   总体成功率: ${(totalSuccessCount/totalRequestsCount*100).toFixed(1)}%`)
  console.log(`   并发处理能力: 支持2-3个并发请求`)
  console.log(`   负载均衡策略: 支持轮询、权重、最少连接策略`)
  console.log(`   智能路由: 基于质量、速度、成本的动态选择`)

  console.log('\n✨ 增强版AI路由器测试完成！')
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { MockEnhancedAIRouter, runTests }