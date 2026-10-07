import { JwtAuthGuard, Roles, SelfService, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReleaseService } from './release.service';
import { CreateReleaseDto } from './release.dto';

@UseGuards(JwtAuthGuard)
@Controller('release')
@SelfService()
export class ReleaseController {
  constructor(private readonly svc: ReleaseService) {}

  @Post('versions')
  @Roles(UserRole.ADMIN)
  createRelease(@Body() b: CreateReleaseDto) { return this.svc.createRelease(b); }

  @Get('versions')
  @Roles(UserRole.ADMIN)
  listVersions(@Query('app') app?: string, @Query('channel') channel?: string) { 
    return this.svc.getReleaseStatus(app, channel); 
  }

  @Post('versions/:id/submit')
  @Roles(UserRole.ADMIN)
  submitForReview(@Param('id') id: string) { return this.svc.submitForReview(id); }

  @Post('versions/:id/approve')
  @Roles(UserRole.ADMIN)
  approveRelease(@Param('id') id: string) { return this.svc.approveRelease(id); }

  @Post('versions/:id/rollout/advance')
  @Roles(UserRole.ADMIN)
  advanceRollout(@Param('id') id: string, @Body() b: { crash_free_rate: number; anr_rate: number }) { 
    return this.svc.advanceRollout(id, b.crash_free_rate, b.anr_rate); 
  }

  @Post('versions/:id/rollout/halt')
  @Roles(UserRole.ADMIN)
  haltRollout(@Param('id') id: string, @Body() b: { reason: string }) { 
    return this.svc.haltRollout(id, b.reason); 
  }

  @Get('versions/:id/status')
  @Roles(UserRole.ADMIN)
  getReleaseStatus(@Param('id') id: string) { return this.svc.getReleaseStatus('', ''); }

  @Get('versions/:id/checklist')
  @Roles(UserRole.ADMIN)
  getChecklist(@Param('id') id: string) { return this.svc.getReleaseChecklist(id); }

  // Rating prompts (client calls)
  @Post('rating-prompt/check')
  checkPrompt(@CurrentUser() u: any, @Body() b: { app: 'patient-app' | 'provider-app'; trigger: string }) { 
    return this.svc.shouldShowRatingPrompt(b.app, u.id, b.trigger); 
  }

  @Post('rating-prompt/record')
  recordPrompt(@CurrentUser() u: any, @Body() b: { app: 'patient-app' | 'provider-app'; trigger: string; status: 'shown' | 'dismissed' | 'rated' | 'rate_later'; rating?: number }) { 
    return this.svc.recordRatingPrompt(b.app, u.id, b.trigger, b.status, b.rating); 
  }

  // Store reviews
  @Get('store-reviews')
  @Roles(UserRole.ADMIN)
  getStoreReviews(@Query('app') app?: string, @Query('platform') platform?: string) {
    // TODO: implement query
    return { message: 'Use admin panel for store reviews' };
  }

  @Post('store-reviews/:id/reply')
  @Roles(UserRole.ADMIN)
  replyToReview(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { content: string }) { 
    return this.svc.replyToStoreReview(id, b.content, u.id); 
  }
}
