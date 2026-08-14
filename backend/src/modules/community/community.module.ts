// @ts-nocheck
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { PostSchema, PostCommentSchema, LiveSessionSchema } from '../../schemas/community.schemas';
import { LiveSessionRepository } from "./repositories/livesession.repository";
import { PostRepository } from "./repositories/post.repository";
import { PostCommentRepository } from "./repositories/postcomment.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Post', schema: PostSchema },
      { name: 'PostComment', schema: PostCommentSchema },
      { name: 'LiveSession', schema: LiveSessionSchema },
    ]),
  ],
  controllers: [CommunityController],
  providers: [CommunityService, { provide: 'LiveSessionRepository', useClass: LiveSessionRepository }, { provide: 'PostRepository', useClass: PostRepository }, { provide: 'PostCommentRepository', useClass: PostCommentRepository }],
  exports: [CommunityService],
})
export class CommunityModule {}
