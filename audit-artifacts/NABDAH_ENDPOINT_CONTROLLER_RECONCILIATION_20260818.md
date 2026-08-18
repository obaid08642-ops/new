# Nabdah endpoint/controller reconciliation — initial pass

The first pass extracted **3,165 consumer endpoint records** from the direct Nabdah source and compared literal fragments against decorator arguments in the direct Backend source. Only 18 matched a literal fragment and 3,147 did not.

This result is **triage only, not a defect count**. Backend controllers commonly compose routes from class-level `@Controller()` prefixes, dynamic `:id` parameters, constants, and nested modules, while consumers may include query strings or `/api/v1` prefixes. The initial comparator did not compose those elements, so every non-match must be normalized against the full controller route before being classified as stale.

Required next step is a route compiler that reads class-level and method-level decorators, normalizes dynamic segments/query strings, and then maps each consumer call to an exact controller route and HTTP method. Only after that pass may a record be marked `FIX`, `PASS`, `BLOCKED`, or `INCONCLUSIVE`.
