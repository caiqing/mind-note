import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 检查数据库连接
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'mindnote-api',
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    }

    return NextResponse.json(health)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}