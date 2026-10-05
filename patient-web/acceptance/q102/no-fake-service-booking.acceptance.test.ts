// ACCEPTANCE — Q102 (REVIEW_REAUDIT Round 12 Phase A #4). Written by the reviewer
// before the fix; the implementing agent makes it pass and may not edit it.
//
// The web service booking modal "confirms" lab, radiology and nursing bookings
// with a setTimeout, a random reference and an invented address
// ("Nabd Medical Center"), never calls the API, and crashes on insurance
// (`copay.toFixed` of undefined, bdcdcb6). Required: the modal books for real
// through the API, or it is removed (owner: no fake data). Either way:
// - no web code fakes a booking confirmation (random reference, invented
//   address, a timer that marks it confirmed);
// - if a service booking modal remains, it calls a real booking endpoint;
// - the confirmation never calls `insuranceDetails.copay.toFixed` (copay can be undefined).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|jsx?)$/.test(name) ? [p] : [];
  });
}

const sources = [...files(join(ROOT, "app")), ...files(join(ROOT, "components-next")), ...files(join(ROOT, "components"))]
  .filter((f) => !/\.(test|spec)\.[jt]sx?$/.test(f))
  .map((f) => ({ f: f.slice(ROOT.length + 1), src: readFileSync(f, "utf8") }));

const offending = (re: RegExp) => sources.filter(({ src }) => re.test(src)).map(({ f }) => f);

describe("Q102: no fake service booking on the web", () => {
  it("no random booking reference is generated in the browser", () => {
    expect(offending(/(ref|reference|booking)\w*\s*=\s*`[^`]*\$\{\s*Math\.(floor|round)\(\s*[\d\s+*]*Math\.random/i)).toEqual([]);
  });

  it("no invented provider address", () => {
    expect(offending(/Nabd Medical Center|مركز نبض الطبي/)).toEqual([]);
  });

  it("no timer marks a booking confirmed", () => {
    expect(offending(/setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]{0,400}?set(Confirmed|Booked|BookingConfirmed)\w*\(/)).toEqual([]);
  });

  it("a service booking modal that remains calls a real booking endpoint", () => {
    const modal = sources.filter(({ f }) => /service-booking-modal\.tsx$/.test(f));
    for (const { f, src } of modal) {
      expect({ f, callsApi: /(callPatientApi|patientFetch|fetch)\([\s\S]{0,200}?\/(lab|radiology|diagnostics|home-care|nursing|bookings)/.test(src) }).toEqual({ f, callsApi: true });
    }
  });

  it("the booking confirmation does not crash on an insurance booking (bdcdcb6: insuranceDetails.copay.toFixed of undefined)", () => {
    expect(offending(/insuranceDetails\.copay\.toFixed\(/)).toEqual([]);
  });
});
