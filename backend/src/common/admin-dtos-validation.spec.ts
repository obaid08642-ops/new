import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AdminRecoveryRedeemDto, AdminRecoveryStartDto, StepUpIssueDto } from '../modules/auth/admin-recovery.dto';
import { PlaceLegalHoldDto } from '../modules/security/legal-hold.dto';
import { RefundPolicyDto } from '../modules/refund-policy/refund-policy.dto';
import { CreateChallengeDto, CreateRewardDto, UpdateLoyaltyConfigDto, UpdateRewardDto } from '../modules/loyalty/loyalty-admin.dto';
import { DisputeConfigDto } from '../modules/admin/web-core/controllers/admin-config.dto';
import { DecideClaimDto } from '../modules/insurance/insurance.dto';

// The bodies that used to be typed as `any` or as an inline type (dtolint): each now has a class, and the global ValidationPipe (whitelist + forbidNonWhitelisted + transform) enforces it.
const problems = (cls: any, body: unknown) => validateSync(plainToInstance(cls, body) as object, { whitelist: true, forbidNonWhitelisted: true }).map((e) => e.property).sort();

describe('admin DTOs that replaced untyped bodies', () => {
  it('recovery and step-up', () => {
    expect(problems(AdminRecoveryStartDto, { email: 'a@b.test' })).toEqual([]);
    expect(problems(AdminRecoveryStartDto, {})).toEqual(['email']);
    expect(problems(AdminRecoveryRedeemDto, { email: 'a@b.test', email_code: '123456' })).toEqual([]);
    expect(problems(AdminRecoveryRedeemDto, { email: 'a@b.test', email_code: '1', recovery_code: 5 })).toEqual(['recovery_code']);
    expect(problems(StepUpIssueDto, { identifier: 'a@b.test', action: 'POST:/x', response: { id: 'cred' } })).toEqual([]);
    expect(problems(StepUpIssueDto, { identifier: 'a@b.test', action: 'POST:/x', response: 'text' })).toEqual(['response']);
    expect(problems(StepUpIssueDto, { identifier: 'a@b.test', action: 'x', response: {}, extra: 1 })).toEqual(['extra']);
  });

  it('legal hold, claim decision, dispute cap', () => {
    expect(problems(PlaceLegalHoldDto, { user_id: 'u1', reason: 'court order 77', until: '2027-01-01' })).toEqual([]);
    expect(problems(PlaceLegalHoldDto, { user_id: 'u1' })).toEqual(['reason']);
    expect(problems(DecideClaimDto, { approve: false, note: 'no cover' })).toEqual([]);
    expect(problems(DecideClaimDto, { note: 'x' })).toEqual(['approve']);
    expect(problems(DisputeConfigDto, { max_refund_sar: '2500' })).toEqual([]);
    expect(problems(DisputeConfigDto, { max_refund_sar: 'lots' })).toEqual(['max_refund_sar']);
  });

  it('refund policy: nested groups, ranges, no stray keys', () => {
    const ok = {
      consultation: { full_refund_min_hours: 2, late_refund_percent: 50, patient_no_show_percent: 0, free_reschedules: 1, free_reschedule_min_hours: 2 },
      home_visit: { trip_fee_sar: 40, patient_absent_percent: 0 },
      pharmacy: { refund_delivery_fee_before_dispatch: true },
    };
    expect(problems(RefundPolicyDto, ok)).toEqual([]);
    expect(problems(RefundPolicyDto, { ...ok, consultation: { ...ok.consultation, late_refund_percent: 120 } })).toEqual(['consultation']);
    expect(problems(RefundPolicyDto, { ...ok, pharmacy: {} })).toEqual(['pharmacy']);
    expect(problems(RefundPolicyDto, { ...ok, wallet: {} })).toEqual(['wallet']);
  });

  it('loyalty: rewards, challenges, config (numeric strings from a form still work)', () => {
    const reward = { title_ar: 'خصم', title_en: 'Discount', points_required: 500, reward_type: 'coupon', stock: 100 };
    expect(problems(CreateRewardDto, reward)).toEqual([]);
    expect(problems(CreateRewardDto, { ...reward, reward_type: 'cash' })).toEqual(['reward_type']);
    expect(problems(CreateRewardDto, { ...reward, points_required: '500' })).toEqual([]);
    expect(problems(UpdateRewardDto, { active: false })).toEqual([]);
    expect(problems(UpdateRewardDto, { active: 'no' })).toEqual(['active']);
    const ch = { title_ar: 'تحدي', title_en: 'Challenge', target_action: 'book_appointment', target_count: 1, reward_points: 200, start_date: '2026-11-10', end_date: '2026-12-10' };
    expect(problems(CreateChallengeDto, ch)).toEqual([]);
    expect(problems(CreateChallengeDto, { ...ch, start_date: 'soon' })).toEqual(['start_date']);
    expect(problems(UpdateLoyaltyConfigDto, { points_per_order: '10', max_redeem_percent: 10, redeem_enabled: true, earn_points: { order: 5 }, earn_caps: { daily: { order: 5 }, monthly: {} } })).toEqual([]);
    expect(problems(UpdateLoyaltyConfigDto, { max_redeem_percent: 150 })).toEqual(['max_redeem_percent']);
    expect(problems(UpdateLoyaltyConfigDto, { earn_points: [1] })).toEqual(['earn_points']);
  });
});
