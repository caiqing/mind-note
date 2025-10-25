// AI中间件模块导出

export * from './auth'
export * from './rate-limit'

// 错误处理中间件
export const errorHandler = (error: Error) => {
  console.error('AI服务错误:', error)

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}

// CORS中间件
export const cors = (request: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  return corsHeaders
}

// 请求日志中间件
export const requestLogger = (request: Request, startTime: number) => {
  const duration = Date.now() - startTime
  const url = new URL(request.url)

  console.log(`[${request.method}] ${url.pathname} - ${duration}ms`)

  // 在生产环境中，你可能想要使用更结构化的日志
  if (process.env.NODE_ENV === 'production') {
    // 发送到日志服务
    // sendToLoggingService({ method: request.method, path: url.pathname, duration })
  }
}

// 响应时间中间件
export const responseTime = () => {
  const startTime = Date.now()

  return (response: Response) => {
    const responseTime = Date.now() - startTime
    response.headers.set('X-Response-Time', responseTime.toString())
    return response
  }
}

// 安全头中间件
export const securityHeaders = () => {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  }

  return headers
}

// AI服务特定的中间件组合
export const aiMiddleware = [
  securityHeaders(),
  cors,
  responseTime(),
  // 其他中间件...
]

export default aiMiddleware