/**
 * @file logger — Structured logging for Coral Agent
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by all modules
 * @owner core-observability
 *
 * Replaces console.log/warn/error with structured, leveled logging.
 * Supports JSON mode for production, human-readable for development.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: '📋',
  warn: '⚠️',
  error: '❌',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',  // gray
  info: '\x1b[36m',   // cyan
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
};

const RESET = '\x1b[0m';

export interface LoggerConfig {
  /** Minimum log level (default: 'debug') */
  minLevel?: LogLevel;
  /** Use JSON format (default: false) */
  json?: boolean;
  /** Module name prefix */
  module?: string;
  /** Enable color output (default: true for non-json) */
  color?: boolean;
}

/**
 * Lightweight structured logger.
 *
 * Usage:
 *   const log = new Logger({ module: 'Engine' });
 *   log.info('Starting', { adapterCount: 2 });
 *   log.error('Failed to start', { error: err.message });
 */
export class Logger {
  private minLevel: LogLevel;
  private json: boolean;
  private module: string;
  private color: boolean;

  constructor(config: LoggerConfig = {}) {
    this.minLevel = config.minLevel ?? 'debug';
    this.json = config.json ?? false;
    this.module = config.module ?? '';
    this.color = config.color ?? true;
  }

  /** Create a child logger with a sub-module prefix */
  child(subModule: string): Logger {
    return new Logger({
      minLevel: this.minLevel,
      json: this.json,
      module: this.module ? `${this.module}:${subModule}` : subModule,
      color: this.color,
    });
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm

    if (this.json) {
      const entry: Record<string, unknown> = {
        ts,
        level,
        msg: message,
      };
      if (this.module) entry.module = this.module;
      if (data) Object.assign(entry, data);
      const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
      stream.write(JSON.stringify(entry) + '\n');
    } else {
      const icon = LEVEL_ICONS[level];
      const prefix = this.color ? LEVEL_COLORS[level] : '';
      const suffix = this.color ? RESET : '';
      const moduleTag = this.module ? `[${this.module}] ` : '';
      const dataStr = data ? ' ' + JSON.stringify(data) : '';
      const line = `${prefix}${ts} ${icon} ${moduleTag}${message}${dataStr}${suffix}`;

      if (level === 'error') {
        process.stderr.write(line + '\n');
      } else {
        process.stdout.write(line + '\n');
      }
    }
  }
}

/** Default global logger (module: 'Coral') */
export const log = new Logger({ module: 'Coral' });
