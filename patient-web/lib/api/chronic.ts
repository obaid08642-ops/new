import { z } from "zod";
const diseaseSchema=z.object({id:z.string().max(120).optional(),name:z.string().max(200),source:z.string().max(60).optional()}).passthrough();
export type ChronicDisease={id?:string;name:string;source?:string};
export function parseChronicDiseases(payload:unknown):ChronicDisease[]{const rows=Array.isArray(payload)?payload:(payload&&typeof payload==="object"&&Array.isArray((payload as Record<string,unknown>).data)?(payload as Record<string,unknown>).data:[]);return (rows as unknown[]).flatMap((value)=>{const p=diseaseSchema.safeParse(value);return p.success?[{id:p.data.id,name:p.data.name,source:p.data.source}]:[];});}
