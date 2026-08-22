import { PrismaClient } from '@prisma/client';
import type { AppConfig } from '../../../../../src/Shared/Infrastructure/Config/AppConfig';
import { APP_CONFIG } from '../../../../../src/Shared/Infrastructure/Config/AppConfig';
import { PrismaConnectionFactory } from '../../../../../src/Shared/Infrastructure/Prisma/Factory/PrismaConnection.factory';
import { PrismaConnection } from '../../../../../src/Shared/Infrastructure/Prisma/PrismaConnection';

// Constructing a PrismaClient opens no connection, so these run without a
// database; only the two lifecycle hooks touch the network and both are stubbed.
const configWith = (overrides: Partial<AppConfig> = {}): AppConfig =>
  ({
    nodeEnv: 'test',
    port: 3001,
    databaseUrl: 'postgresql://postgres:postgres@localhost:5432/cv_screener',
    ...overrides,
  }) as AppConfig;

describe('PrismaConnection', () => {
  let connect: jest.SpyInstance;
  let disconnect: jest.SpyInstance;

  beforeEach(() => {
    connect = jest
      .spyOn(PrismaClient.prototype, '$connect')
      .mockResolvedValue(undefined);
    disconnect = jest
      .spyOn(PrismaClient.prototype, '$disconnect')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('connects on module init so an unreachable database fails at boot', async () => {
    const connection = new PrismaConnection(configWith());

    await connection.onModuleInit();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('disconnects on module destroy', async () => {
    const connection = new PrismaConnection(configWith());

    await connection.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  describe('factory', () => {
    it('takes the connection URL from the validated config, not process.env', () => {
      expect(PrismaConnectionFactory).toMatchObject({
        provide: PrismaConnection,
        inject: [APP_CONFIG],
      });
    });

    // Asserted through behaviour rather than `instanceof`: PrismaClient's
    // constructor hands back a Proxy, so the lifecycle methods are reachable
    // but the prototype chain is not the subclass's.
    it('builds a connection whose lifecycle hooks are wired', async () => {
      const { useFactory } = PrismaConnectionFactory as {
        useFactory: (config: AppConfig) => PrismaConnection;
      };

      const connection = useFactory(configWith());
      await connection.onModuleInit();

      expect(connect).toHaveBeenCalledTimes(1);
    });
  });
});
