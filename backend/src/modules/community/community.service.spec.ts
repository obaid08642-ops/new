import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CommunityService } from './community.service';

describe('CommunityService', () => {
  let service: CommunityService;
  let postModel: any;
  let commentModel: any;
  let sessionModel: any;

  beforeEach(async () => {
    postModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    commentModel = {
      find: jest.fn(),
      create: jest.fn(),
    };
    sessionModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        { provide: 'PostRepository', useValue: postModel },
        { provide: 'PostCommentRepository', useValue: commentModel },
        { provide: 'LiveSessionRepository', useValue: sessionModel },
      ],
    }).compile();

    service = module.get<CommunityService>(CommunityService);
  });

  describe('createPost', () => {
    it('should create a post with published status for safe content', async () => {
      postModel.create.mockResolvedValue({ id: 'post-1', status: 'published' });
      const result = await service.createPost('user-1', {
        title: 'نصيحة صحية', body: 'الرياضة مفيدة للقلب والجسم', tags: ['health'],
      });
      expect(result.ok).toBe(true);
      expect(result.status).toBe('published');
    });

    it('should auto-flag post with sensitive keywords to pending_review', async () => {
      postModel.create.mockImplementation((data: any) => Promise.resolve({ id: 'post-2', status: data.status }));
      const result = await service.createPost('user-1', {
        title: 'موضوع عن الانتحار', body: 'محتوى حساس', tags: [],
      });
      expect(result.status).toBe('pending_review');
    });
  });

  describe('votePost', () => {
    it('should upvote a post and track voter ID', async () => {
      postModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'post-1', status: 'published', upvoter_ids: [], downvoter_ids: [] }),
      });
      postModel.updateOne.mockResolvedValue({});
      const result = await service.votePost('user-1', 'post-1', 'up');
      expect(result.action).toBe('upvoted');
    });

    it('should undo upvote if user already upvoted', async () => {
      postModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'post-1', status: 'published', upvoter_ids: ['user-1'], downvoter_ids: [] }),
      });
      postModel.updateOne.mockResolvedValue({});
      const result = await service.votePost('user-1', 'post-1', 'up');
      expect(result.action).toBe('upvote_removed');
    });
  });

  describe('deletePost', () => {
    it('should allow author to delete their post', async () => {
      postModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'post-1', author_id: 'user-1' }),
      });
      postModel.updateOne.mockResolvedValue({});
      const result = await service.deletePost('user-1', 'post-1');
      expect(result.ok).toBe(true);
    });

    it('should throw if non-author tries to delete post', async () => {
      postModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'post-1', author_id: 'user-1' }),
      });
      await expect(service.deletePost('user-2', 'post-1')).rejects.toThrow(
        'You can only delete your own posts',
      );
    });
  });

  describe('joinSession', () => {
    it('should allow a user to join an upcoming live session', async () => {
      sessionModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'sess-1', status: 'upcoming', attendee_ids: [] }),
      });
      sessionModel.updateOne.mockResolvedValue({});
      const result = await service.joinSession('user-1', 'sess-1');
      expect(result.action).toBe('joined');
    });

    it('should return already_joined if user joins again', async () => {
      sessionModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'sess-1', status: 'live', attendee_ids: ['user-1'] }),
      });
      const result = await service.joinSession('user-1', 'sess-1');
      expect(result.action).toBe('already_joined');
    });
  });
});
