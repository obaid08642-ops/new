import 'reflect-metadata';

// D-1: community user posts are gone; doctor articles replace them (owner decision).
describe('D-1 community removed, doctor articles', () => {
  it('has no community controller module left', () => {
    expect(() => require('../community/community.controller')).toThrow();
  });

  it('exposes doctor article submission and own-list routes', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DoctorArticlesController } = require('./doctor-articles.controller');
    const proto = DoctorArticlesController.prototype as any;
    expect(typeof proto.submit).toBe('function');
    expect(typeof proto.mine).toBe('function');
    const paths: string[] = [];
    for (const name of Object.getOwnPropertyNames(proto)) {
      try {
        const p = Reflect.getMetadata('path', proto[name]);
        if (typeof p === 'string') paths.push(p);
        if (Array.isArray(p)) paths.push(...p);
      } catch {
        /* ignore */
      }
    }
    expect(Reflect.getMetadata('path', DoctorArticlesController)).toBe('doctor/articles');
  });

  it('lets the admin approve or reject with a reason', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ArticlesAdminController } = require('./articles.module');
    const proto = ArticlesAdminController.prototype as any;
    expect(typeof proto.approve).toBe('function');
    expect(typeof proto.reject).toBe('function');
  });
});
