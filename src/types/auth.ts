import { DefaultSession } from "next-auth"
import { User } from "."

declare module "next-auth" {
  interface Session {
    user: User
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