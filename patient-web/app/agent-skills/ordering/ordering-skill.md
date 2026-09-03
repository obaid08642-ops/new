# Nabd Plus Medicine & Pharmacy Ordering Skill (Agent Skill)

## Purpose
Enables AI agents and LLM assistants to search the verified Saudi medicine catalog, check therapeutic alternatives, verify SFDA prescription status, and prepare pharmacy orders with smart geo-broadcast routing.

## Capabilities
- **Medicine Search**: Search 20,990+ verified pharmaceutical products by trade name, active ingredient, or SFDA registration code.
- **Therapeutic Equivalence**: Find alternatives sharing the exact active ingredient, concentration, and dosage form.
- **SFDA Prescription Compliance**: Verify whether a product requires an official medical prescription (`is_prescription_required`).
- **Geo-Broadcast Ordering**: Prepare order requests for automatic dispatch across partner pharmacies within 3-8 km delivery radiuses.

## Strict Regulatory Guardrails
- **Prescription Medicine Blocking**: Prescription-required (`Rx`) medications CANNOT be ordered autonomously by AI without an uploaded and pharmacist-verified prescription.
- **SFDA Pricing Enforcement**: Medicine prices are strictly governed by the official Saudi Food & Drug Authority ceiling price; price gouging or arbitrary markup is blocked.
- **Idempotency**: All cart and checkout creations require a unique `idempotency_key`.

## Protocol & Tool References
- MCP Endpoint: `https://api.nabd.plus/api/v1/mcp`
- Tool: `check_prescription_required`
- Tool: `find_alternatives`
- Tool: `prepare_transaction` (type: `medicine_order`)
- Product Feed: `https://api.nabd.plus/api/v1/public/ai-catalog/products`
