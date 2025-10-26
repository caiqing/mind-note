/**
 * 全局错误处理系统
 *
 * 提供统一的错误处理、日志记录和用户友好的错误消息
 */

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION = 'PERMISSION',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AppError {
  code: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  path?: string;
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
}

class ErrorHandler {
  private errors: AppError[] = [];
  private maxErrors = 1000; // 内存中最多保存的错误数量

  /**
   * 创建标准化的应用错误
   */
  createError(
    code: string,
    type: ErrorType,
    severity: ErrorSeverity,
    message: string,
    userMessage: string,
    details?: any,
    context?: ErrorContext,
  ): AppError {
    const error: AppError = {
      code,
      type,
      severity,
      message,
      userMessage,
      details,
      timestamp: new Date(),
      requestId: context?.requestId,
      userId: context?.userId,
      path: context?.path,
    };

    this.logError(error);
    this.storeError(error);

    return error;
  }

  /**
   * 处理API错误并返回用户友好的响应
   */
  handleApiError(error: unknown, context?: ErrorContext): Response {
    let appError: AppError;

    if (this.isAppError(error)) {
      appError = error as AppError;
    } else if (error instanceof Error) {
      appError = this.convertToAppError(error, context);
    } else {
      appError = this.createError(
        'UNKNOWN_ERROR',
        ErrorType.SERVER,
        ErrorSeverity.HIGH,
        `Unknown error: ${String(error)}`,
        '发生了未知错误，请稍后重试',
        { originalError: String(error) },
        context,
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: appError.code,
          message: appError.userMessage,
          type: appError.type.toLowerCase(),
          requestId: appError.requestId,
          timestamp: appError.timestamp,
        },
      }),
      {
        status: this.getHttpStatusCode(appError.type),
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      },
    );
  }

  /**
   * 转换原生Error为AppError
   */
  private convertToAppError(error: Error, context?: ErrorContext): AppError {
    // Prisma错误处理
    if (error.name === 'PrismaClientKnownRequestError') {
      return this.handlePrismaError(error as any, context);
    }

    // Zod验证错误
    if (error.name === 'ZodError') {
      return this.createError(
        'VALIDATION_ERROR',
        ErrorType.VALIDATION,
        ErrorSeverity.LOW,
        `Validation failed: ${error.message}`,
        '请求数据格式不正确，请检查后重试',
        { validationErrors: (error as any).errors },
        context,
      );
    }

    // 网络错误
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return this.createError(
        'NETWORK_ERROR',
        ErrorType.NETWORK,
        ErrorSeverity.MEDIUM,
        `Network error: ${error.message}`,
        '网络连接异常，请检查网络后重试',
        { originalError: error.message },
        context,
      );
    }

    // 默认服务器错误
    return this.createError(
      'INTERNAL_SERVER_ERROR',
      ErrorType.SERVER,
      ErrorSeverity.HIGH,
      `Server error: ${error.message}`,
      '服务器内部错误，请稍后重试',
      { stack: error.stack, originalError: error.message },
      context,
    );
  }

  /**
   * 处理Prisma数据库错误
   */
  private handlePrismaError(error: any, context?: ErrorContext): AppError {
    const errorCode = error.code;
    const meta = error.meta;

    switch (errorCode) {
      case 'P2002':
        return this.createError(
          'DUPLICATE_ENTRY',
          ErrorType.VALIDATION,
          ErrorSeverity.LOW,
          `Duplicate entry: ${meta?.target?.join(', ')}`,
          '数据已存在，请检查后重试',
          { field: meta?.target },
          context,
        );

      case 'P2025':
        return this.createError(
          'RECORD_NOT_FOUND',
          ErrorType.NOT_FOUND,
          ErrorSeverity.LOW,
          `Record not found: ${meta?.cause}`,
          '请求的资源不存在',
          { cause: meta?.cause },
          context,
        );

      case 'P2003':
        return this.createError(
          'FOREIGN_KEY_CONSTRAINT',
          ErrorType.VALIDATION,
          ErrorSeverity.MEDIUM,
          `Foreign key constraint: ${meta?.field_name}`,
          '关联数据不存在，请检查后重试',
          { field: meta?.field_name },
          context,
        );

      default:
        return this.createError(
          'DATABASE_ERROR',
          ErrorType.DATABASE,
          ErrorSeverity.HIGH,
          `Database error: ${error.message}`,
          '数据库操作失败，请稍后重试',
          { code: errorCode, meta },
          context,
        );
    }
  }

  /**
   * 获取HTTP状态码
   */
  private getHttpStatusCode(errorType: ErrorType): number {
    switch (errorType) {
      case ErrorType.VALIDATION:
        return 400;
      case ErrorType.NOT_FOUND:
        return 404;
      case ErrorType.PERMISSION:
        return 403;
      case ErrorType.AUTHENTICATION:
        return 401;
      case ErrorType.DATABASE:
      case ErrorType.SERVER:
        return 500;
      case ErrorType.NETWORK:
        return 503;
      case ErrorType.CLIENT:
        return 400;
      default:
        return 500;
    }
  }

  /**
   * 记录错误日志
   */
  private logError(error: AppError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.code}] ${error.message}`;

    if (error.severity === ErrorSeverity.CRITICAL) {
      console.error(`🔴 CRITICAL: ${logMessage}`, {
        type: error.type,
        details: error.details,
        context: {
          requestId: error.requestId,
          userId: error.userId,
          path: error.path,
        },
      });
    } else if (error.severity === ErrorSeverity.HIGH) {
      console.error(`🟠 HIGH: ${logMessage}`, error.details);
    } else if (error.severity === ErrorSeverity.MEDIUM) {
      console.warn(`🟡 MEDIUM: ${logMessage}`, error.details);
    } else {
      console.log(`🟢 LOW: ${logMessage}`, error.details);
    }
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * 存储错误到内存（用于调试和监控）
   */
  private storeError(error: AppError): void {
    this.errors.push(error);

    // 保持错误数量在限制范围内
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: AppError[];
  } {
    const byType = Object.values(ErrorType).reduce(
      (acc, type) => {
        acc[type] = this.errors.filter(e => e.type === type).length;
        return acc;
      },
      {} as Record<ErrorType, number>,
    );

    const bySeverity = Object.values(ErrorSeverity).reduce(
      (acc, severity) => {
        acc[severity] = this.errors.filter(e => e.severity === severity).length;
        return acc;
      },
      {} as Record<ErrorSeverity, number>,
    );

    const recentErrors = this.errors.slice(-10).reverse();

    return {
      total: this.errors.length,
      byType,
      bySeverity,
      recentErrors,
    };
  }

  /**
   * 清理错误日志
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * 检查是否为AppError
   */
  private isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'type' in error &&
      'severity' in error &&
      'message' in error &&
      'userMessage' in error &&
      'timestamp' in error
    );
  }

  /**
   * 创建常见错误的便捷方法
   */
  static validationError(
    message: string,
    userMessage?: string,
    details?: any,
  ): AppError {
    return errorHandler.createError(
      'VALIDATION_ERROR',
      ErrorType.VALIDATION,
      ErrorSeverity.LOW,
      message,
      userMessage || '请求数据格式不正确',
      details,
    );
  }

  static notFoundError(resource: string, details?: any): AppError {
    return errorHandler.createError(
      'NOT_FOUND',
      ErrorType.NOT_FOUND,
      ErrorSeverity.LOW,
      `${resource} not found`,
      `请求的${resource}不存在`,
      details,
    );
  }

  static databaseError(message: string, details?: any): AppError {
    return errorHandler.createError(
      'DATABASE_ERROR',
      ErrorType.DATABASE,
      ErrorSeverity.HIGH,
      message,
      '数据库操作失败，请稍后重试',
      details,
    );
  }

  static serverError(message: string, details?: any): AppError {
    return errorHandler.createError(
      'SERVER_ERROR',
      ErrorType.SERVER,
      ErrorSeverity.HIGH,
      message,
      '服务器内部错误，请稍后重试',
      details,
    );
  }
}

// 创建全局实例
export const errorHandler = new ErrorHandler();

// 导出便捷方法
export const createValidationError = ErrorHandler.validationError;
export const createNotFoundError = ErrorHandler.notFoundError;
export const createDatabaseError = ErrorHandler.databaseError;
export const createServerError = ErrorHandler.serverError;

export default errorHandler;
