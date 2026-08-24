# Phase 0B semantic evidence — wallet.module.ts

**Archive member:** `src/modules/wallet/wallet.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–25; full 25-line member covered.

Lines 2–10 import WalletService/Controller, wallet schemas, UserSchema, three repository wrappers and MoyasarModule. Lines 12–24 define WalletModule.

Lines 13–20 import MoyasarModule and register Wallet, WalletTransaction and User models. Lines 21–23 register WalletController, WalletService and string-token repositories, and export WalletService. No module-level JwtAuthGuard/Roles, idempotency interceptor, transaction/session provider, ledger/outbox, balance invariant or card-tokenization boundary is registered here.

**Audit judgment:** Module wiring confirms wallet operations can call Moyasar and the three generic repositories, but it adds no financial atomicity, duplicate-reference protection, owner binding, card-data protection or security policy. Those controls must be evidenced in WalletService/Controller/repositories and schema/indexes, not inferred from this module.

No product code was changed and no tests were executed during this semantic read.
