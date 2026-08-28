import { describe, expect, it } from "vitest";
import { extractAppointmentDetail, extractAppointmentRows, parseAppointmentId } from "./appointments";

const appointmentId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("appointment response guards", () => {
  it("keeps only display-safe appointment fields and ignores queue or patient identifiers", () => {
    const rows = extractAppointmentRows({ data: [{ id: appointmentId, status: "CONFIRMED", service_type: "video", slot_start: "2026-08-20T10:00:00.000Z", payment_method: "insurance", insurance_request_id: "33333333-3333-4333-8333-333333333333", insurance_review_state: "DECIDED", patient_id: "private", wait_time: "15" }] });
    expect(rows).toEqual([{ id: appointmentId, status: "CONFIRMED", serviceType: "video", slotStart: "2026-08-20T10:00:00.000Z", doctorName: undefined, specialty: undefined, paymentMethod: "insurance", insuranceRequestId: "33333333-3333-4333-8333-333333333333", insuranceReviewState: "DECIDED" }]);
  });

  it("accepts only UUID route identifiers and reads provider information only from a valid detail record", () => {
    expect(parseAppointmentId(appointmentId).success).toBe(true);
    expect(parseAppointmentId("not-an-appointment").success).toBe(false);
    expect(extractAppointmentDetail({ id: appointmentId, doctor_name: "Doctor", specialty_ar: "Specialty", queue_position: "3" })).toMatchObject({ id: appointmentId, doctorName: "Doctor", specialty: "Specialty" });
  });
  it("does not pass an untrusted insurance request identifier to an appointment link", () => {
    expect(extractAppointmentDetail({ id: appointmentId, insurance_request_id: "not-a-request" })?.insuranceRequestId).toBeUndefined();
  });
});
