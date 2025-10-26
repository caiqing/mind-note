/**
 * Enhanced Authentication Library
 *
 * 增强的JWT认证系统，包含安全令牌生成、验证和管理功能
 */

import * as jwt from 'jsonwebtoken'
import * as bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import * as crypto from 'crypto'
import logger from '@/lib/utils/logger'

// 安全的密钥生成和验证
function getSecureKey(secretName: string): Uint8Array {
  const secret = process.env[secretName]

  if (!secret) {
    throw new Error(`Missing required environment variable: ${secretName}`)
  }

  // 验证密钥强度（至少32字符）
  if (secret.length < 32) {
    throw new Error(`Environment variable ${secretName} must be at least 32 characters long`)
  }

  return new TextEncoder().encode(secret)
}

const JWT_SECRET = getSecureKey('JWT_SECRET')
const JWT_REFRESH_SECRET = getSecureKey('JWT_REFRESH_SECRET')

export interface JWTPayload {
  userId: string
  email: string
  sessionId?: string
  iat?: number
  exp?: number
  type: 'access' | 'refresh'
  scope?: string[]
}

export interface TokenMetadata {
  issuedAt: Date
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
  roles?: string[]
  permissions?: string[]
  isActive?: boolean
  emailVerified?: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Generate JWT access token with enhanced security
 */
export async function generateAccessToken(
  user: Partial<AuthUser>,
  metadata?: TokenMetadata,
  scopes: string[] = []
): Promise<string> {
  const sessionId = generateSecureToken(16)
  const payload = {
    userId: user.id,
    email: user.email,
    sessionId,
    type: 'access' as const,
    scope: scopes,
  }

  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('15m') // Access token expires in 15 minutes
      .setIssuer('mindnote')
      .setAudience('mindnote-users')
      .setJti(crypto.randomUUID()) // JWT ID for token tracking
      .sign(JWT_SECRET)

    logger.info('Access token generated', {
      userId: user.id,
      sessionId,
      scopes,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent
    })

    return token
  } catch (error) {
    logger.error('Failed to generate access token:', error)
    throw new Error('Token generation failed')
  }
}

/**
 * Generate JWT refresh token with enhanced security
 */
export async function generateRefreshToken(
  user: Partial<AuthUser>,
  metadata?: TokenMetadata
): Promise<string> {
  const sessionId = generateSecureToken(16)
  const payload = {
    userId: user.id,
    email: user.email,
    sessionId,
    type: 'refresh' as const,
  }

  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('7d') // Refresh token expires in 7 days
      .setIssuer('mindnote')
      .setAudience('mindnote-users')
      .setJti(crypto.randomUUID()) // JWT ID for token tracking
      .sign(JWT_REFRESH_SECRET)

    logger.info('Refresh token generated', {
      userId: user.id,
      sessionId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent
    })

    return token
  } catch (error) {
    logger.error('Failed to generate refresh token:', error)
    throw new Error('Refresh token generation failed')
  }
}

/**
 * Generate both access and refresh tokens with metadata
 */
export async function generateAuthTokens(
  user: Partial<AuthUser>,
  metadata?: TokenMetadata,
  scopes: string[] = []
): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user, metadata, scopes),
    generateRefreshToken(user, metadata),
  ])

  return { accessToken, refreshToken }
}

