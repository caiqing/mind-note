import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

// 登录表单验证模式
const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少需要6个字符"),
})

export const authOptions: NextAuthOptions = {
  // 暂时使用内存适配器，后续可以替换为PrismaAdapter
  // adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        try {
          // 验证输入格式
          const { email, password } = loginSchema.parse(credentials)

          // 查找用户
          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            throw new Error("用户不存在")
          }

          // 验证密码 (这里假设使用bcrypt，实际根据您的密码哈希方式调整)
          const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

          if (!isPasswordValid) {
            throw new Error("密码错误")
          }

          // 更新最后登录时间
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })

          return {
            id: user.id,
            email: user.email,
            name: user.fullName || user.username,
            image: user.avatarUrl,
          }
        } catch (error) {
          console.error("认证错误:", error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  debug: process.env.NODE_ENV === "development",
}

// 扩展NextAuth类型
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
  }
}