/**
 * Authentication Middleware
 *
 * JWT authentication middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractTokenFromHeader, AuthUser } from './auth'

// Extend the Request interface to include user
declare global {
  interface Request {
    user?: AuthUser
  }
}

/**
 * Authentication middleware for API routes
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest & { user: AuthUser }) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader || undefined)

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'No token provided' },
        { status: 401 }
      )
    }

    // Verify the token
    const payload = await verifyAccessToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'Token is invalid or expired' },
        { status: 401 }
      )
    }

    // TODO: Fetch user from database
    // For now, create a mock user object
    const user: AuthUser = {
      id: payload.userId,
      email: payload.email,
      name: 'User', // This should be fetched from database
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Add user to request object
    const authenticatedRequest = request as NextRequest & { user }
    authenticatedRequest.user = user

    // Call the handler with the authenticated request
    return await handler(authenticatedRequest)
  } catch (error) {
    console.error('Authentication middleware error:', error)
    return NextResponse.json(
      { error: 'Authentication failed', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (request: NextRequest & { user?: AuthUser }) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader || undefined)

    if (token) {
      const payload = await verifyAccessToken(token)

      if (payload) {
        // TODO: Fetch user from database
        const user: AuthUser = {
          id: payload.userId,
          email: payload.email,
          name: 'User',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const authenticatedRequest = request as NextRequest & { user }
        authenticatedRequest.user = user
        return await handler(authenticatedRequest)
      }
    }

    // Call handler without authentication
    return await handler(request as NextRequest & { user?: AuthUser })
  } catch (error) {
    console.error('Optional authentication middleware error:', error)
    return NextResponse.json(
      { error: 'Authentication failed', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Role-based access control middleware
 */
export function withRole(requiredRole: string) {
  return async (
    request: NextRequest & { user: AuthUser },
    handler: (request: NextRequest & { user: AuthUser }) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      // TODO: Check user role from database
      // For now, assume all users have 'user' role
      const userRole = 'user'

      if (userRole !== requiredRole && userRole !== 'admin') {
        return NextResponse.json(
          { error: 'Access denied', message: `Requires ${requiredRole} role` },
          { status: 403 }
        )
      }

      return await handler(request)
    } catch (error) {
      console.error('Role-based access control error:', error)
      return NextResponse.json(
        { error: 'Access control failed', message: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Rate limiting middleware
 */
const rateLimitStore = new Map<string, { count: number; lastReset: number }>()

export function withRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const clientIP = request.ip ||
                     request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    const now = Date.now()
    const windowStart = now - windowMs

    // Get or create rate limit data for this IP
    let rateLimitData = rateLimitStore.get(clientIP)

    if (!rateLimitData || rateLimitData.lastReset < windowStart) {
      rateLimitData = { count: 0, lastReset: now }
      rateLimitStore.set(clientIP, rateLimitData)
    }

    // Check rate limit
    if (rateLimitData.count >= maxRequests) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        },
        { status: 429 }
      )
    }

    // Increment request count
    rateLimitData.count++

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      for (const [ip, data] of rateLimitStore.entries()) {
        if (data.lastReset < windowStart) {
          rateLimitStore.delete(ip)
        }
      }
    }

    return await handler(request)
  }
}

export default {
  withAuth,
  withOptionalAuth,
  withRole,
  withRateLimit,
}