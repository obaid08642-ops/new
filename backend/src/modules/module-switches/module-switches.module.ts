import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ModuleSwitchesController } from './module-switches.controller';
import { ModuleSwitchesMiddleware } from './module-switches.middleware';
import { ModuleSwitchesService } from './module-switches.service';

@Module({
  controllers: [ModuleSwitchesController],
  providers: [ModuleSwitchesService, ModuleSwitchesMiddleware],
  exports: [ModuleSwitchesService],
})
export class ModuleSwitchesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ModuleSwitchesMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
