import {describe,expect,it} from 'vitest';
import {extractVitalHistory} from './vitals';
describe('vital history response guards',()=>{it('keeps recorded readings and drops patient ownership fields',()=>{expect(extractVitalHistory([{id:'v1',patient_id:'private',key:'heart_rate',value:'72',unit:'bpm',context:'morning',measured_at:'2026-08-20T10:00:00.000Z'}])).toEqual([{id:'v1',key:'heart_rate',value:'72',unit:'bpm',context:'morning',measuredAt:'2026-08-20T10:00:00.000Z'}]);});});
