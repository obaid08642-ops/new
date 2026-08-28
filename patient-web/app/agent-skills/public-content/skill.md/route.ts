import { NextResponse } from "next/server";

const skill = `# Nabd Plus public-content discovery

## Purpose
Describe the public, non-patient content that agents may discover on Nabd Plus.

## Safe boundary
Only published public pages and explicitly public catalog endpoints may be read without a patient session. Patient records, appointments, prescriptions, conversations, notifications, family data, reminders, and health information require an authenticated server session and are not exposed by this skill.

## No mutations
This skill does not create bookings, orders, payments, cancellations, reschedules, or account changes.

## Sources
- https://nabd.plus/llms.txt
- https://nabd.plus/.well-known/api-catalog
`;

export function GET() {
  return new NextResponse(skill, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
