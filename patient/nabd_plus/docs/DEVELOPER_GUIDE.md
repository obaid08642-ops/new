# Developer Guide

Welcome to Nabdah Plus! This guide will help you get started with the development workflow.

## Environments
The app supports three environments, managed via `.env` files:
- `.env.development`: Local development (Mock services enabled by default)
- `.env.staging`: Staging environment for QA testing
- `.env.production`: Live production environment

### Switching Environments
```bash
# To run in development
npx expo start

# To run against staging API
EXPO_PUBLIC_ENVIRONMENT=staging npx expo start --clear
```

## Architecture Overview
- **UI & Presentation**: Built with React Native & Expo Router.
- **Design System**: Centralized in `src/design-system/` with strict use of tokens (`src/theme/tokens.ts`).
- **State Management**: Redux Toolkit + Redux Persist (in `src/store/`).
- **Data Layer**: Clean architecture with Repository Pattern (`src/core/data/BaseRepository.ts`).
- **Services**: Isolated singleton managers (`src/services/`) for APIs, analytics, feature flags, permissions, and notifications.

## Testing Strategy
- **Unit Tests**: Place alongside files (e.g., `Button.test.tsx`).
- **Integration Tests**: Place in `__tests__/integration/`.
- **E2E Tests**: Place in `__tests__/e2e/`.

## PR Process
1. Ensure `npx tsc --noEmit` passes with 0 errors.
2. Ensure `npm run lint` passes with 0 errors.
3. No hardcoded strings (use `LanguageManager`).
4. No hardcoded colors (use `ThemeEngine`).