/**
 * Verify JWT access token with enhanced validation
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'mindnote',
      audience: 'mindnote-users'
    })

    // Validate token type
    if (payload.type !== 'access') {
      logger.warn('Invalid token type provided for access token verification', {
        type: payload.type,
        token: token.substring(0, 10) + '...'
      })
      return null
    }

    // Validate required fields
    if (!payload.userId || !payload.email) {
      logger.warn('Access token missing required fields', {
        userId: payload.userId,
        email: payload.email,
        token: token.substring(0, 10) + '...'
      })
      return null
    }

    logger.debug('Access token verified successfully', {
      userId: payload.userId,
      sessionId: payload.sessionId,
      scope: payload.scope
    })

    return payload as unknown as JWTPayload
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'JWTExpired') {
        logger.warn('Access token expired', {
          error: error.message,
          token: token.substring(0, 10) + '...'
        })
      } else if (error.name === 'JWTInvalid') {
        logger.warn('Invalid access token', {
          error: error.message,
          token: token.substring(0, 10) + '...'
        })
      } else {
        logger.error('Access token verification error:', {
          error: error.message,
          stack: error.stack,
          token: token.substring(0, 10) + '...'
        })
      }
    }
    return null
  }
}

/**
 * Verify JWT refresh token with enhanced validation
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET, {
      issuer: 'mindnote',
      audience: 'mindnote-users'
    })

    // Validate token type
    if (payload.type !== 'refresh') {
      logger.warn('Invalid token type provided for refresh token verification', {
        type: payload.type,
        token: token.substring(0, 10) + '...'
      })
      return null
    }

    // Validate required fields
    if (!payload.userId || !payload.email) {
      logger.warn('Refresh token missing required fields', {
        userId: payload.userId,
        email: payload.email,
        token: token.substring(0, 10) + '...'
      })
      return null
    }

    logger.debug('Refresh token verified successfully', {
      userId: payload.userId,
      sessionId: payload.sessionId
    })

    return payload as unknown as JWTPayload
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'JWTExpired') {
        logger.warn('Refresh token expired', {
          error: error.message,
          token: token.substring(0, 10) + '...'
        })
      } else if (error.name === 'JWTInvalid') {
        logger.warn('Invalid refresh token', {
          error: error.message,
          token: token.substring(0, 10) + '...'
        })
      } else {
        logger.error('Refresh token verification error:', {
          error: error.message,
          stack: error.stack,
          token: token.substring(0, 10) + '...'
        })
      }
    }
    return null
  }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate cryptographically secure random token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('base64url').substring(0, length)
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
  score: number
} {
  const errors: string[] = []
  let score = 0

  // Length check
  if (password.length < 8) {
    errors.push('密码长度至少需要8个字符')
  } else if (password.length >= 12) {
    score += 2
  } else {
    score += 1
  }

  // Character complexity checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 2

  // Common patterns check
  if (/(.)\1{2,}/.test(password)) {
    errors.push('密码不能包含连续重复字符')
    score -= 1
  }

  if (/123|abc|qwe/i.test(password)) {
    errors.push('密码不能包含常见的连续字符模式')
    score -= 1
  }

  return {
    isValid: errors.length === 0 && score >= 4,
    errors,
    score: Math.max(0, Math.min(10, score))
  }
}

/**
 * Check if password needs to be rehashed
 */
export async function needsRehash(passwordHash: string): Promise<boolean> {
  try {
    // Extract the salt rounds from the hash
    const match = passwordHash.match(/^\$2[aby]\$(\d+)\$/)
    if (!match) return true

    const currentRounds = parseInt(match[1])
    const recommendedRounds = 12

    return currentRounds < recommendedRounds
  } catch (error) {
    logger.error('Error checking password rehash:', error)
    return true // Rehash if we can't determine
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

/**
 * Set HTTP-only cookie with token
 */
export function setAuthCookie(res: any, tokens: AuthTokens) {
  // Access token cookie (15 minutes)
  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  })

  // Refresh token cookie (7 days)
  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  })
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(res: any) {
  res.cookie('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  res.cookie('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const payload = await verifyRefreshToken(refreshToken)

    if (!payload) {
      logger.warn('Refresh token verification failed during token refresh')
      return null
    }

    // Here you would typically check if the refresh token is still valid in your database
    // For now, we'll generate a new access token

    const newAccessToken = await generateAccessToken({
      id: payload.userId,
      email: payload.email
    })

    logger.info('Access token refreshed successfully', {
      userId: payload.userId,
      sessionId: payload.sessionId
    })

    return newAccessToken
  } catch (error) {
    logger.error('Failed to refresh access token:', error)
    return null
  }
}

/**
 * Create a secure session token
 */
