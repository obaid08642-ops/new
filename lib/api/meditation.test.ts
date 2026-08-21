import {describe,expect,it} from 'vitest';
import {parseMeditationHistory} from './meditation';
describe('meditation history response guards',()=>{it('keeps activity metadata and drops ownership fields',()=>{expect(parseMeditationHistory([{id:'s1',patient_id:'private',type:'breathing',duration_minutes:10,completed:true,logged_at:'2026-08-20T10:00:00.000Z'}])).toEqual([{id:'s1',type:'breathing',durationMinutes:10,completed:true,loggedAt:'2026-08-20T10:00:00.000Z'}]);});});
