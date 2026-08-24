# Phase 0B semantic evidence — geo-engine.service.ts

**Archive member:** `src/modules/provider/services/geo-engine.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–52; full 52-line member covered.

Lines 2–10 describe a pure geographic helper using Haversine distance and define `LatLng`. Lines 11–20 calculate kilometers between coordinates after checking only that `lat` values are numbers; longitude types, finite ranges and latitude ranges are not validated. Lines 22–24 compare distance to a supplied radius. Lines 26–38 implement ray-casting point-in-polygon for arrays of at least three points. Lines 40–50 iterate active zones and return the first matching circle or polygon zone.

**Correctness/validation:** no validation of latitude [-90,90], longitude [-180,180], finite values, radius positivity, polygon coordinate validity, self-intersection, winding/closure, antimeridian handling or boundary semantics is visible. NaN/Infinity and malformed longitude values can produce invalid or surprising results. Circle zones default missing radius to zero; polygon algorithm is planar and may be unsuitable for large geographic areas or antimeridian-crossing zones.

**Security/ownership:** this helper contains no ownership, tenant or caller authorization; zone ownership must be enforced by callers. `matchZone` trusts supplied zone objects and active flags.

**Truthfulness/operational:** distance is local mathematical calculation with no geocoding or map-provider source, so address-to-coordinate correctness is outside this member. A first-match policy can conceal overlapping-zone precedence and does not expose why another zone was rejected.

**Performance/reliability:** polygon matching is O(number of zones × polygon vertices); no bounds on zone count or polygon size are visible. No logging, metrics or error handling is present because the helper is pure.

**Price/payment/insurance source:** none visible.

**Test implications:** require finite/range validation, zero/negative/NaN cases, boundary and vertex behavior, self-intersecting/closed rings, antimeridian and large-area cases, overlapping-zone precedence, malformed zone resilience, and caller-level ownership/tenant tests. No tests executed during this semantic read.
