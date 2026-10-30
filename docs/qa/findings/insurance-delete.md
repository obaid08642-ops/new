# QA: insurance card delete (I-03)

| severity | route | element | steps | expected | actual | file:line |
|---|---|---|---|---|---|---|
| P2 | /en/insurance (card), API | delete a policy | Look for a way to remove the saved card | A delete action that clears the policy (API and UI) | No delete exists. backend/src/modules/users/users.insurance.controller.ts has GET and POST only; backend/src/modules/insurance-engine/insurance-engine.module.ts has save-policy and my-policy only; the web proxy (patient-web/app/api/insurance/policy/route.ts) has POST and GET only. A user can only overwrite the card, never remove it | backend/src/modules/users/users.insurance.controller.ts:35-57 |

Edit (I-02) is proven over the API by tools/live/j_qa_insurance.py: add, then overwrite, with read-back. The UI "Change policy" button is not clicked yet.
