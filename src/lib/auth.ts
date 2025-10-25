/**
 * Authentication Library
 *
 * JWT-based authentication system with refresh tokens
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production'
)

export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
  type: 'access' | 'refresh'
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
  createdAt: Date
  updatedAt: Date
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(user: Partial<AuthUser>): Promise<string> {
  const payload = {
    userId: user.id,
    email: user.email,
    type: 'access' as const,
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m') // Access token expires in 15 minutes
    .sign(JWT_SECRET)
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(user: Partial<AuthUser>): Promise<string> {
  const payload = {
    userId: user.id,
    email: user.email,
    type: 'refresh' as const,
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Refresh token expires in 7 days
    .sign(JWT_REFRESH_SECRET)
}

/**
 * Generate both access and refresh tokens
 */
export async function generateAuthTokens(user: Partial<AuthUser>): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user),
  ])

  return { accessToken, refreshToken }
}

/**
 * Verify JWT access token
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (payload.type !== 'access') {
      return null
    }

    return payload as JWTPayload
  } catch (error) {
    console.error('Access token verification failed:', error)
    return null
  }
}

/**
 * Verify JWT refresh token
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET)

    if (payload.type !== 'refresh') {
      return null
    }

    return payload as JWTPayload
  } catch (error) {
    console.error('Refresh token verification failed:', error)
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
 * Generate secure random token
 */
export function generateSecureToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
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

export default {
  generateAccessToken,
  generateRefreshToken,
  generateAuthTokens,
  verifyAccessToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  generateSecureToken,
  extractTokenFromHeader,
  setAuthCookie,
  clearAuthCookies,
}