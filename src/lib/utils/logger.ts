// 检查是否在服务端环境
const isServer = typeof window === 'undefined';

// 如果在客户端，抛出错误
if (!isServer) {
  throw new Error(
    'Server logger cannot be used in client environment. Use client-logger instead.',
  );
}

import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
  }),

  // File transport for errors
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// HTTP request logger middleware
export const httpLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 400) {
      logger.error(message);
    } else {
      logger.http(message);
    }
  });

  next();
};

// AI service logger
export const aiLogger = {
  request: (provider: string, model: string, inputTokens?: number) => {
    logger.info(
      `AI Request - Provider: ${provider}, Model: ${model}, Input Tokens: ${inputTokens || 'N/A'}`,
    );
  },

  response: (
    provider: string,
    model: string,
    outputTokens?: number,
    responseTime?: number,
  ) => {
    logger.info(
      `AI Response - Provider: ${provider}, Model: ${model}, Output Tokens: ${outputTokens || 'N/A'}, Response Time: ${responseTime || 'N/A'}ms`,
    );
  },

  error: (provider: string, error: string) => {
    logger.error(`AI Error - Provider: ${provider}, Error: ${error}`);
  },

  cost: (provider: string, cost: number) => {
    logger.info(`AI Cost - Provider: ${provider}, Cost: $${cost.toFixed(6)}`);
  },
};

// Database operation logger
export const dbLogger = {
  query: (operation: string, table: string, duration?: number) => {
    logger.debug(
      `DB Query - Operation: ${operation}, Table: ${table}, Duration: ${duration || 'N/A'}ms`,
    );
  },

  error: (operation: string, error: string) => {
    logger.error(`DB Error - Operation: ${operation}, Error: ${error}`);
  },

  connection: (status: 'connected' | 'disconnected' | 'error') => {
    logger.info(`DB Connection - Status: ${status}`);
  },
};

export default logger;
