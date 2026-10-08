import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
@Injectable()
class SyntheticRepository { read() { return 'synthetic-ok'; } }
@Injectable()
class SyntheticService {
  constructor(private readonly repository: SyntheticRepository) {}
  read() { return this.repository.read(); }
}
@Module({ providers: [SyntheticRepository, SyntheticService] })
class FixtureModule {}
assert.deepEqual(Reflect.getMetadata('design:paramtypes', SyntheticService), [SyntheticRepository]);
const app = await NestFactory.createApplicationContext(FixtureModule, { logger: false, abortOnError: false });
try { assert.equal(app.get(SyntheticService).read(), 'synthetic-ok'); }
finally { await app.close(); }

@Module({ providers: [SyntheticService] })
class MissingProviderModule {}
await assert.rejects(NestFactory.createApplicationContext(MissingProviderModule, { logger: false, abortOnError: false }), /SyntheticRepository/);
console.log('PASS TypeScript7 decorator metadata, ESM runtime, Nest DI and omitted-provider failure');
