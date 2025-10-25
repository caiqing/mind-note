/**
 * 安全头管理模块
 * 提供HTTP安全头的配置和验证功能
 */

import { NextRequest, NextResponse } from 'next/server';

export class SecurityHeaders {
  /**
   * 为响应添加安全头
   */
  static addSecurityHeaders(response: Response): Response {
    // HTTPS严格传输安全 (HSTS)
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // 内容类型选项，防止MIME类型嗅探
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // XSS保护
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // 内容安全策略 (CSP)
    const cspPolicy = this.buildCSPPolicy();
    response.headers.set('Content-Security-Policy', cspPolicy);

    // 引用策略
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 权限策略
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
    );

    // X-Frame-Options 防止点击劫持
    response.headers.set('X-Frame-Options', 'DENY');

    // 服务器信息隐藏
    response.headers.set('Server', '');

    return response;
  }

  /**
   * 构建内容安全策略
   */
  private static buildCSPPolicy(): string {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    const directives = [
      // 默认策略
      "default-src 'self'",

      // 脚本策略
      isDevelopment
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net"
        : "script-src 'self' https://cdn.jsdelivr.net",

      // 样式策略
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // 字体策略
      "font-src 'self' https://fonts.gstatic.com",

      // 图片策略
      "img-src 'self' data: https: blob:",

      // 连接策略
      "connect-src 'self' https://api.openai.com wss://api.openai.com",

      // 媒体策略
      "media-src 'self' blob:",

      // 对象策略
      "object-src 'none'",

      // 基础URI策略
      "base-uri 'self'",

      // 表单行为策略
      "form-action 'self'",

      // 框架祖先策略
      "frame-ancestors 'none'",

      // 升级不安全请求
      isProduction ? "upgrade-insecure-requests" : ""
    ].filter(Boolean);

    return directives.join('; ');
  }

  /**
   * 验证请求是否使用HTTPS
   */
  static validateHttps(request: NextRequest): boolean {
    const url = new URL(request.url);

    // 在本地开发环境允许HTTP
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // 检查X-Forwarded-Proto头（用于负载均衡器）
    const forwardedProto = request.headers.get('x-forwarded-proto');
    if (forwardedProto === 'https') {
      return true;
    }

    // 检查URL协议
    return url.protocol === 'https:';
  }

  /**
   * 创建安全的API响应
   */
  static createSecureResponse(
    data: any,
    status: number = 200,
    request?: NextRequest
  ): NextResponse {
    const response = NextResponse.json(data, { status });

    // 添加安全头
    const responseWithHeaders = this.addSecurityHeaders(response);

    // 添加CORS头（如果需要）
    if (request) {
      this.addCORSHeaders(responseWithHeaders, request);
    }

    return responseWithHeaders;
  }

  /**
   * 添加CORS头
   */
  private static addCORSHeaders(response: Response, request: NextRequest): void {
    const origin = request.headers.get('origin');
    const allowedOrigins = this.getAllowedOrigins();

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24小时
  }

  /**
   * 获取允许的源列表
   */
  private static getAllowedOrigins(): string[] {
    const envOrigins = process.env.ALLOWED_ORIGINS;
    if (envOrigins) {
      return envOrigins.split(',').map(origin => origin.trim());
    }

    // 默认允许的源
    const defaultOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://mindnote.app',
      'https://www.mindnote.app'
    ];

    return defaultOrigins;
  }

  /**
   * 验证请求头安全性
   */
  static validateRequestHeaders(request: NextRequest): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // 检查User-Agent
    const userAgent = request.headers.get('user-agent');
    if (!userAgent) {
      warnings.push('Missing User-Agent header');
    } else if (this.isSuspiciousUserAgent(userAgent)) {
      warnings.push('Suspicious User-Agent detected');
    }

    // 检查Content-Type
    const contentType = request.headers.get('content-type');
    if (request.method === 'POST' || request.method === 'PUT') {
      if (!contentType) {
        warnings.push('Missing Content-Type header for POST/PUT request');
      }
    }

    // 检查Content-Length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
      warnings.push('Request body too large');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * 检查可疑的User-Agent
   */
  private static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /spider/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /perl/i,
      /php/i,
      /ruby/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * 创建安全的重定向响应
   */
  static createSecureRedirect(url: string, permanent: boolean = false): NextResponse {
    // 验证重定向URL
    if (!this.isValidRedirectURL(url)) {
      throw new Error('Invalid redirect URL');
    }

    const response = NextResponse.redirect(url, permanent ? 308 : 307);
    return this.addSecurityHeaders(response);
  }

  /**
   * 验证重定向URL是否安全
   */
  private static isValidRedirectURL(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const allowedOrigins = this.getAllowedOrigins().map(origin => new URL(origin).origin);

      return allowedOrigins.includes(parsedUrl.origin);
    } catch {
      return false;
    }
  }

  /**
   * 处理OPTIONS预检请求
   */
  static handleOptionsRequest(request: NextRequest): NextResponse {
    const response = new NextResponse(null, { status: 200 });

    // 添加CORS头
    this.addCORSHeaders(response, request);

    // 添加安全头
    return this.addSecurityHeaders(response);
  }
}