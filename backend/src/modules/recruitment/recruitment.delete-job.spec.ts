// Q61: the admin jobs page needs publish / close / delete. Delete is a soft
// delete (is_deleted = true, kept for audit), admin-only and audited.
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RecruitmentController, RecruitmentService } from './recruitment.module';
import { ROLES_KEY } from '../../common/auth.guard';
import { AUDITED_KEY } from '../../common/audit-log.interceptor';

type Handler = (...args: unknown[]) => unknown;

function handler(name: string): Handler {
  const fn = (RecruitmentController.prototype as unknown as Record<string, Handler | undefined>)[name];
  if (!fn) throw new Error(`RecruitmentController.${name} is missing`);
  return fn;
}

describe('DELETE /recruitment/jobs/:id (Q61)', () => {
  it('is a DELETE route on jobs/:id', () => {
    const fn = handler('deleteJob');
    expect(Reflect.getMetadata(METHOD_METADATA, fn)).toBe(RequestMethod.DELETE);
    expect(Reflect.getMetadata(PATH_METADATA, fn)).toBe('jobs/:id');
  });

  it('is limited to admins (not facilities or doctors) and audited', () => {
    const fn = handler('deleteJob');
    expect(Reflect.getMetadata(ROLES_KEY, fn)).toEqual(['admin']);
    expect(Reflect.getMetadata(AUDITED_KEY, fn)).toEqual(expect.objectContaining({ model: 'JobPosting', idParam: 'id', action: 'job_posting_delete' }));
  });

  it('soft-deletes through the service with the caller identity', async () => {
    const softDeleteJob = jest.fn().mockResolvedValue({ success: true });
    const controller = new RecruitmentController({ softDeleteJob } as unknown as RecruitmentService);
    const result = await (controller as unknown as { deleteJob: Handler }).deleteJob({ id: 'admin-1', role: 'admin' }, 'job-1');
    expect(softDeleteJob).toHaveBeenCalledWith('job-1', 'admin-1', 'admin');
    expect(result).toEqual({ success: true });
  });

  it('the service marks the job deleted instead of removing it', async () => {
    const job = { id: 'job-1', facility_id: 'guest:dev', is_deleted: false, save: jest.fn().mockResolvedValue(undefined) };
    const jobModel = { findOne: jest.fn().mockResolvedValue(job) };
    const service = new RecruitmentService({} as never, jobModel as never, {} as never);
    await expect(service.softDeleteJob('job-1', 'admin-1', 'admin')).resolves.toEqual({ success: true });
    expect(jobModel.findOne).toHaveBeenCalledWith({ id: 'job-1', is_deleted: false });
    expect(job.is_deleted).toBe(true);
    expect(job.save).toHaveBeenCalled();
  });
});
