import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { AgentToolsService } from './agent-tools.service';
import { RedisCacheInterceptor } from '../../common/redis-cache.interceptor';
import { SearchIntentModule } from '../search-intent/search-intent.module';
import { EntityGraphModule } from '../entity-graph/entity-graph.module';
import { LocationModule } from '../location/location.module';
import { AgentOAuthModule } from '../agent-oauth/agent-oauth.module';
// AC-3: the agent tools reuse these modules' services (no copies of booking or order logic).
import { PharmacyModule } from '../pharmacy/pharmacy.module';
import { CareModule } from '../care/care.module';
import { SlotLocksModule } from '../slot-locks/slot-locks.module';
import { LabsModule } from '../labs/labs.module';
import { RadiologyModule } from '../radiology/radiology.module';
import { HomeCareModule } from '../home-care/home-care.module';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    SearchIntentModule,
    EntityGraphModule,
    LocationModule,
    AgentOAuthModule,
    PharmacyModule,
    CareModule,
    SlotLocksModule,
    LabsModule,
    RadiologyModule,
    HomeCareModule,
    UsersModule,
    RedisModule,
  ],
  controllers: [McpController],
  providers: [McpService, AgentToolsService, RedisCacheInterceptor],
  exports: [McpService, AgentToolsService],
})
export class McpModule {}
