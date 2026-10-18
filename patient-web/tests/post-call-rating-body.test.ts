import { describe, expect, it } from "vitest";
import { reviewBody } from "../components-next/post-call-rating-form";

describe("post-call rating request body", () => {
  it("sends the booking kind and id the backend reads, with the rating", () => {
    expect(reviewBody("appt-1", 4, " good doctor ", "en")).toEqual({
      booking_kind: "appointment",
      booking_id: "appt-1",
      rating: 4,
      comment: "good doctor",
      locale: "en",
    });
  });

  it("leaves the comment out when it is blank", () => {
    expect(reviewBody("appt-1", 5, "   ", "ar").comment).toBeUndefined();
  });

  it("does not send the field names the backend ignores", () => {
    const body = reviewBody("appt-1", 3, "", "fil") as Record<string, unknown>;
    expect(body).not.toHaveProperty("appointment_id");
  });
});
