import { describe, expect, it } from "vitest";
import { reviewBody } from "../components-next/post-call-rating-form";

describe("post-call rating request body", () => {
  it("sends the booking kind and id the backend reads, with the rating", () => {
    expect(reviewBody("appt-1", 4, " good doctor ")).toEqual({
      booking_kind: "appointment",
      booking_id: "appt-1",
      rating: 4,
      comment: "good doctor",
    });
  });

  it("leaves the comment out when it is blank", () => {
    expect(reviewBody("appt-1", 5, "   ").comment).toBeUndefined();
  });

  it("does not send the field names the backend ignores", () => {
    const body = reviewBody("appt-1", 3, "") as Record<string, unknown>;
    // RateDto has no appointment_id or locale, and the API refuses unknown fields
    expect(body).not.toHaveProperty("appointment_id");
    expect(body).not.toHaveProperty("locale");
  });

  it("takes another booking kind, such as a pharmacy order", () => {
    expect(reviewBody("ord-9", 5, "", [], "pharmacy")).toEqual({ booking_kind: "pharmacy", booking_id: "ord-9", rating: 5, comment: undefined });
  });
});

describe("rating aspects", () => {
  it("sends the ticked aspects as the stored words, and none when nothing is ticked", () => {
    expect(reviewBody("appt-1", 5, "", ["fast", "clean"]).aspects).toEqual(["سريع", "نظيف"]);
    expect(reviewBody("appt-1", 5, "")).not.toHaveProperty("aspects");
  });
});
