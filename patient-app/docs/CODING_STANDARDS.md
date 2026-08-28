# Coding Standards

## 1. Strict TypeScript
- `any` is forbidden in new code (unless explicitly bypassing legacy files).
- Interfaces must be defined for all DTOs and Data Models.

## 2. Imports
- Use barrel exports (`index.ts`) for all directories.
- Import using path aliases (e.g., `import { Button } from '@/design-system'`).

## 3. UI Implementation
- **NEVER** use inline styles unless absolutely necessary for dynamic layout calculations.
- **NEVER** use generic colors (`red`, `#000000`). Always map to semantic tokens (`tokens.colors.danger`, `tokens.colors.background`).
- Avoid `Platform.OS === ...` inside JSX. Create platform-agnostic components instead.

## 4. State & Data
- Component state (`useState`) is for UI only (modals, forms).
- Global state (`Redux`) is for cross-module session data (Auth, Cart).
- API requests must go through the Repository Pattern -> `HttpClient`. Never call `fetch` directly.

## 5. Security
- Never store sensitive data (tokens, PII) in `AsyncStorage`. Use `SecureStore` (via `src/utils/security.ts`).
