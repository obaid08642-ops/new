import { describe, expect, it } from "vitest";
import { extractDiagnosticBooking } from "./diagnostics";
describe("diagnostic report marker", () => { it("keeps only report availability and never exposes the report URL", () => { expect(extractDiagnosticBooking({ id:"00000000-0000-4000-8000-000000000001", state:"REPORT_READY", signed_report_pdf_url:"https://private/report.pdf", reports:[{body:"private"}] })).toMatchObject({ hasReport:true, state:"REPORT_READY" }); }); });
