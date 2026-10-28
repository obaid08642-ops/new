// Over-the-air updates (docs/ops/OTA_UPDATES.md). app.json holds the static config; the EAS project id is the only
// per-owner value, so it comes from the environment (EAS_PROJECT_ID) or extra.eas.projectId and is never committed.
// Without it updates are switched off, so a build that has no Expo project (CI, local) is unaffected.
module.exports = ({ config }) => {
  const projectId = process.env.EAS_PROJECT_ID || (config.extra && config.extra.eas && config.extra.eas.projectId);
  if (!projectId) return { ...config, updates: { ...config.updates, enabled: false } };
  return {
    ...config,
    updates: { ...config.updates, url: `https://u.expo.dev/${projectId}` },
    extra: { ...config.extra, eas: { ...(config.extra && config.extra.eas), projectId } },
  };
};
