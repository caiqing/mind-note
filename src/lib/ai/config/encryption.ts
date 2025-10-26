// 加密服务 - 用于API密钥和敏感数据的加密存储
// 使用AES-256-GCM加密算法

import crypto from 'crypto'
import { Logger } from '@/lib/ai/services/logger'

export interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
  tagLength: number
  encoding: BufferEncoding
}

export interface EncryptedData {
  data: string // Base64编码的加密数据
  iv: string   // Base64编码的初始化向量
  tag: string  // Base64编码的认证标签
  algorithm: string
  keyId?: string // 密钥标识符，用于密钥轮换
}

export class EncryptionService {
  private static instance: EncryptionService
  private logger = Logger.getInstance()
  private config: EncryptionConfig
  private masterKey: Buffer
  private keyRotationMap = new Map<string, Buffer>()

  private constructor() {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32, // 256 bits
      ivLength: 16,   // 128 bits
      tagLength: 16,  // 128 bits
      encoding: 'base64'
    }

    this.masterKey = this.loadMasterKey()
    this.logger.info('加密服务初始化完成', {
      algorithm: this.config.algorithm,
      keyId: this.getCurrentKeyId()
    })
  }

  /**
   * 获取单例实例
   */
  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService()
    }
    return EncryptionService.instance
  }

  /**
   * 加载主密钥
   */
  private loadMasterKey(): Buffer {
    const encryptionKey = process.env.ENCRYPTION_MASTER_KEY
    if (!encryptionKey) {
      // 在开发环境中生成临时密钥，生产环境必须提供
      if (process.env.NODE_ENV === 'development') {
        const tempKey = crypto.randomBytes(this.config.keyLength).toString('hex')
        this.logger.warn('使用临时加密密钥（仅限开发环境）')
        return Buffer.from(tempKey, 'hex')
      }
      throw new Error('ENCRYPTION_MASTER_KEY环境变量未设置')
    }

    try {
      return Buffer.from(encryptionKey, 'hex')
    } catch (error) {
      throw new Error('无效的ENCRYPTION_MASTER_KEY格式，应为32字节的十六进制字符串')
    }
  }

  /**
   * 获取当前密钥ID
   */
  private getCurrentKeyId(): string {
    return process.env.ENCRYPTION_KEY_ID || 'default-key-v1'
  }

  /**
   * 加密数据 (使用安全的createCipheriv)
   */
  encrypt(plaintext: string): EncryptedData {
    try {
      const iv = crypto.randomBytes(this.config.ivLength)
      // 使用安全的createCipheriv替代废弃的createCipher
      const cipher = crypto.createCipheriv(this.config.algorithm, this.masterKey, iv)
      cipher.setAAD(Buffer.from(this.getCurrentKeyId())) // 附加认证数据

      let encrypted = cipher.update(plaintext, 'utf8', this.config.encoding)
      encrypted += cipher.final(this.config.encoding)

      const tag = cipher.getAuthTag()

      const result: EncryptedData = {
        data: encrypted,
        iv: iv.toString(this.config.encoding),
        tag: tag.toString(this.config.encoding),
        algorithm: this.config.algorithm,
        keyId: this.getCurrentKeyId()
      }

      this.logger.debug('数据加密成功', {
        algorithm: result.algorithm,
        keyId: result.keyId,
        dataLength: plaintext.length
      })

      return result
    } catch (error) {
      this.logger.error('数据加密失败', { error: error.message })
      throw new Error(`加密失败: ${error.message}`)
    }
  }

  /**
   * 解密数据 (使用安全的createDecipheriv)
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      const iv = Buffer.from(encryptedData.iv, this.config.encoding)
      const tag = Buffer.from(encryptedData.tag, this.config.encoding)

      // 使用安全的createDecipheriv替代废弃的createDecipher
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, this.masterKey, iv)
      decipher.setAAD(Buffer.from(encryptedData.keyId || ''))
      decipher.setAuthTag(tag)

      let decrypted = decipher.update(encryptedData.data, this.config.encoding, 'utf8')
      decrypted += decipher.final('utf8')

      this.logger.debug('数据解密成功', {
        algorithm: encryptedData.algorithm,
        keyId: encryptedData.keyId
      })

      return decrypted
    } catch (error) {
      this.logger.error('数据解密失败', {
        error: error.message,
        keyId: encryptedData.keyId
      })
      throw new Error(`解密失败: ${error.message}`)
    }
  }

  /**
   * 加密API密钥
   */
  encryptApiKey(apiKey: string, provider: string): EncryptedData {
    // 为API密钥添加前缀以便识别
    const prefixedKey = `${provider}:${apiKey}`
    return this.encrypt(prefixedKey)
  }

  /**
   * 解密API密钥
   */
  decryptApiKey(encryptedData: EncryptedData, expectedProvider?: string): string {
    const decrypted = this.decrypt(encryptedData)

    // 验证提供商前缀
    const [provider, apiKey] = decrypted.split(':', 2)
    if (expectedProvider && provider !== expectedProvider) {
      throw new Error(`API密钥提供商不匹配，期望: ${expectedProvider}, 实际: ${provider}`)
    }

    return apiKey
  }

  /**
   * 验证API密钥格式
   */
  validateApiKey(key: string, provider: 'openai' | 'anthropic'): boolean {
    switch (provider) {
      case 'openai':
        // OpenAI API密钥格式: sk-...
        return /^sk-[A-Za-z0-9]{48}$/.test(key)
      case 'anthropic':
        // Anthropic API密钥格式: sk-ant-...
        return /^sk-ant-[A-Za-z0-9_-]{95}$/.test(key)
      default:
        return false
    }
  }

  /**
   * 安全存储API密钥到环境变量
   */
  async storeApiKey(provider: string, apiKey: string): Promise<void> {
    try {
      const encrypted = this.encryptApiKey(apiKey, provider)
      const envVarName = `${provider.toUpperCase()}_API_KEY_ENCRYPTED`

      // 存储加密后的密钥到环境变量（在实际应用中可能需要使用密钥管理服务）
      process.env[envVarName] = JSON.stringify(encrypted)

      this.logger.info('API密钥已安全存储', {
        provider,
        envVar: envVarName
      })
    } catch (error) {
      this.logger.error('API密钥存储失败', {
        provider,
        error: error.message
      })
      throw error
    }
  }

  /**
   * 从环境变量安全读取API密钥
   */
  async loadApiKey(provider: string): Promise<string> {
    try {
      // 首先尝试读取未加密的密钥（向后兼容）
      const plainKey = process.env[`${provider.toUpperCase()}_API_KEY`]
      if (plainKey) {
        this.logger.warn('使用未加密的API密钥（建议迁移到加密存储）', { provider })
        return plainKey
      }

      // 尝试读取加密的密钥
      const encryptedEnv = process.env[`${provider.toUpperCase()}_API_KEY_ENCRYPTED`]
      if (!encryptedEnv) {
        throw new Error(`${provider.toUpperCase()}_API_KEY或${provider.toUpperCase()}_API_KEY_ENCRYPTED环境变量未设置`)
      }

      const encryptedData: EncryptedData = JSON.parse(encryptedEnv)
      const apiKey = this.decryptApiKey(encryptedData, provider)

      this.logger.info('API密钥解密成功', { provider })
      return apiKey
    } catch (error) {
      this.logger.error('API密钥读取失败', {
        provider,
        error: error.message
      })
      throw error
    }
  }

  /**
   * 生成新的加密密钥（用于密钥轮换）
   */
  generateNewMasterKey(): string {
    const newKey = crypto.randomBytes(this.config.keyLength)
    const keyId = `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // 存储旧密钥以支持解密旧数据
    this.keyRotationMap.set(keyId, this.masterKey)

    this.logger.info('生成了新的主密钥', {
      newKeyId: keyId,
      oldKeysCount: this.keyRotationMap.size
    })

    return newKey.toString('hex')
  }

  /**
   * 生成随机加密密钥
   */
  generateEncryptionKey(): string {
    return crypto.randomBytes(this.config.keyLength).toString('hex')
  }

  /**
   * 获取加密配置信息
   */
  getConfig() {
    return {
      algorithm: this.config.algorithm,
      keyId: this.getCurrentKeyId(),
      keyRotationEnabled: this.keyRotationMap.size > 0,
      rotatingKeysCount: this.keyRotationMap.size
    }
  }

  /**
   * 验证加密服务状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testData = 'test-encryption-' + Date.now()
      const encrypted = this.encrypt(testData)
      const decrypted = this.decrypt(encrypted)

      return decrypted === testData
    } catch (error) {
      this.logger.error('加密服务健康检查失败', { error: error.message })
      return false
    }
  }
}

// 向后兼容的函数
const encryptionService = EncryptionService.getInstance()

export function encryptApiKey(apiKey: string): string {
  const encrypted = encryptionService.encrypt(apiKey)
  return `${encrypted.iv}:${encrypted.tag}:${encrypted.data}`
}

export function decryptApiKey(encryptedKey: string): string {
  const parts = encryptedKey.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted key format')
  }

  const encryptedData: EncryptedData = {
    iv: parts[0],
    tag: parts[1],
    data: parts[2],
    algorithm: 'aes-256-gcm'
  }

  return encryptionService.decrypt(encryptedData)
}

export { validateApiKey, generateEncryptionKey, EncryptionService }