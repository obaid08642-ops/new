/**
 * Every domain state must map to a universal state: WorkflowEngineService.transition() throws
 * unknown_domain_state for an unmapped value, and callers often catch and ignore it. Live finding:
 * 9 pharmacy order states were unmapped, so no cash/card/insurance order progressed after selection.
 */
import { STATE_MAP } from './workflow-engine.module';
import { PharmacyOrderState } from '../pharmacy/schemas/pharmacy.schema';
import { LabBookingState } from '../../schemas/lab.schema';
import { RadiologyBookingState } from '../../schemas/radiology.schema';
import { NursingBookingState } from '../../schemas/home-care.schema';

const unmapped = (domain: keyof typeof STATE_MAP, states: Record<string, string>) =>
  Object.values(states).filter((v) => !STATE_MAP[domain]?.[String(v).toUpperCase()]);

describe('workflow engine STATE_MAP covers every domain state', () => {
  it('pharmacy order states', () => expect(unmapped('pharmacy', PharmacyOrderState as any)).toEqual([]));
  it('lab booking states', () => expect(unmapped('lab', LabBookingState as any)).toEqual([]));
  it('radiology booking states', () => expect(unmapped('radiology', RadiologyBookingState as any)).toEqual([]));
  it('nursing booking states', () => expect(unmapped('nursing', NursingBookingState as any)).toEqual([]));
});
