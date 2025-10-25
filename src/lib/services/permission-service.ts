import { prisma } from '@/lib/db'
import { UnauthorizedError, ForbiddenError } from '@/lib/utils/errors'
import logger from '@/lib/utils/logger'

export class PermissionService {
  /**
   * Check if user owns the note
   */
  static async checkNoteOwnership(userId: string, noteId: string): Promise<void> {
    try {
      const note = await prisma.note.findUnique({
        where: { id: noteId },
        select: { userId: true }
      })

      if (!note) {
        throw new NotFoundError('Note')
      }

      if (note.userId !== userId) {
        logger.warn(`Access denied: User ${userId} attempted to access note ${noteId}`)
        throw new ForbiddenError('You do not have permission to access this note')
      }
    } catch (error) {
      logger.error('Error checking note ownership:', error)
      throw error
    }
  }

  /**
   * Check if user can access category
   */
  static async checkCategoryAccess(userId: string, categoryId: number): Promise<void> {
    try {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { createdBy: true }
      })

      if (!category) {
        throw new NotFoundError('Category')
      }

      // Allow access if user created the category or if it's a system category (no creator)
      if (category.createdBy && category.createdBy !== userId) {
        logger.warn(`Access denied: User ${userId} attempted to access category ${categoryId}`)
        throw new ForbiddenError('You do not have permission to access this category')
      }
    } catch (error) {
      logger.error('Error checking category access:', error)
      throw error
    }
  }

  /**
   * Check if user owns the tag
   */
  static async checkTagOwnership(userId: string, tagId: number): Promise<void> {
    try {
      const tag = await prisma.tag.findUnique({
        where: { id: tagId },
        select: { createdBy: true }
      })

      if (!tag) {
        throw new NotFoundError('Tag')
      }

      // Allow access if user created the tag or if it's a system tag (no creator)
      if (tag.createdBy && tag.createdBy !== userId) {
        logger.warn(`Access denied: User ${userId} attempted to access tag ${tagId}`)
        throw new ForbiddenError('You do not have permission to access this tag')
      }
    } catch (error) {
      logger.error('Error checking tag ownership:', error)
      throw error
    }
  }

  /**
   * Check if user owns the feedback
   */
  static async checkFeedbackOwnership(userId: string, feedbackId: string): Promise<void> {
    try {
      const feedback = await prisma.userFeedback.findUnique({
        where: { id: feedbackId },
        select: { userId: true }
      })

      if (!feedback) {
        throw new NotFoundError('Feedback')
      }

      if (feedback.userId !== userId) {
        logger.warn(`Access denied: User ${userId} attempted to access feedback ${feedbackId}`)
        throw new ForbiddenError('You do not have permission to access this feedback')
      }
    } catch (error) {
      logger.error('Error checking feedback ownership:', error)
      throw error
    }
  }

  /**
   * Check if user can modify system configuration
   */
  static async checkSystemAdminAccess(userId: string): Promise<void> {
    try {
      // For now, all authenticated users can modify system config
      // In a real application, you might want to check for admin roles
      logger.info(`System config access check for user ${userId}`)

      // Add role-based checks here if needed
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, settings: true }
      })

      if (!user) {
        throw new UnauthorizedError('User not found')
      }

      // Example: Check if user is admin based on settings or email domain
      const isAdmin = user.settings?.isAdmin || user.email.endsWith('@admin.mindnote.com')

      if (!isAdmin) {
        throw new ForbiddenError('Administrator access required')
      }
    } catch (error) {
      logger.error('Error checking system admin access:', error)
      throw error
    }
  }

  /**
   * Get user's accessible resources
   */
  static async getUserAccessibleResources(userId: string) {
    try {
      const [notesCount, categoriesCount, tagsCount] = await Promise.all([
        prisma.note.count({ where: { userId } }),
        prisma.category.count({
          where: {
            OR: [
              { createdBy: userId },
              { createdBy: null }
            ]
          }
        }),
        prisma.tag.count({
          where: {
            OR: [
              { createdBy: userId },
              { createdBy: null }
            ]
          }
        })
      ])

      return {
        notes: notesCount,
        categories: categoriesCount,
        tags: tagsCount
      }
    } catch (error) {
      logger.error('Error getting user accessible resources:', error)
      throw error
    }
  }
}

export default PermissionService