import { JwtAuthGuard, SelfService, Roles } from '../../common/auth.guard';
import { CreatePostDto, CreateSessionDto, AddCommentDto, VotePostDto, ModeratePostDto, UpdateSessionStatusDto} from './community.dto';
import { UseGuards } from '@nestjs/common';
import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { UserRole } from '../../common/enums';

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

  @SelfService()
  @Post('posts')
  createPost(@Req() req: any, @Body() body: CreatePostDto) {
    return this.communityService.createPost(req.user?.id ?? 'guest', body);
  }

  @Get('posts/:id')
  getPost(@Param('id') id: string) {
    return this.communityService.getPostDetail(id);
  }

  @SelfService()
  @Post('posts/:id/comment')
  addComment(@Req() req: any, @Param('id') postId: string, @Body() body: AddCommentDto) {
    return this.communityService.addComment(req.user?.id ?? 'guest', postId, body.body, body.is_anonymous);
  }

  @SelfService()
  @Put('posts/:id/vote')
  votePost(@Req() req: any, @Param('id') postId: string, @Body() body: VotePostDto) {
    return this.communityService.votePost(req.user?.id ?? 'guest', postId, body.vote);
  }

  @SelfService()
  @Delete('posts/:id')
  deletePost(@Req() req: any, @Param('id') postId: string) {
    return this.communityService.deletePost(req.user?.id ?? 'guest', postId);
  }

  // ── Admin Moderation ───────────────────────────────────────────────────────

  @Roles(UserRole.ADMIN)
  @Get('admin/pending')
  pendingPosts(@Query('page') page: string) {
    return this.communityService.getPendingPosts(+page || 1);
  }

  @Roles(UserRole.ADMIN)
  @Put('admin/:id/moderate')
  moderatePost(@Param('id') postId: string, @Body() body: ModeratePostDto) {
    return this.communityService.moderatePost(postId, body.decision);
  }

  // ── Live Sessions ──────────────────────────────────────────────────────────

  @Get('live-sessions')
  listSessions(@Query('status') status: string) {
    return this.communityService.listSessions(status);
  }

  @SelfService()
  @Post('live-sessions')
  createSession(@Req() req: any, @Body() body: CreateSessionDto) {
    return this.communityService.createSession(req.user?.id ?? 'guest', body);
  }

  @Roles(UserRole.ADMIN)
  @Put('live-sessions/:id/join')
  joinSession(@Req() req: any, @Param('id') sessionId: string) {
    return this.communityService.joinSession(req.user?.id ?? 'guest', sessionId);
  }

  @Roles(UserRole.ADMIN)
  @Put('live-sessions/:id/status')
  updateSessionStatus(
    @Param('id') sessionId: string,
    @Body() body: UpdateSessionStatusDto,
  ) {
    return this.communityService.updateSessionStatus(sessionId, body.status, body.stream_url);
  }
}
