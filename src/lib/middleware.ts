import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth.config';
import { handleCORS } from '@/lib/security/enhanced-cors';
import logger from '@/lib/utils/logger';

export default auth((req: NextRequest) => {
  const startTime = Date.now();
  const { nextUrl } = req;

  // 路由分类
  const isLoggedIn = !!req.auth;
  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isAuthRoute = nextUrl.pathname.startsWith('/auth');
  const isPublicRoute =
    nextUrl.pathname === '/' ||
    nextUrl.pathname.startsWith('/public') ||
    nextUrl.pathname.startsWith('/_next') ||
    nextUrl.pathname.startsWith('/static') ||
    nextUrl.pathname.startsWith('/favicon') ||
    nextUrl.pathname.endsWith('.ico') ||
    nextUrl.pathname.endsWith('.png') ||
    nextUrl.pathname.endsWith('.jpg') ||
    nextUrl.pathname.endsWith('.svg') ||
    nextUrl.pathname.endsWith('.webp');

  // 记录请求信息
  logger.debug('Middleware request', {
    method: req.method,
    url: req.url,
    pathname: nextUrl.pathname,
    isApiRoute,
    isAuthRoute,
    isPublicRoute,
    isLoggedIn,
    userAgent: req.headers.get('user-agent'),
    ip: req.ip || req.headers.get('x-forwarded-for') || 'unknown'
  });

  // 允许公开路由（无需CORS处理）
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 处理API路由的CORS
  if (isApiRoute) {
    try {
      const corsResponse = handleCORS(req);

      // 如果CORS处理返回了错误响应，直接返回
      if (corsResponse.status >= 400) {
        logger.warn('CORS request blocked', {
          method: req.method,
          url: req.url,
          status: corsResponse.status,
          processingTime: Date.now() - startTime
        });
        return corsResponse;
      }

      // 对于非OPTIONS请求，继续原有的认证和路由逻辑
      if (req.method !== 'OPTIONS') {
        // Redirect unauthenticated users to sign in
        if (!isLoggedIn && !isAuthRoute) {
          logger.info('Redirecting unauthenticated user', {
            pathname: nextUrl.pathname,
            referer: req.headers.get('referer')
          });
          return NextResponse.redirect(new URL('/auth/signin', nextUrl));
        }

        // Redirect authenticated users away from auth routes
        if (isLoggedIn && isAuthRoute) {
          logger.info('Redirecting authenticated user from auth route', {
            pathname: nextUrl.pathname,
            userId: req.auth?.user?.id
          });
          return NextResponse.redirect(new URL('/dashboard', nextUrl));
        }
      }

      logger.debug('API request processed successfully', {
        method: req.method,
        pathname: nextUrl.pathname,
        processingTime: Date.now() - startTime
      });

      return corsResponse;

    } catch (error) {
      logger.error('CORS handling error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        method: req.method,
        url: req.url,
        processingTime: Date.now() - startTime
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: 'CORS processing failed',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  }

  // 非API路由的认证处理
  try {
    // Redirect unauthenticated users to sign in
    if (!isLoggedIn && !isAuthRoute) {
      logger.info('Redirecting unauthenticated user', {
        pathname: nextUrl.pathname,
        referer: req.headers.get('referer')
      });
      return NextResponse.redirect(new URL('/auth/signin', nextUrl));
    }

    // Redirect authenticated users away from auth routes
    if (isLoggedIn && isAuthRoute) {
      logger.info('Redirecting authenticated user from auth route', {
        pathname: nextUrl.pathname,
        userId: req.auth?.user?.id
      });
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }

    // 添加基本安全头部到非API响应
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 生产环境添加HSTS
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    logger.debug('Non-API request processed successfully', {
      method: req.method,
      pathname: nextUrl.pathname,
      processingTime: Date.now() - startTime
    });

    return response;

  } catch (error) {
    logger.error('Non-API route processing error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      method: req.method,
      url: req.url,
      processingTime: Date.now() - startTime
    });

    return NextResponse.redirect(new URL('/error?message=Internal Server Error', nextUrl));
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
    // Always match API routes
    '/api/:path*',
  ],
};
