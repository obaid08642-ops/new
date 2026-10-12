import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { RedisCacheInterceptor } from '../../common/redis-cache.interceptor';
import { SearchIntentModule } from '../search-intent/search-intent.module';
import { EntityGraphModule } from '../entity-graph/entity-graph.module';
import { LocationModule } from '../location/location.module';
import { AgentOAuthModule } from '../agent-oauth/agent-oauth.module';

@Module({
  imports: [
    SearchIntentModule,
    EntityGraphModule,
    LocationModule,
    AgentOAuthModule,
  ],
  controllers: [McpController],
  providers: [McpService, RedisCacheInterceptor],
  exports: [McpService],
})
export class McpModule {}
