/**
 * User Service
 *
 * Database operations for user management
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword, comparePassword, generateAuthTokens, AuthUser } from '@/lib/auth'

const prisma = new PrismaClient()

export interface CreateUserInput {
  email: string
  password: string
  name: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface UpdateUserInput {
  name?: string
  avatar?: string
  email?: string
}

export interface UserResponse {
  user: Omit<AuthUser, 'createdAt' | 'updatedAt'>
  tokens?: {
    accessToken: string
    refreshToken: string
  }
}

class UserService {
  /**
   * Create a new user
   */
  async createUser(data: CreateUserInput): Promise<UserResponse> {
    const { email, password, name } = data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        avatar: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Generate tokens
    const tokens = await generateAuthTokens(user)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      tokens
    }
  }

  /**
   * Authenticate user and return tokens
   */
  async login(data: LoginInput): Promise<UserResponse> {
    const { email, password } = data

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password!)

    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    // Generate tokens
    const tokens = await generateAuthTokens(user)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      tokens
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<Omit<AuthUser, 'createdAt' | 'updatedAt'> | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<Omit<AuthUser, 'createdAt' | 'updatedAt'> | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    }
  }

  /**
   * Update user information
   */
  async updateUser(id: string, data: UpdateUserInput): Promise<Omit<AuthUser, 'createdAt' | 'updatedAt'>> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    }
  }

  /**
   * Change user password
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id },
      select: { password: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password!)

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect')
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Delete user account
   */
  async deleteUser(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id }
    })
  }

  /**
   * Search users (for admin purposes)
   */
  async searchUsers(query: string, limit = 20, offset = 0): Promise<Omit<AuthUser, 'createdAt' | 'updatedAt'>[]> {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            email: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    }))
  }

  /**
   * Get user statistics
   */
  async getUserStats(id: string): Promise<{
    totalNotes: number
    totalCategories: number
    totalTags: number
    storageUsed: number
  }> {
    const [notesCount, categoriesCount, tagsCount] = await Promise.all([
      prisma.note.count({
        where: { userId: id }
      }),
      prisma.category.count({
        where: { userId: id }
      }),
      prisma.tag.count({
        where: { userId: id }
      })
    ])

    // Calculate storage used (approximate)
    const notes = await prisma.note.findMany({
      where: { userId: id },
      select: { content: true }
    })

    const storageUsed = notes.reduce((total, note) => {
      return total + (note.content?.length || 0) * 2 // Rough estimate (2 bytes per character)
    }, 0)

    return {
      totalNotes: notesCount,
      totalCategories: categoriesCount,
      totalTags: tagsCount,
      storageUsed
    }
  }
}

export const userService = new UserService()
export default userService