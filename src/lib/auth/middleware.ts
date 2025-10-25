import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import logger from "@/lib/utils/logger"

export default withAuth(
  {
    pages: {
      signIn: "/auth/signin",
      newUser: "/auth/signup",
    },
  }
)

export async function middleware(req: NextRequest) {
  // Log authentication attempts
  logger.info(`Auth middleware: ${req.method} ${req.url}`)

  // Add custom headers if needed
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}