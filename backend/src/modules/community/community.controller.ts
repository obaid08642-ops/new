import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req,
} from '@nestjs/common';
import { CommunityService } from './community.service';

@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ── Posts ──────────────────────────────────────────────────────────────────

  @Get('posts')
  listPosts(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('tag') tag: string,
    @Query('category') category: string,
  ) {
    return this.communityService.listPosts(+page || 1, +limit || 20, tag, category);
  }

  @Post('posts')
  createPost(@Req() req: any, @Body() body: any) {
    return this.communityService.createPost(req.user?.id ?? 'guest', body);
  }

  @Get('posts/:id')
  getPost(@Param('id') id: string) {
    return this.communityService.getPostDetail(id);
  }

  @Post('posts/:id/comment')
  addComment(@Req() req: any, @Param('id') postId: string, @Body() body: { body: string; is_anonymous?: boolean }) {
    return this.communityService.addComment(req.user?.id ?? 'guest', postId, body.body, body.is_anonymous);
  }

  @Put('posts/:id/vote')
  votePost(@Req() req: any, @Param('id') postId: string, @Body() body: { vote: 'up' | 'down' }) {
    return this.communityService.votePost(req.user?.id ?? 'guest', postId, body.vote);
  }

  @Delete('posts/:id')
  deletePost(@Req() req: any, @Param('id') postId: string) {
    return this.communityService.deletePost(req.user?.id ?? 'guest', postId);
  }

  // ── Admin Moderation ───────────────────────────────────────────────────────

  @Get('admin/pending')
  pendingPosts(@Query('page') page: string) {
    return this.communityService.getPendingPosts(+page || 1);
  }

  @Put('admin/:id/moderate')
  moderatePost(@Param('id') postId: string, @Body() body: { decision: 'published' | 'removed' }) {
    return this.communityService.moderatePost(postId, body.decision);
  }

  // ── Live Sessions ──────────────────────────────────────────────────────────

  @Get('live-sessions')
  listSessions(@Query('status') status: string) {
    return this.communityService.listSessions(status);
  }

  @Post('live-sessions')
  createSession(@Req() req: any, @Body() body: any) {
    return this.communityService.createSession(req.user?.id ?? 'guest', body);
  }

  @Put('live-sessions/:id/join')
  joinSession(@Req() req: any, @Param('id') sessionId: string) {
    return this.communityService.joinSession(req.user?.id ?? 'guest', sessionId);
  }

  @Put('live-sessions/:id/status')
  updateSessionStatus(
    @Param('id') sessionId: string,
    @Body() body: { status: 'live' | 'ended' | 'cancelled'; stream_url?: string },
  ) {
    return this.communityService.updateSessionStatus(sessionId, body.status, body.stream_url);
  }
}
