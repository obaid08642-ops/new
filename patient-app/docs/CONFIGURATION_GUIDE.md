# Configuration & Admin Guide

## Admin-Ready Architecture
All configurations in Nabdah Plus are designed to be modifiable remotely by an Admin Dashboard without requiring an app store update.

### Feature Flags
Managed in `src/services/FeatureFlags.ts`. Default values exist locally, but remote configuration takes precedence.

### Theme Engine
Colors, fonts, border radii, and brand logos are governed by `src/theme/ThemeEngine.ts`.
To apply a new theme at runtime:
```ts
import { themeEngine } from '@/theme/ThemeEngine';
themeEngine.applyAdminThemeConfig({ primary: '#newColor' });
```

### Localization
String assets are in `src/i18n/locales/`. The `LanguageManager` handles RTL injection.

## No Hardcoded Values
- **Colors**: Always use `design-system` components or `themeEngine.getTokens()`.
- **Dimensions**: Use spacing tokens from `src/theme/tokens.ts`.
- **URLs**: Use `BASE_URL` from `HttpClient.ts`.
