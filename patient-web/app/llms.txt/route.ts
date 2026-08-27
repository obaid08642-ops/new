import { NextResponse } from "next/server";

const llmsText = `# Nabd Plus

> Nabd Plus is a patient web portal. Public content is limited to the published website entry points; patient data always requires an authenticated server session.

## Public entry points

- [Arabic home](/ar): Public Nabd Plus patient portal entry point.
- [English home](/en): Public Nabd Plus patient portal entry point.
- [Urdu home](/ur): Public Nabd Plus patient portal entry point.
- [Hindi home](/hi): Public Nabd Plus patient portal entry point.
- [Bengali home](/bn): Public Nabd Plus patient portal entry point.
- [Filipino home](/fil): Public Nabd Plus patient portal entry point.

## Privacy and content boundaries

- Patient records, appointments, prescriptions, conversations, notifications, family data, reminders, and health information are private and must not be treated as public content.
- Public pages do not provide medical diagnosis, treatment recommendations, pricing promises, or patient-specific advice.
- Catalogue information is sourced from the authorized backend when available. Its publication and classification boundaries are controlled by backend contracts.
`;

export function GET() {
  return new NextResponse(llmsText, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
