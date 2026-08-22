import { Module } from '@nestjs/common';
import { HttpTransportFactory } from './Factory/HttpTransport.factory';
import { HttpTransport } from './HttpTransport';

@Module({
  providers: [HttpTransportFactory],
  exports: [HttpTransport],
})
export class HttpModule {}
