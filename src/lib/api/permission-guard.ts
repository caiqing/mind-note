import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { PermissionService } from "@/lib/services/permission-service"
import { handleAPIError } from "@/lib/api/response"
import logger from "@/lib/utils/logger"

export interface PermissionGuardOptions {
  resourceType: 'note' | 'category' | 'tag' | 'feedback' | 'system'
  action?: 'read' | 'write' | 'delete' | 'admin'
}

export function withPermissionGuard(options: PermissionGuardOptions) {
  return async (
    handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
    req: NextRequest,
    context?: any
  ): Promise<NextResponse> => {
    try {
      // Get user session
      const session = await getServerSession(authOptions)

      if (!session?.user) {
        return handleAPIError(new Error('Authentication required'))
      }

      const userId = session.user.id
      const { resourceType, action = 'read' } = options

      // Extract resource ID from URL or request body
      let resourceId: string | number | undefined

      if (req.method === 'GET' || req.method === 'DELETE') {
        // Extract from URL parameters
        const url = new URL(req.url)
        const pathParts = url.pathname.split('/')

        // Find ID in path (e.g., /api/notes/123 -> 123)
        const idIndex = pathParts.findIndex(part =>
          part === 'notes' || part === 'categories' || part === 'tags' || part === 'feedback'
        )

        if (idIndex !== -1 && pathParts[idIndex + 1]) {
          resourceId = pathParts[idIndex + 1]
        }
      } else {
        // Extract from request body for POST/PUT requests
        try {
          const body = await req.json()
          resourceId = body.id || body.categoryId || body.tagId
        } catch (error) {
          logger.warn('Failed to parse request body for resource ID extraction')
        }
      }

      // Check permissions based on resource type
      switch (resourceType) {
        case 'note':
          if (action === 'write' || action === 'delete') {
            if (!resourceId) {
              return handleAPIError(new Error('Note ID is required'))
            }
            await PermissionService.checkNoteOwnership(userId, resourceId as string)
          }
          break

        case 'category':
          if (action === 'write' || action === 'delete') {
            if (!resourceId) {
              return handleAPIError(new Error('Category ID is required'))
            }
            await PermissionService.checkCategoryAccess(userId, resourceId as number)
          }
          break

        case 'tag':
          if (action === 'write' || action === 'delete') {
            if (!resourceId) {
              return handleAPIError(new Error('Tag ID is required'))
            }
            await PermissionService.checkTagOwnership(userId, resourceId as number)
          }
          break

        case 'feedback':
          if (action === 'write' || action === 'delete') {
            if (!resourceId) {
              return handleAPIError(new Error('Feedback ID is required'))
            }
            await PermissionService.checkFeedbackOwnership(userId, resourceId as string)
          }
          break

        case 'system':
          if (action === 'admin') {
            await PermissionService.checkSystemAdminAccess(userId)
          }
          break

        default:
          logger.warn(`Unknown resource type: ${resourceType}`)
      }

      // Log access for audit purposes
      logger.info(`Permission check passed: ${userId} ${action} ${resourceType}:${resourceId}`)

      // Continue with the request handler
      return handler(req, context)
    } catch (error) {
      return handleAPIError(error)
    }
  }
}

// Higher-order function for specific resource types
export function withNotePermission(action: 'read' | 'write' | 'delete' = 'read') {
  return withPermissionGuard({ resourceType: 'note', action })
}

export function withCategoryPermission(action: 'read' | 'write' | 'delete' = 'read') {
  return withPermissionGuard({ resourceType: 'category', action })
}

export function withTagPermission(action: 'read' | 'write' | 'delete' = 'read') {
  return withPermissionGuard({ resourceType: 'tag', action })
}

export function withSystemPermission(action: 'read' | 'admin' = 'read') {
  return withPermissionGuard({ resourceType: 'system', action })
}