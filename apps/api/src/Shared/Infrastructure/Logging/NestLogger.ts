import { Logger as NestLoggerService } from '@nestjs/common';
import type { LogContext, Logger } from '../../Domain';

/**
 * Nest's logger behind our port. Context is rendered as `key=value` pairs
 * rather than JSON so a generation run reads as a legible stream in a terminal
 * — this is what gets screen-recorded.
 */
export class NestLogger implements Logger {
  private readonly delegate: NestLoggerService;

  constructor(private readonly scope = 'App') {
    this.delegate = new NestLoggerService(scope);
  }

  debug(message: string, context?: LogContext): void {
    this.delegate.debug(format(message, context));
  }

  info(message: string, context?: LogContext): void {
    this.delegate.log(format(message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.delegate.warn(format(message, context));
  }

  error(message: string, context?: LogContext): void {
    this.delegate.error(format(message, context));
  }

  forContext(name: string): Logger {
    return new NestLogger(`${this.scope}/${name}`);
  }
}

function format(message: string, context?: LogContext): string {
  if (context === undefined) {
    return message;
  }

  const pairs = Object.entries(context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);

  return pairs.length === 0 ? message : `${message} (${pairs.join(' ')})`;
}
