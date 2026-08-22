import { Global, Module } from '@nestjs/common';
import { LoggerId } from '../../Domain';
import { LoggerFactory } from './Factory/Logger.factory';

/**
 * Global, unlike the other infrastructure modules: every layer logs, and
 * threading an import for it through each bounded context buys nothing.
 */
@Global()
@Module({
  providers: [LoggerFactory],
  exports: [LoggerId],
})
export class LoggerModule {}
