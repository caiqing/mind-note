/**
 * API 服务基类
 * 提供通用的API功能和工具方法
 */

import { ApiResponse, PaginatedResponse, BatchOperationResult } from './types';
import {
  APIError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError
} from './errors';

export interface BaseServiceConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  enableCaching?: boolean;
  cacheTTL?: number;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  skipCache?: boolean;
  customHeaders?: Record<string, string>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * API 服务基类
 */
export abstract class BaseAPIService {
  protected config: BaseServiceConfig;
  protected cache: Map<string, CacheEntry<any>> = new Map();
  protected requestInterceptors: Array<(request: Request) => Request> = [];
  protected responseInterceptors: Array<(response: Response) => Response> = [];

  constructor(config: BaseServiceConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      enableLogging: true,
      enableCaching: true,
      cacheTTL: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * 添加请求拦截器
   */
  public addRequestInterceptor(interceptor: (request: Request) => Request): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  public addResponseInterceptor(interceptor: (response: Response) => Response): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(url: string, options?: RequestOptions): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * 检查缓存
   */
  private getCachedData<T>(key: string): T | null {
    if (!this.config.enableCaching) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 设置缓存
   */
  private setCachedData<T>(key: string, data: T, ttl?: number): void {
    if (!this.config.enableCaching) {
      return;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL
    });
  }

  /**
   * 清理过期缓存
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清理所有缓存
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * 记录日志
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.config.enableLogging) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      data,
      service: this.constructor.name
    };

    switch (level) {
      case 'info':
        console.info(`[API:${this.constructor.name}] ${message}`, data);
        break;
      case 'warn':
        console.warn(`[API:${this.constructor.name}] ${message}`, data);
        break;
      case 'error':
        console.error(`[API:${this.constructor.name}] ${message}`, data);
        break;
    }
  }

  /**
   * 创建标准API响应
   */
  protected createApiResponse<T>(
    data?: T,
    success: boolean = true,
    message?: string,
    requestId?: string
  ): ApiResponse<T> {
    return {
      success,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId
    };
  }

  /**
   * 创建错误响应
   */
  protected createErrorResponse(
    error: Error,
    requestId?: string
  ): ApiResponse {
    if (error instanceof APIError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        },
        timestamp: new Date().toISOString(),
        requestId
      };
    }

    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString(),
      requestId
    };
  }

  /**
   * 处理API错误
   */
  protected handleAPIError(error: any, context?: string): APIError {
    if (error instanceof APIError) {
      return error;
    }

    // HTTP错误状态码处理
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      const message = error.message || error.statusText || 'Request failed';

      switch (status) {
        case 400:
          return new ValidationError(message, error.details);
        case 401:
          return new UnauthorizedError(message);
        case 403:
          return new ForbiddenError(message);
        case 404:
          return new NotFoundError(context || 'Resource');
        case 409:
          return new ConflictError(message, error.details);
        case 429:
          return new RateLimitError(message);
        case 503:
          return new ServiceUnavailableError(message);
        default:
          return new APIError(message, status, 'HTTP_ERROR', error.details);
      }
    }

    // 网络错误处理
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new ServiceUnavailableError('Network error occurred');
    }

    // 超时错误处理
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return new ServiceUnavailableError('Request timeout');
    }

    // 未知错误
    return new APIError(
      error.message || 'An unexpected error occurred',
      500,
      'UNKNOWN_ERROR',
      { originalError: error, context }
    );
  }

  /**
   * 验证请求参数
   */
  protected validateParams(params: any, rules: Record<string, any>): void {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = params[field];

      // 必填验证
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      // 如果字段不存在且不是必填，跳过其他验证
      if (value === undefined || value === null) {
        continue;
      }

      // 类型验证
      if (rule.type && typeof value !== rule.type) {
        errors.push(`${field} must be of type ${rule.type}`);
        continue;
      }

      // 字符串长度验证
      if (rule.type === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field} must not exceed ${rule.maxLength} characters`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
      }

      // 数字范围验证
      if (rule.type === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${field} must not exceed ${rule.max}`);
        }
      }

      // 数组长度验证
      if (rule.type === 'object' && Array.isArray(value)) {
        if (rule.minItems && value.length < rule.minItems) {
          errors.push(`${field} must contain at least ${rule.minItems} items`);
        }
        if (rule.maxItems && value.length > rule.maxItems) {
          errors.push(`${field} must not contain more than ${rule.maxItems} items`);
        }
      }

      // 自定义验证函数
      if (rule.validate && typeof rule.validate === 'function') {
        const customError = rule.validate(value);
        if (customError) {
          errors.push(customError);
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', { errors });
    }
  }

  /**
   * 基础HTTP请求方法
   */
  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      const url = `${this.config.baseUrl}${endpoint}`;

      // 检查缓存（仅对GET请求）
      if (!options.method || options.method === 'GET') {
        if (!options.skipCache) {
          const cacheKey = this.getCacheKey(url, options);
          const cachedData = this.getCachedData<ApiResponse<T>>(cacheKey);
          if (cachedData) {
            this.log('info', 'Cache hit', { endpoint, requestId });
            return cachedData;
          }
        }
      }

      // 应用请求拦截器
      let request = new Request(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...options.customHeaders,
          ...options.headers
        },
        ...options
      });

      for (const interceptor of this.requestInterceptors) {
        request = interceptor(request);
      }

      // 设置超时
      const timeout = options.timeout || this.config.timeout;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(request, {
        signal: controller.signal,
        ...options
      });

      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw {
          status: response.status,
          message: errorData.message || response.statusText,
          details: errorData.details
        };
      }

      // 应用响应拦截器
      let processedResponse = response;
      for (const interceptor of this.responseInterceptors) {
        processedResponse = interceptor(processedResponse);
      }

      const data = await processedResponse.json();
      const duration = Date.now() - startTime;

      this.log('info', 'Request successful', {
        endpoint,
        requestId,
        duration,
        status: response.status
      });

      // 缓存响应（仅对GET请求）
      if (!options.method || options.method === 'GET') {
        if (!options.skipCache && data) {
          const cacheKey = this.getCacheKey(url, options);
          this.setCachedData(cacheKey, data);
        }
      }

      return data;

    } catch (error) {
      const duration = Date.now() - startTime;
      const apiError = this.handleAPIError(error, endpoint);

      this.log('error', 'Request failed', {
        endpoint,
        requestId,
        duration,
        error: apiError.message
      });

      // 重试逻辑
      const retries = options.retries || this.config.retries;
      if (retries > 0 && this.shouldRetry(error)) {
        this.log('info', 'Retrying request', {
          endpoint,
          requestId,
          attempt: this.config.retries - retries + 1
        });

        await this.delay(this.config.retryDelay || 1000);
        return this.request<T>(endpoint, {
          ...options,
          retries: retries - 1
        });
      }

      throw apiError;
    }
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    // 网络错误或超时错误可以重试
    if (error.name === 'TypeError' || error.name === 'AbortError') {
      return true;
    }

    // 5xx 服务器错误可以重试
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 429 限流错误可以重试
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET 请求
   */
  protected async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  protected async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT 请求
   */
  protected async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PATCH 请求
   */
  protected async patch<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE 请求
   */
  protected async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * 分页请求
   */
  protected async getPaginated<T>(
    endpoint: string,
    params: Record<string, any> = {},
    options?: RequestOptions
  ): Promise<PaginatedResponse<T>> {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(','));
        } else {
          searchParams.set(key, String(value));
        }
      }
    }

    const url = searchParams.toString() ? `${endpoint}?${searchParams}` : endpoint;
    const response = await this.get<PaginatedResponse<T>>(url, options);

    return response.data!;
  }

  /**
   * 批量操作
   */
  protected async batchOperation<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
      continueOnError?: boolean;
      maxConcurrency?: number;
    } = {}
  ): Promise<BatchOperationResult<R>> {
    const {
      batchSize = 10,
      delayBetweenBatches = 100,
      continueOnError = true,
      maxConcurrency = 5
    } = options;

    const successful: R[] = [];
    const failed: Array<{ item: T; error: { code: string; message: string } }> = [];

    // 分批处理
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // 控制并发数
      const semaphore = new Semaphore(maxConcurrency);

      const promises = batch.map(async (item) => {
        await semaphore.acquire();

        try {
          const result = await operation(item);
          successful.push(result);
          return { success: true, result };
        } catch (error) {
          const apiError = this.handleAPIError(error);
          failed.push({
            item,
            error: {
              code: apiError.code,
              message: apiError.message
            }
          });

          if (!continueOnError) {
            throw apiError;
          }

          return { success: false, error: apiError };
        } finally {
          semaphore.release();
        }
      });

      await Promise.all(promises);

      // 批次间延迟
      if (i + batchSize < items.length && delayBetweenBatches > 0) {
        await this.delay(delayBetweenBatches);
      }
    }

    return {
      successful,
      failed,
      totalProcessed: items.length,
      successRate: (successful.length / items.length) * 100
    };
  }
}

/**
 * 信号量类，用于控制并发数
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<(permit: () => void) => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      resolve(() => this.release());
    } else {
      this.permits++;
    }
  }
}