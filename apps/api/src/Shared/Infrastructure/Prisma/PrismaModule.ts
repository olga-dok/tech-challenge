import { Module } from '@nestjs/common';
import { PrismaConnectionFactory } from './Factory/PrismaConnection.factory';
import { PrismaConnection } from './PrismaConnection';

/**
 * Imported explicitly by the modules that persist something, so the dependency
 * is visible in each bounded context rather than ambient. Nest keeps the
 * provider a singleton across importers, which is what the connection pool
 * wants.
 */
@Module({
  providers: [PrismaConnectionFactory],
  exports: [PrismaConnection],
})
export class PrismaModule {}
