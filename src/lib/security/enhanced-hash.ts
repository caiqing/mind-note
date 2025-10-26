/**
 * Enhanced Content Hashing System
 *
 * 增强的内容哈希算法系统，提供安全、高效的哈希计算和管理功能
 */

import * as crypto from 'crypto'
import logger from '@/lib/utils/logger'

export interface HashConfig {
  algorithm: 'sha256' | 'sha512' | 'blake2b512' | 'shake256'
  outputEncoding: 'hex' | 'base64' | 'base64url'
  saltLength: number
  iterations: number
  keyLength?: number
  memory?: number
  parallelism?: number
}

export interface HashResult {
  hash: string
  algorithm: string
  salt?: string
  iterations: number
  timestamp: number
  metadata?: Record<string, any>
}

export interface ContentHashOptions {
  algorithm?: HashConfig['algorithm']
  encoding?: HashConfig['outputEncoding']
  includeTimestamp?: boolean
  includeMetadata?: boolean
  customSalt?: string
  iterations?: number
}

/**
 * Enhanced Content Hasher
 */
export class EnhancedContentHasher {
  private static instance: EnhancedContentHasher
  private config: HashConfig
  private saltCache = new Map<string, { salt: string; timestamp: number }>()
  private hashCache = new Map<string, { hash: string; timestamp: number; ttl: number }>()

  private constructor() {
    this.config = {
      algorithm: 'sha256',
      outputEncoding: 'hex',
      saltLength: 32,
      iterations: 100000,
      keyLength: 64,
      memory: 64000,
      parallelism: 4
    }

    // 初始化盐值清理
    this.initializeSaltCleanup()
  }

  static getInstance(): EnhancedContentHasher {
    if (!EnhancedContentHasher.instance) {
      EnhancedContentHasher.instance = new EnhancedContentHasher()
    }
    return EnhancedContentHasher.instance
  }

  /**
   * 初始化盐值清理
   */
  private initializeSaltCleanup(): void {
    // 每小时清理一次过期盐值
    setInterval(() => {
      const now = Date.now()
      const expiredKeys: string[] = []

      for (const [key, data] of this.saltCache.entries()) {
        // 盐值有效期：24小时
        if (now - data.timestamp > 24 * 60 * 60 * 1000) {
          expiredKeys.push(key)
        }
      }

      expiredKeys.forEach(key => this.saltCache.delete(key))

      if (expiredKeys.length > 0) {
        logger.debug('Expired salts cleaned up', { count: expiredKeys.length })
      }
    }, 60 * 60 * 1000) // 1小时

    // 每5分钟清理一次过期哈希缓存
    setInterval(() => {
      const now = Date.now()
      const expiredKeys: string[] = []

      for (const [key, data] of this.hashCache.entries()) {
        if (now - data.timestamp > data.ttl) {
          expiredKeys.push(key)
        }
      }

      expiredKeys.forEach(key => this.hashCache.delete(key))

      if (expiredKeys.length > 0) {
        logger.debug('Expired hashes cleaned up', { count: expiredKeys.length })
      }
    }, 5 * 60 * 1000) // 5分钟
  }

  /**
   * 获取或生成盐值
   */
  private getSalt(identifier?: string): string {
    if (identifier && this.saltCache.has(identifier)) {
      const cached = this.saltCache.get(identifier)!
      // 检查盐值是否仍然有效
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        return cached.salt
      }
    }

    const salt = crypto.randomBytes(this.config.saltLength).toString(this.config.outputEncoding)

    if (identifier) {
      this.saltCache.set(identifier, {
        salt,
        timestamp: Date.now()
      })
    }

