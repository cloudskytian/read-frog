/**
 * Migration script from v058 to v059
 * Replaces siteControl mode "all" with "blacklist"
 *
 * Before: { siteControl: { mode: "all", patterns: [] } }
 * After:  { siteControl: { mode: "blacklist", patterns: [] } }
 *
 * Users with mode "all" get "blacklist" with empty patterns (same behavior).
 * Users with mode "whitelist" are unchanged.
 *
 * IMPORTANT: All values are hardcoded inline. Migration scripts are frozen
 * snapshots — never import constants or helpers that may change.
 */
export function migrate(oldConfig: any): any {
  const siteControl = oldConfig.siteControl
  if (!siteControl) {
    return oldConfig
  }

  return {
    ...oldConfig,
    siteControl: {
      ...siteControl,
      mode: siteControl.mode === "all" ? "blacklist" : siteControl.mode,
    },
  }
}
