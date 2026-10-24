const RELOAD_KEY = 'chunk-reload-at';
const RELOAD_COOLDOWN_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = String((error as any)?.message ?? error ?? '');
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message)
  );
}

/**
 * After a new deploy, an open tab still points at old hashed chunks that no
 * longer exist. Reload once to pick up the new index.html; the cooldown stops
 * a reload loop if the chunk is genuinely missing.
 */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable: still reload once
  }
  window.location.reload();
  return true;
}
