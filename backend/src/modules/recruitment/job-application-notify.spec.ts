import { RecruitmentService } from './recruitment.module';
import { I18nService } from '../i18n/i18n.service';

/** QA P2: the job side moved an application and the candidate's inbox stayed empty. */
describe('the candidate is told when the job side changes an application', () => {
  const setup = (opts: { status?: string; candidate?: any; notifyFails?: boolean; noNotifications?: boolean } = {}) => {
    const app: any = { id: 'a1', job_id: 'j1', candidate_id: 'c1', status: opts.status ?? 'submitted', save: jest.fn(async () => undefined), toObject() { return { id: 'a1', status: this.status }; } };
    const appModel: any = { findOne: jest.fn(async () => app) };
    const jobModel: any = { findOne: jest.fn(() => ({ lean: async () => ({ id: 'j1', facility_id: 'f1', title: 'Staff nurse' }) })) };
    const candidateModel: any = { findOne: jest.fn(() => ({ lean: async () => ('candidate' in opts ? opts.candidate : { id: 'c1', user_id: 'u-cand' }) })) };
    const notifications: any = { create: jest.fn(async () => { if (opts.notifyFails) throw new Error('queue down'); return {}; }) };
    const svc = new (RecruitmentService as any)(candidateModel, jobModel, appModel, opts.noNotifications ? undefined : notifications) as RecruitmentService;
    return { svc, app, notifications, candidateModel };
  };

  it.each(['under_review', 'interviewing', 'accepted', 'rejected'])('%s: one notification to the candidate\'s user, with the job title', async (status) => {
    const { svc, notifications, candidateModel } = setup();
    const out: any = await svc.updateApplicationStatus('a1', 'f1', 'hospital', status);
    expect(out.status).toBe(status);
    expect(candidateModel.findOne).toHaveBeenCalledWith({ id: 'c1' }, { user_id: 1 });
    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'u-cand', title_key: 'notif.job_application.title', body_key: `notif.job_application.${status}.body`, params: { job_title: 'Staff nurse' },
    }));
  });

  it('every key it sends has a text in Arabic, English and Urdu, and the job title is filled in', () => {
    const i18n = new I18nService();
    for (const status of ['under_review', 'interviewing', 'accepted', 'rejected']) {
      for (const lang of ['ar', 'en', 'ur'] as const) {
        const body = i18n.t(`notif.job_application.${status}.body`, lang, { job_title: 'JOB-X' });
        expect(body).toContain('JOB-X');
        expect(body).not.toBe(`notif.job_application.${status}.body`);
        expect(i18n.t('notif.job_application.title', lang)).not.toBe('notif.job_application.title');
      }
    }
  });

  it('saying the same status again tells nobody twice', async () => {
    const { svc, notifications } = setup({ status: 'under_review' });
    await svc.updateApplicationStatus('a1', 'f1', 'hospital', 'under_review');
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('never for "submitted" (moving back to the first status)', async () => {
    const { svc, notifications } = setup({ status: 'rejected' });
    await svc.updateApplicationStatus('a1', 'f1', 'hospital', 'submitted');
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('a failing notification never undoes the status change', async () => {
    const { svc, app } = setup({ notifyFails: true });
    const out: any = await svc.updateApplicationStatus('a1', 'f1', 'hospital', 'accepted');
    expect(out.status).toBe('accepted');
    expect(app.save).toHaveBeenCalled();
  });

  it('a candidate without a user, or no notification service, changes nothing and does not fail', async () => {
    const a = setup({ candidate: null });
    await expect(a.svc.updateApplicationStatus('a1', 'f1', 'hospital', 'accepted')).resolves.toMatchObject({ status: 'accepted' });
    expect(a.notifications.create).not.toHaveBeenCalled();
    const b = setup({ noNotifications: true });
    await expect(b.svc.updateApplicationStatus('a1', 'f1', 'hospital', 'accepted')).resolves.toMatchObject({ status: 'accepted' });
  });

  it('only the job side that owns the job can change it (no notification for a refused change)', async () => {
    const { svc, notifications } = setup();
    await expect(svc.updateApplicationStatus('a1', 'someone-else', 'doctor', 'accepted')).rejects.toThrow();
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
