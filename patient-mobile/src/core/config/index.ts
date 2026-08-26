/**
 * Core Config — barrel export
 */
export {
  config, ENVIRONMENT,
  applyRemoteConfig,
  isDev, isStaging, isProd, isRTLLocale,
  type AppConfig, type AppEnvironment,
} from './ConfigManager';
