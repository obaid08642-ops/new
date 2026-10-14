import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunityService } from './community.service';
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
  // D-1 (owner decision 1): community user posts are removed, so no controller is
  // registered — every /community/* route answers 404. The service stays for the archive.
  controllers: [],
  providers: [CommunityService, { provide: 'LiveSessionRepository', useClass: LiveSessionRepository }, { provide: 'PostRepository', useClass: PostRepository }, { provide: 'PostCommentRepository', useClass: PostCommentRepository }],
  exports: [CommunityService],
})
export class CommunityModule {}
