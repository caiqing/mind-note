/**
 * User Login API
 *
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { userService } from '@/lib/services/user-service'
import { withRateLimit } from '@/lib/auth-middleware'
import { setAuthCookie } from '@/lib/auth'

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(10, 15 * 60 * 1000)(request, async () => {
      return new NextResponse()
    })

    if (rateLimitResponse.status === 429) {
      return rateLimitResponse
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: 'Invalid input data',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    try {
      // Authenticate user
      const result = await userService.login({
        email,
        password
      })

      // Create response
      const response = NextResponse.json(
        {
          success: true,
          message: 'Login successful',
          user: result.user
        },
        { status: 200 }
      )

      // Set HTTP-only cookies with tokens
      if (result.tokens) {
        setAuthCookie(response, result.tokens)
      }

      return response
    } catch (error) {
      if (error instanceof Error) {
        // Handle authentication errors
        if (error.message.includes('Invalid email or password')) {
          return NextResponse.json(
            {
              error: 'Authentication failed',
              message: 'Invalid email or password'
            },
            { status: 401 }
          )
        }

        return NextResponse.json(
          {
            error: 'Authentication failed',
            message: error.message
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          error: 'Authentication failed',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      {
        error: 'Authentication failed',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'POST method is required for login'
    },
    { status: 405 }
  )
}