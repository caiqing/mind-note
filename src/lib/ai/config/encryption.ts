// API密钥加密存储

import crypto from 'crypto'

// 加密密钥（在生产环境中应该从安全的地方获取）
const ENCRYPTION_KEY = process.env.AI_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-gcm'

/**
 * 加密API密钥
 */
export function encryptApiKey(apiKey: string): string {
  try {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'))

    let encrypted = cipher.update(apiKey, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // 组合 iv + authTag + encrypted
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Error encrypting API key:', error)
    throw new Error('Failed to encrypt API key')
  }
}

/**
 * 解密API密钥
 */
export function decryptApiKey(encryptedKey: string): string {
  try {
    const parts = encryptedKey.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted key format')
    }

    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipher(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'))
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Error decrypting API key:', error)
    throw new Error('Failed to decrypt API key')
  }
}

/**
 * 验证API密钥格式
 */
export function validateApiKey(key: string, provider: 'openai' | 'anthropic'): boolean {
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
 * 生成随机加密密钥
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}