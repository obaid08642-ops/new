import { ServiceCatalogService } from './service-catalog.module';

describe('REVIEW-P3: provider service update writes allowlisted fields only', () => {
  it('drops governance/identity keys from the $set even if a caller passes them', async () => {
    let setArg: any;
    const labs: any = { findOneAndUpdate: (_f: any, u: any) => { setArg = u.$set; return Promise.resolve({ toObject: () => ({}) }); } };
    const own: any = { findOne: () => Promise.resolve({ account_id: 'lab-1' }) };
    const bus: any = { emit: () => Promise.resolve() };
    const svc = new ServiceCatalogService(labs, {} as any, own, {} as any, bus);
    await svc.updateService({ id: 'lab-1', role: 'lab' }, 'lab', 's1', {
      price: 90, active: true, id: 'hijack', public_eligibility: true, medical_review_status: 'approved', owner_account_id: 'x',
    });
    expect(setArg).toEqual({ price: 90, active: true });
  });
});
