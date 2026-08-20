# Nabdah actual API-call reconciliation

A second extractor scanned only concrete `apiFetch` and HTTP-client invocations in the direct Patient, Provider, and Admin source. It found **404 call records**: 237 Patient, 158 Provider, and 9 Admin. Inferred methods were GET 195, POST 172, PUT 7, PATCH 23, and DELETE 7.

Method-aware matching against the 933 composed Backend routes produced **260 matched calls** and **144 `UNMATCHED_API_REVIEW` records**. The 144 records are a review queue, not a confirmed defect count. Several calls use string concatenation (`'/orders/mine' + id + '/cancel'`), template expressions, or provider-specific route aliases, and the first literal-only extractor cannot reconstruct those full paths. Some Admin calls may also target routes assembled through constants or a different client base path.

No unmatched call is marked PASS or FIX until its complete expression is reconstructed and checked against the controller method, authorization contract, and response shape. The detailed evidence is in `NABDAH_ACTUAL_API_ROUTE_MATCH_20260818.tsv`.
