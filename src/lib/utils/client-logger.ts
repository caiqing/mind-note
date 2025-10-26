/**
 * Client-side Logger
 *
 * 浏览器兼容的日志系统，避免使用winston的Node.js依赖
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
}

class ClientLogger {
  private static instance: ClientLogger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private constructor() {}

  static getInstance(): ClientLogger {
    if (!ClientLogger.instance) {
      ClientLogger.instance = new ClientLogger();
    }
    return ClientLogger.instance;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
    };
  }

  private log(entry: LogEntry): void {
    // 存储日志
    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 控制台输出
    const { level, message, timestamp, context, data } = entry;
    const contextStr = context ? `[${context}]` : '';
    const logMessage = `${timestamp} ${level} ${contextStr} ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage, data);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data);
        break;
      case LogLevel.INFO:
        console.info(logMessage, data);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage, data);
        break;
    }

    // 在开发环境中，可以将错误发送到服务器
    if (level === LogLevel.ERROR && process.env.NODE_ENV === 'development') {
      this.sendErrorToServer(entry);
    }
  }

  error(message: string, context?: string, data?: any): void {
    const entry = this.formatMessage(LogLevel.ERROR, message, context, data);
    this.log(entry);
  }

  warn(message: string, context?: string, data?: any): void {
    const entry = this.formatMessage(LogLevel.WARN, message, context, data);
    this.log(entry);
  }

  info(message: string, context?: string, data?: any): void {
    const entry = this.formatMessage(LogLevel.INFO, message, context, data);
    this.log(entry);
  }

  debug(message: string, context?: string, data?: any): void {
    const entry = this.formatMessage(LogLevel.DEBUG, message, context, data);
    this.log(entry);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  private async sendErrorToServer(entry: LogEntry): Promise<void> {
    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      console.warn('Failed to send error to server:', error);
    }
  }
}

// 导出单例实例
const logger = ClientLogger.getInstance();

export default logger;

// 便捷的导出函数
export const logError = (message: string, context?: string, data?: any) =>
  logger.error(message, context, data);

export const logWarn = (message: string, context?: string, data?: any) =>
  logger.warn(message, context, data);

export const logInfo = (message: string, context?: string, data?: any) =>
  logger.info(message, context, data);

export const logDebug = (message: string, context?: string, data?: any) =>
  logger.debug(message, context, data);
