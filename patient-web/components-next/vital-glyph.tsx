import { Activity, Droplets, HeartPulse, Scale, Thermometer, Wind } from "lucide-react";

export type VitalGlyphKind = "heart_rate" | "glucose" | "bp" | "weight" | "temperature" | "spo2";

const glyphs = { heart_rate: HeartPulse, glucose: Droplets, bp: Activity, weight: Scale, temperature: Thermometer, spo2: Wind } as const;

export function VitalGlyph({ kind, size = 22 }: { kind: VitalGlyphKind; size?: number }) {
  const Icon = glyphs[kind];
  return <Icon aria-hidden="true" size={size} strokeWidth={1.9} />;
}
