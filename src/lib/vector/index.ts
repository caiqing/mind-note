// 向量存储模块导出

export { VectorService, vectorService } from './vector-service'
export type { VectorEmbedding, SimilarityResult, VectorSearchOptions } from './vector-service'

// 向量工具函数
export class VectorUtils {
  /**
   * 计算余弦相似度
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * 计算欧几里得距离
   */
  static euclideanDistance(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length')
    }

    let sum = 0
    for (let i = 0; i < vecA.length; i++) {
      const diff = vecA[i] - vecB[i]
      sum += diff * diff
    }

    return Math.sqrt(sum)
  }

  /**
   * 向量归一化
   */
  static normalize(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0))

    if (norm === 0) {
      return vec
    }

    return vec.map(val => val / norm)
  }

  /**
   * 将字节数组转换为数字数组
   */
  static bytesToFloatArray(bytes: Buffer): number[] {
    const floatArray = new Float32Array(bytes.buffer)
    return Array.from(floatArray)
  }

  /**
   * 将数字数组转换为字节数组
   */
  static floatArrayToBytes(floats: number[]): Buffer {
    const floatArray = new Float32Array(floats)
    return Buffer.from(floatArray.buffer)
  }

  /**
   * 批量计算相似度
   */
  static batchSimilarity(
    queryVector: number[],
    vectors: number[][],
    metric: 'cosine' | 'euclidean' = 'cosine'
  ): Array<{ index: number; similarity: number }> {
    return vectors.map((vector, index) => {
      const similarity = metric === 'cosine'
        ? this.cosineSimilarity(queryVector, vector)
        : 1 / (1 + this.euclideanDistance(queryVector, vector)) // 转换欧几里得距离为相似度

      return { index, similarity }
    }).sort((a, b) => b.similarity - a.similarity)
  }

  /**
   * 找到最相似的k个向量
   */
  static findTopKSimilar(
    queryVector: number[],
    vectors: number[],
    k: number,
    threshold: number = 0
  ): Array<{ index: number; similarity: number }> {
    const similarities = this.batchSimilarity(queryVector, vectors)
    return similarities
      .filter(item => item.similarity >= threshold)
      .slice(0, k)
  }

  /**
   * 向量聚类（简单的K-means实现）
   */
  static kMeans(
    vectors: number[][],
    k: number,
    maxIterations: number = 100
  ): {
    clusters: number[][]
    centroids: number[][]
    iterations: number
  } {
    if (vectors.length < k) {
      throw new Error('Number of vectors must be greater than k')
    }

    const dimensions = vectors[0].length
    let centroids = vectors.slice(0, k) // 初始化质心
    let clusters: number[][]
    let iterations = 0

    for (let iter = 0; iter < maxIterations; iter++) {
      // 分配向量到最近的质心
      const newClusters: number[][] = Array(k).fill(null).map(() => [])

      vectors.forEach((vector, index) => {
        const similarities = centroids.map(centroid =>
          this.cosineSimilarity(vector, centroid)
        )
        const closestCentroidIndex = similarities.indexOf(Math.max(...similarities))
        newClusters[closestCentroidIndex].push(index)
      })

      // 检查是否收敛
      if (JSON.stringify(newClusters) === JSON.stringify(clusters)) {
        break
      }

      clusters = newClusters

      // 重新计算质心
      centroids = clusters.map(cluster => {
        if (cluster.length === 0) {
          // 如果聚类为空，保持原质心
          return centroids[clusters.indexOf(cluster)]
        }

        const sum = new Array(dimensions).fill(0)
        cluster.forEach(vectorIndex => {
          const vector = vectors[vectorIndex]
          for (let i = 0; i < dimensions; i++) {
            sum[i] += vector[i]
          }
        })

        return sum.map(val => val / cluster.length)
      })

      iterations++
    }

    return {
      clusters,
      centroids,
      iterations
    }
  }

  /**
   * 降维（PCA简单实现）
   */
  static pca(vectors: number[][], components: number = 2): number[][] {
    if (vectors.length === 0 || vectors[0].length === 0) {
      return vectors
    }

    const n = vectors.length
    const d = vectors[0].length

    // 中心化数据
    const means = new Array(d).fill(0)
    vectors.forEach(vector => {
      vector.forEach((val, i) => {
        means[i] += val
      })
    })
    means.forEach((sum, i) => {
      means[i] = sum / n
    })

    const centered = vectors.map(vector =>
      vector.map((val, i) => val - means[i])
    )

    // 计算协方差矩阵
    const covariance = Array(d).fill(null).map(() => Array(d).fill(0))
    centered.forEach(vector => {
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          covariance[i][j] += vector[i] * vector[j]
        }
      }
    })
    covariance.forEach((row, i) => {
      row.forEach((val, j) => {
        covariance[i][j] = val / (n - 1)
      })
    })

    // 简化实现：返回原始数据的前几个主成分
    // 实际PCA需要计算特征值和特征向量
    return centered.map(vector => vector.slice(0, components))
  }
}