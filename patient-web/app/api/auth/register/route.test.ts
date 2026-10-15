import { beforeEach, describe, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({call:vi.fn(),policies:[] as unknown[],register:null as null|(()=>Response)}));
vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call}));
import { POST } from "./route";
function request(body:unknown){return new Request("https://web.test/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});}
const valid={name:"Sandbox Patient",identifier:"patient@example.com",password:"StrongPass!123",locale:"en",consents:[{policy_id:"terms",version:"v1"},{policy_id:"privacy",version:"v1"}]};
const registerCall=()=>state.call.mock.calls.find((c)=>c[0]==="/auth/register");
describe("register BFF",()=>{
  beforeEach(()=>{state.call.mockReset();state.policies=[];state.register=()=>new Response(JSON.stringify({registered:true}),{status:201});
    state.call.mockImplementation(async(path:string)=>path==="/legal/policies"?new Response(JSON.stringify(state.policies),{status:200}):state.register!());});
  it("rejects malformed official input before upstream",async()=>{const response=await POST(request({...valid,consents:[]}));expect(response.status).toBe(400);expect(state.call).not.toHaveBeenCalled();});
  it("forwards official contract fields and rejects token-shaped success",async()=>{state.register=()=>new Response(JSON.stringify({registered:true,access_token:"private"}),{status:201});const response=await POST(request(valid));expect(response.status).toBe(502);expect(JSON.parse(registerCall()![1].body)).toEqual({...valid,consents:[{policy_id:"patient_terms",version:"v1"},{policy_id:"privacy_policy",version:"v1"}]});});
  it("accepts registered=true without returning upstream extras",async()=>{const response=await POST(request(valid));expect(response.status).toBe(201);expect(await response.json()).toEqual({registered:true});});
  it("sends the policies' current versions, never the browser's ids (issue 432)",async()=>{state.policies=[{key:"patient_terms",version:"2026-10-01"},{key:"privacy_policy",version:"3"},{key:"cookies",version:"1",requires_acceptance:false}];await POST(request(valid));expect(JSON.parse(registerCall()![1].body).consents).toEqual([{policy_id:"patient_terms",version:"2026-10-01"},{policy_id:"privacy_policy",version:"3"}]);});
  it("policies exist but neither required one: a clear 503, no account call",async()=>{state.policies=[{key:"cookies",version:"1"}];const response=await POST(request(valid));expect(response.status).toBe(503);expect(registerCall()).toBeUndefined();});
});
