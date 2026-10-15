import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaternityService } from './maternity.service';
import { MaternityController } from './maternity.controller';
import { MaternityProfileSchema } from '../../schemas/maternity.schema';
import { MaternityProfileRepository } from "./repositories/maternityprofile.repository";
import { MaternityVaccinesController } from './maternity-compat.controller';
import { Article, ArticleSchema } from '../../schemas/article.schema';
import { PregnancyWeek, PregnancyWeekSchema } from '../../schemas/pregnancy-week.schema';
import { AdminAuditService } from '../admin/enterprise/audit.service';
import { PregnancyWeeksService } from './pregnancy-weeks.service';
import { PregnancyWeeksAdminController } from './pregnancy-weeks-admin.controller';
import { MaternityContentController } from './maternity-content.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MaternityProfile', schema: MaternityProfileSchema },
      { name: PregnancyWeek.name, schema: PregnancyWeekSchema },
      { name: Article.name, schema: ArticleSchema },
    ]),
  ],
  controllers: [MaternityController, MaternityContentController, MaternityVaccinesController, PregnancyWeeksAdminController],
  providers: [MaternityService, PregnancyWeeksService, AdminAuditService, { provide: 'MaternityProfileRepository', useClass: MaternityProfileRepository }],
  exports: [MaternityService],
})
export class MaternityModule {}