export async function createSessionToken(user: Partial<AuthUser>): Promise<string> {
  const sessionId = generateSecureToken(32)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  // In a real implementation, you would store this in your database
  // For now, return a session token that includes the session ID
  const sessionPayload = {
    sessionId,
    userId: user.id,
    expiresAt: expiresAt.toISOString()
  }

  const sessionToken = await new SignJWT(sessionPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setIssuer('mindnote')
    .sign(JWT_SECRET)

  return sessionToken
}

/**
 * Validate session token
 */
export async function validateSessionToken(sessionToken: string): Promise<{
  sessionId: string
  userId: string
  valid: boolean
} | null> {
  try {
    const { payload } = await jwtVerify(sessionToken, JWT_SECRET, {
      issuer: 'mindnote'
    })

    // Check if session has expired
    if (payload.expiresAt && new Date(payload.expiresAt as string) < new Date()) {
      return null
    }

    return {
      sessionId: payload.sessionId as string,
      userId: payload.userId as string,
      valid: true
    }
  } catch (error) {
    logger.error('Session token validation failed:', error)
    return null
  }
}

/**
 * Rate limiting helper for authentication attempts
 */
const authAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>()

export function checkAuthRateLimit(identifier: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): {
  allowed: boolean
  remainingAttempts: number
  blockedUntil?: Date
} {
  const now = Date.now()
  const attempts = authAttempts.get(identifier)

  if (!attempts || now - attempts.lastAttempt > windowMs) {
    // Reset or initialize counter
    authAttempts.set(identifier, { count: 1, lastAttempt: now })
    return { allowed: true, remainingAttempts: maxAttempts - 1 }
  }

  // Check if currently blocked
  if (attempts.blockedUntil && now < attempts.blockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(attempts.blockedUntil)
    }
  }

  // Check if rate limit exceeded
  if (attempts.count >= maxAttempts) {
    const blockedUntil = now + windowMs
    attempts.blockedUntil = blockedUntil
    attempts.count = 1
    attempts.lastAttempt = now

    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(blockedUntil)
    }
  }

  // Increment counter
  attempts.count++
  attempts.lastAttempt = now

  return {
    allowed: true,
    remainingAttempts: maxAttempts - attempts.count
  }
}

/**
 * Clear authentication attempts for an identifier
 */
export function clearAuthAttempts(identifier: string): void {
  authAttempts.delete(identifier)
}

/**
 * Generate API key for user
 */
export async function generateAPIKey(userId: string, scopes: string[] = []): Promise<{
  keyId: string
  apiKey: string
}> {
  const keyId = crypto.randomUUID()
  const keySecret = generateSecureToken(32)

  const payload = {
    keyId,
    userId,
    scopes,
    type: 'api' as const
  }

  const apiKey = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT', kid: keyId })
    .setIssuedAt()
    .setExpirationTime('1y') // API keys expire after 1 year
    .setIssuer('mindnote')
    .setAudience('mindnote-api')
    .sign(JWT_SECRET)

  logger.info('API key generated', {
    keyId,
    userId,
    scopes
  })

  return { keyId, apiKey }
}

/**
 * Verify API key
 */
export async function verifyAPIKey(apiKey: string): Promise<{
  keyId: string
  userId: string
  scopes: string[]
  valid: boolean
} | null> {
  try {
    const { payload } = await jwtVerify(apiKey, JWT_SECRET, {
      issuer: 'mindnote',
      audience: 'mindnote-api'
    })

    if (payload.type !== 'api') {
      return null
    }

    return {
      keyId: payload.keyId as string,
      userId: payload.userId as string,
      scopes: (payload.scopes as string[]) || [],
      valid: true
    }
  } catch (error) {
    logger.error('API key verification failed:', error)
    return null
  }
}

export default {
  generateAccessToken,
  generateRefreshToken,
  generateAuthTokens,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  hashPassword,
  comparePassword,
  generateSecureToken,
  generateCSRFToken,
  validatePasswordStrength,
  needsRehash,
  extractTokenFromHeader,
  setAuthCookie,
  clearAuthCookies,
  createSessionToken,
  validateSessionToken,
  checkAuthRateLimit,
  clearAuthAttempts,
  generateAPIKey,
  verifyAPIKey,
}