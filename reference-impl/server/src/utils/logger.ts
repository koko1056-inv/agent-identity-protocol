/**
 * Enhanced structured logger with environment-based formatting
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogData {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  [key: string]: any;
}

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[logLevel as LogLevel];
}

function formatForDevelopment(data: LogData): string {
  const emoji = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
  }[data.level];

  const time = new Date(data.timestamp).toLocaleTimeString();
  const meta = Object.entries(data)
    .filter(([key]) => !['level', 'message', 'timestamp'].includes(key))
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');

  return `${emoji} [${time}] ${data.message}${meta ? ` | ${meta}` : ''}`;
}

function formatForProduction(data: LogData): string {
  return JSON.stringify(data);
}

function log(level: LogLevel, message: string, meta: Record<string, any> = {}) {
  if (!shouldLog(level)) return;

  const data: LogData = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const output = isDevelopment ? formatForDevelopment(data) : formatForProduction(data);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, any>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, any>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, any>) => log('error', message, meta),
  debug: (message: string, meta?: Record<string, any>) => log('debug', message, meta),
};
