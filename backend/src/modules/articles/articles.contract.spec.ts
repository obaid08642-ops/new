import { NotFoundException } from '@nestjs/common';
import { REQUIRE_IDEMPOTENCY } from '../../common/idempotency.interceptor';
import { ArticleBookmarkContractController, ArticlesService } from './articles.module';

function controllerFor() {
  const col = { updateOne: jest.fn().mockResolvedValue({}), deleteOne: jest.fn().mockResolvedValue({}) };
  const conn: any = { db: { collection: jest.fn().mockReturnValue(col) } };
  const svc: any = { publishedById: jest.fn().mockResolvedValue({ id: 'article-1' }) };
  return { controller: new ArticleBookmarkContractController(conn, svc), col, svc };
}

describe('Article bookmark contract bridge', () => {
  it('upserts only the caller-owned bookmark for a published article', async () => {
    const { controller, col, svc } = controllerFor();
    await expect(controller.add({ id: 'user-1' }, 'article-1')).resolves.toEqual({ bookmarked: true });
    expect(svc.publishedById).toHaveBeenCalledWith('article-1');
    expect(col.updateOne).toHaveBeenCalledWith(
      { user_id: 'user-1', article_id: 'article-1' },
      { $setOnInsert: expect.objectContaining({ user_id: 'user-1', article_id: 'article-1' }) },
      { upsert: true },
    );
  });

  it('deletes only the caller-owned bookmark and remains a no-op when absent', async () => {
    const { controller, col } = controllerFor();
    await expect(controller.remove({ id: 'user-1' }, 'article-1')).resolves.toEqual({ bookmarked: false });
    expect(col.deleteOne).toHaveBeenCalledWith({ user_id: 'user-1', article_id: 'article-1' });
  });

  it('does not mutate bookmarks when the article is not public', async () => {
    const { controller, col, svc } = controllerFor();
    svc.publishedById.mockRejectedValue(new NotFoundException('article_not_found'));
    await expect(controller.add({ id: 'user-1' }, 'private-article')).rejects.toThrow(NotFoundException);
    expect(col.updateOne).not.toHaveBeenCalled();
  });

  it('requires idempotency on both bookmark mutations', () => {
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, ArticleBookmarkContractController.prototype.add)).toBe(true);
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, ArticleBookmarkContractController.prototype.remove)).toBe(true);
  });
});
