import { NextAuthConfig } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/connection'

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Enhanced credential validation
        const parsedCredentials = z
          .object({
            email: z.string().email('Invalid email format'),
            password: passwordSchema
          })
          .safeParse(credentials)

        if (!parsedCredentials.success) {
          console.log('Invalid credentials format:', parsedCredentials.error.flatten())
          return null
        }

        const { email, password } = parsedCredentials.data

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            console.log('User not found for email:', email)
            return null
          }

          const passwordsMatch = await bcrypt.compare(password, user.passwordHash)

          if (passwordsMatch) {
            console.log('User authenticated successfully:', email)
            return {
              id: user.id,
              email: user.email,
              name: user.fullName,
              username: user.username,
            }
          } else {
            console.log('Password mismatch for email:', email)
            return null
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 1 day - reduced from 30 days for security
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  trustHost: true,
  events: {
    signIn: async ({ user, account }) => {
      // Log authentication events for security monitoring
      console.log(`User ${user.email} signed in with ${account?.provider}`)
    },
    signOut: async ({ session }) => {
      // Log signout events
      console.log(`User ${session.user?.email} signed out`)
    },
  },
}