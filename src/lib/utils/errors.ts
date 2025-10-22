import { NextResponse } from 'next/server'
import logger from './logger'
import { APIError } from '@/lib/api/errors'

export function handleAPIError(error: unknown): NextResponse {
  logger.error('API Error:', error)

  if (error instanceof APIError) {
    return NextResponse.json(error.toJSON(), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: 'INTERNAL_ERROR',
        },
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }

  return NextResponse.json(
    {
      error: {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      },
    },
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

export function asyncHandler<T>(
  handler: () => Promise<T>
): Promise<NextResponse | T> {
  try {
    return handler()
  } catch (error) {
    return handleAPIError(error)
  }
}

// Validation helper
export function validateRequired<T>(data: T, requiredFields: (keyof T)[]): string[] {
  const missingFields: string[] = []

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(String(field))
    }
  }

  return missingFields
}

// Rate limiting helper
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; resetTime?: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || now > record.resetTime) {
    // Create new record or reset expired record
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return { allowed: true }
  }

  if (record.count >= limit) {
    return { allowed: false, resetTime: record.resetTime }
  }

  record.count++
  return { allowed: true }
}

// Cleanup expired rate limit records periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // Cleanup every 5 minutes