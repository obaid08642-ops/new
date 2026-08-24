# Phase 0B semantic evidence — provider-otp.service.ts

**Archive member:** `src/modules/provider/services/provider-otp.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–98; full 98-line member covered.

Lines 10–12 define a 10-minute OTP lifetime, 60-second resend cooldown, and five-attempt maximum. Lines 23–30 hash codes with SHA-256, generate six-digit codes with `Math.random`, and create Arabic/English email bodies. Lines 32–58 normalize email, validate only presence of `@`, check the latest active code for cooldown, invalidate active codes, create a hashed OTP with expiry/metadata, send mail, audit issuance, optionally log the plaintext OTP when mail status is `logged`, and return sent/cooldown/expiry/log-only status.

Lines 60–77 verify the latest active code, validate six-character length, reject absent/expired/over-attempt codes, compare SHA-256 hash, increment attempts and audit failures on mismatch, or mark the code used, audit success and return `{ok:true}`. Lines 79–98 implement non-consuming `check` with the same expiry/attempt/hash logic; wrong codes burn attempts, but successful checks remain active until reset consumes them.

**Security findings:** OTP generation uses non-cryptographic `Math.random`; code entropy and unpredictability are weaker than a CSPRNG. Plaintext OTPs are logged when mail is unavailable/log-only, creating credential exposure through logs. SHA-256 without a server-side pepper is vulnerable to offline guessing if OTP records leak, though six-digit OTPs remain rate-limited only by service logic. Email validation is minimal. Purpose and account binding are delegated to callers/meta and are not enforced here.

**Concurrency/integrity:** invalidation of prior codes and creation of a new code are separate operations; concurrent issue calls can both pass cooldown and create active codes. Verify reads the latest active document and later saves status/attempts without atomic compare-and-set, so concurrent verification may permit replay or lose attempt increments. `check` intentionally does not consume a successful code, increasing the need for strict caller flow and race-safe reset consumption.

**Reliability/truthfulness:** mail send status can be `logged`; the service returns `sent` false only for failed and exposes `log_only`, but no delivery guarantee, retry, outbox, alerting, or cleanup is visible. Audit writes occur after create/send and failure handling is not shown; audit failure could affect request behavior. The six-digit code and messages are source-generated, not external identity proof.

**Privacy/abuse:** OTP records store email, IP and user-agent; retention/TTL index and redaction are not visible. Error messages reveal active-code state and remaining attempts. No account-level or IP-level distributed rate limiter is visible beyond one-document cooldown.

**Price/payment/insurance source:** none visible.

**Test implications:** require CSPRNG tests, concurrent issue/verify/replay tests, atomic attempt/consume semantics, purpose/account binding, distributed rate limits, log redaction, mail failure/outbox/retry, TTL cleanup, error enumeration controls, audit failure handling, and reset-flow integration. No tests executed during this semantic read.