    return salt
  }

  /**
   * 生成哈希
   */
  generateHash(
    content: string,
    options: ContentHashOptions = {}
  ): HashResult {
    const startTime = Date.now()

    try {
      const algorithm = options.algorithm || this.config.algorithm
      const encoding = options.encoding || this.config.outputEncoding
      const iterations = options.iterations || this.config.iterations
      const includeTimestamp = options.includeTimestamp !== false
      const includeMetadata = options.includeMetadata === true

      // 生成或使用自定义盐值
      const salt = options.customSalt || this.getSalt('content-hash')

      // 准备哈希内容
      let hashContent = content
      if (includeTimestamp) {
        hashContent += `|timestamp:${Date.now()}`
      }

      // 根据算法选择合适的哈希方法
      let hash: string

      switch (algorithm) {
        case 'sha256':
          hash = this.hashWithPBKDF2(hashContent, salt, iterations, encoding)
          break
        case 'sha512':
          hash = this.hashWithPBKDF2(hashContent, salt, iterations, encoding, 'sha512')
          break
        case 'blake2b512':
          hash = this.hashWithBlake2b(hashContent, salt, encoding)
          break
        case 'shake256':
          hash = this.hashWithShake256(hashContent, salt, encoding)
          break
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`)
      }

      const result: HashResult = {
        hash,
        algorithm,
        iterations,
        timestamp: Date.now()
      }

      // 可选：包含盐值（用于验证）
      if (options.customSalt) {
        result.salt = salt
      }

      // 可选：包含元数据
      if (includeMetadata) {
        result.metadata = {
          contentLength: content.length,
          processingTime: Date.now() - startTime,
          algorithm,
          encoding
        }
      }

      logger.debug('Content hash generated', {
        algorithm,
        iterations,
        contentLength: content.length,
        processingTime: Date.now() - startTime
      })

      return result

    } catch (error) {
      logger.error('Content hash generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content.length
      })
      throw new Error(`Hash generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 使用PBKDF2生成哈希
   */
  private hashWithPBKDF2(
    content: string,
    salt: string,
    iterations: number,
    encoding: BufferEncoding,
    digest: 'sha256' | 'sha512' = 'sha256'
  ): string {
    return crypto.pbkdf2Sync(content, salt, iterations, this.config.keyLength || 32, digest).toString(encoding)
  }

  /**
   * 使用BLAKE2b生成哈希
   */
  private hashWithBlake2b(content: string, salt: string, encoding: BufferEncoding): string {
    try {
      const blake2b = require('blake2b') as typeof import('blake2b')
      const hash = blake2b.createHash('blake2b512')

      hash.update(content)
      hash.update(salt)

      return hash.digest(encoding)
    } catch (error) {
      // 如果BLAKE2b不可用，回退到SHA-512
      logger.warn('BLAKE2b not available, falling back to SHA-512', { error: error.message })
      return this.hashWithPBKDF2(content, salt, 100000, encoding, 'sha512')
    }
  }

  /**
   * 使用SHAKE256生成哈希
   */
  private hashWithShake256(content: string, salt: string, encoding: BufferEncoding): string {
    const shake = crypto.createHash('shake256', { outputLength: 64 })

    shake.update(content)
    shake.update(salt)

    return shake.digest(encoding)
  }

  /**
   * 生成文件哈希
   */
  async generateFileHash(
    filePath: string,
    options: ContentHashOptions = {}
  ): Promise<HashResult> {
    try {
      const fs = require('fs').promises
      const content = await fs.readFile(filePath, 'utf8')

      const result = this.generateHash(content, options)

      // 添加文件元数据
      if (result.metadata) {
        const stats = await fs.stat(filePath)
        result.metadata = {
          ...result.metadata,
          filePath,
          fileSize: stats.size,
          lastModified: stats.mtime.getTime()
        }
      }

      return result

    } catch (error) {
      logger.error('File hash generation failed', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error(`File hash generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 生成流式哈希
   */
  generateStreamHash(
    stream: NodeJS.ReadableStream,
    options: ContentHashOptions = {}
  ): Promise<HashResult> {
    return new Promise((resolve, reject) => {
      try {
        const algorithm = options.algorithm || this.config.algorithm
        const salt = options.customSalt || this.getSalt('stream-hash')
        const iterations = options.iterations || this.config.iterations

        let hash: crypto.Hash

        switch (algorithm) {
          case 'sha256':
            hash = crypto.createHash('sha256')
            break
          case 'sha512':
            hash = crypto.createHash('sha512')
            break
          case 'blake2b512':
            try {
              const blake2b = require('blake2b')
              hash = blake2b.createHash('blake2b512')
            } catch (error) {
              hash = crypto.createHash('sha512')
            }
            break
          case 'shake256':
            hash = crypto.createHash('shake256', { outputLength: 64 })
            break
          default:
            hash = crypto.createHash('sha256')
        }

        hash.update(salt)

        let contentLength = 0
        stream.on('data', (chunk: Buffer) => {
          hash.update(chunk)
          contentLength += chunk.length
        })

        stream.on('end', () => {
          const finalHash = hash.digest(options.encoding || this.config.outputEncoding)

          const result: HashResult = {
            hash: finalHash,
            algorithm,
            iterations: 1, // 流式哈希不需要多次迭代
            timestamp: Date.now(),
            salt
          }

          if (options.includeMetadata) {
            result.metadata = {
              contentLength,
              stream: true,
              algorithm,
              encoding: options.encoding || this.config.outputEncoding
            }
          }

          resolve(result)
        })

        stream.on('error', (error) => {
          reject(new Error(`Stream hash failed: ${error.message}`))
        })

      } catch (error) {
        reject(new Error(`Stream hash setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  /**
   * 验证哈希
   */
  verifyHash(
    content: string,
    hashResult: HashResult,
    options: ContentHashOptions = {}
  ): boolean {
    try {
      const newHash = this.generateHash(content, {
        algorithm: hashResult.algorithm as HashConfig['algorithm'],
        customSalt: hashResult.salt,
        iterations: hashResult.iterations,
        encoding: options.encoding || this.config.outputEncoding,
        includeTimestamp: options.includeTimestamp
      })

      // 比较哈希值（使用时间安全的比较）
      return crypto.timingSafeEqual(
        Buffer.from(newHash.hash, this.config.outputEncoding),
        Buffer.from(hashResult.hash, this.config.outputEncoding)
      )

    } catch (error) {
      logger.error('Hash verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * 生成 HMAC
   */
  generateHMAC(
    content: string,
    secret: string,
    algorithm: 'sha256' | 'sha512' = 'sha256'
  ): string {
    try {
      const hmac = crypto.createHmac(algorithm, secret)
      hmac.update(content)

      return hmac.digest(this.config.outputEncoding)
    } catch (error) {
      logger.error('HMAC generation failed', {
        algorithm,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error(`HMAC generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 缓存哈希结果
   */
  cacheHash(
    key: string,
    hashResult: HashResult,
    ttlMs: number = 5 * 60 * 1000 // 5分钟默认TTL
  ): void {
    this.hashCache.set(key, {
      hash: hashResult.hash,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  /**
   * 获取缓存的哈希
   */
  getCachedHash(key: string): HashResult | null {
    const cached = this.hashCache.get(key)
    if (!cached) {
      return null
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.hashCache.delete(key)
      return null
    }

    return {
      hash: cached.hash,
      algorithm: 'cached',
      iterations: cached.iterations,
      timestamp: cached.timestamp
    }
  }

  /**
   * 生成内容指纹（用于重复检测）
   */
  generateContentFingerprint(content: string): string {
    // 使用多种算法组合生成更安全的指纹
    const sha256 = this.generateHash(content, { algorithm: 'sha256' })
    const blake2b = this.generateHash(content, { algorithm: 'blake2b512' })

    // 组合多个哈希值
    return `${sha256.hash.substring(0, 16)}-${blake2b.hash.substring(0, 16)}`
  }

  /**
   * 生成安全验证令牌
   */
  generateSecureToken(
    payload: any,
    secret: string,
    expiresIn: number = 3600 // 1小时
  ): { token: string; expiresAt: number } {
    try {
      const timestamp = Date.now()
      const expiresAt = timestamp + expiresIn * 1000

      const tokenData = {
        payload,
        timestamp,
        expiresAt,
        nonce: crypto.randomBytes(16).toString('hex')
      }

      const token = this.generateHMAC(
        JSON.stringify(tokenData),
        secret,
        'sha512'
      )

      return {
        token: `${timestamp}:${token}`,
        expiresAt
      }

    } catch (error) {
      logger.error('Secure token generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error(`Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 验证安全令牌
   */
  verifySecureToken(
    token: string,
    secret: string
  ): { valid: boolean; payload?: any; expired?: boolean } {
    try {
      const [timestampStr, hash] = token.split(':', 2)

      if (!timestampStr || !hash) {
        return { valid: false }
      }

      const timestamp = parseInt(timestampStr, 10)
      if (isNaN(timestamp)) {
        return { valid: false }
      }

      // 检查是否过期
      const isExpired = Date.now() > timestamp + 3600 * 1000 // 1小时

      if (isExpired) {
        return { valid: false, expired: true }
      }

      // 重新生成哈希进行验证
      const expectedHash = this.generateHMAC(
        `${timestamp}:${hash}`,
        secret,
        'sha512'
      )

      const isValid = crypto.timingSafeEqual(
        Buffer.from(hash, this.config.outputEncoding),
        Buffer.from(expectedHash, this.config.outputEncoding)
      )

      return { valid: isValid }

    } catch (error) {
      logger.error('Secure token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return { valid: false }
    }
  }

  /**
   * 获取配置信息
   */
  getConfig(): HashConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<HashConfig>): void {
    this.config = { ...this.config, ...newConfig }
    logger.info('Hash configuration updated', { newConfig: this.config })
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.saltCache.clear()
    this.hashCache.clear()
    logger.info('Hash cache cleared')
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    saltCache: { size: number };
    hashCache: { size: number };
  } {
    return {
      saltCache: { size: this.saltCache.size },
      hashCache: { size: this.hashCache.size }
    };
  }
}

/**
 * 导出单例实例
 */
export const contentHasher = EnhancedContentHasher.getInstance()

/**
 * 便捷函数：生成内容哈希
 */
export function hashContent(
  content: string,
  options?: ContentHashOptions
): HashResult {
  return contentHasher.generateHash(content, options)
}

/**
 * 便捷函数：验证哈希
 */
export function verifyHash(
  content: string,
  hashResult: HashResult,
  options?: ContentHashOptions
): boolean {
  return contentHasher.verifyHash(content, hashResult, options)
}

/**
 * 便捷函数：生成HMAC
 */
export function generateHMAC(
  content: string,
  secret: string,
  algorithm?: 'sha256' | 'sha512'
): string {
  return contentHasher.generateHMAC(content, secret, algorithm)
}

/**
 * 便捷函数：生成内容指纹
 */
export function generateContentFingerprint(content: string): string {
  return contentHasher.generateContentFingerprint(content)
}