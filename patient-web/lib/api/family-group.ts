import { z } from "zod";
const groupSchema=z.object({name:z.string().max(160).optional(),owner_id:z.string().max(160).optional(),members:z.array(z.unknown()).optional()}).passthrough();
export type FamilyGroupSummary={name?:string;memberCount:number;viewerIsOwner:boolean};
export function parseFamilyGroup(payload:unknown,viewerId?:string):FamilyGroupSummary|null{const root=payload&&typeof payload==="object"&&!Array.isArray(payload)?payload as Record<string,unknown>:null;const p=groupSchema.safeParse(root?.data&&typeof root.data==="object"?root.data:root);if(!p.success)return null;const members=Array.isArray(p.data.members)?p.data.members:[];return {name:p.data.name,memberCount:members.length,viewerIsOwner:typeof viewerId==="string"&&viewerId.length>0&&p.data.owner_id===viewerId};}
