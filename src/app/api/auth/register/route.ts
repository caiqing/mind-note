/**
 * User Registration API
 *
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { userService } from '@/lib/services/user-service'
import { withRateLimit } from '@/lib/auth-middleware'

// Validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long').max(50, 'Name must be less than 50 characters'),
})

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(5, 15 * 60 * 1000)(request, async () => {
      return new NextResponse()
    })

    if (rateLimitResponse.status === 429) {
      return rateLimitResponse
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validationResult = registerSchema.safeParse(body)

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

    const { email, password, name } = validationResult.data

    try {
      // Create user
      const result = await userService.createUser({
        email,
        password,
        name
      })

      return NextResponse.json(
        {
          success: true,
          message: 'User registered successfully',
          user: result.user,
          tokens: result.tokens
        },
        { status: 201 }
      )
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific errors
        if (error.message.includes('already exists')) {
          return NextResponse.json(
            {
              error: 'Registration failed',
              message: error.message
            },
            { status: 409 }
          )
        }

        return NextResponse.json(
          {
            error: 'Registration failed',
            message: error.message
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          error: 'Registration failed',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      {
        error: 'Registration failed',
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
      message: 'POST method is required for registration'
    },
    { status: 405 }
  )
}