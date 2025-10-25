/**
 * Get Current User API
 *
 * GET /api/auth/me - Get current user info
 * DELETE /api/auth/me - Logout user
 */

import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/auth-middleware'
import { userService as userDbService } from '@/lib/services/user-service'
import { clearAuthCookies } from '@/lib/auth'

// GET current user info
export async function GET(request: NextRequest) {
  return userService(request, async (req) => {
    try {
      const user = await userDbService.getUserById(req.user.id)

      if (!user) {
        return NextResponse.json(
          {
            error: 'User not found',
            message: 'User account may have been deleted'
          },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          user
        },
        { status: 200 }
      )
    } catch (error) {
      console.error('Get user info API error:', error)
      return NextResponse.json(
        {
          error: 'Failed to get user info',
          message: 'Internal server error'
        },
        { status: 500 }
      )
    }
  })
}

// DELETE current user session (logout)
export async function DELETE(request: NextRequest) {
  return userService(request, async (req) => {
    try {
      // Create response
      const response = NextResponse.json(
        {
          success: true,
          message: 'Logout successful'
        },
        { status: 200 }
      )

      // Clear auth cookies
      clearAuthCookies(response)

      return response
    } catch (error) {
      console.error('Logout API error:', error)
      return NextResponse.json(
        {
          error: 'Logout failed',
          message: 'Internal server error'
        },
        { status: 500 }
      )
    }
  })
}