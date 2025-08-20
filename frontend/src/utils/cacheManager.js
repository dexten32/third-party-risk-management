// Simple hybrid cache manager (in-memory + localStorage) with ETag support
const cache = {};

// Only set if a valid ETag is provided
export function cacheSet(key, value, etag) {
  if (!etag || typeof etag !== "string" || etag.trim() === "") {
    console.warn(`[CacheManager] Skipping cache for ${key}: invalid ETag`, etag);
    return;
  }

  const entry = { value, etag, timestamp: Date.now() };
  cache[key] = entry;

  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore localStorage errors (quota, private mode, etc.)
  }
}

// Get entry (prefer memory, fallback to localStorage)
export function cacheGet(key) {
  if (cache[key]) return cache[key];

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Validate parsed entry
    if (!parsed || !parsed.etag || typeof parsed.etag !== "string") {
      console.warn(`[CacheManager] Ignoring invalid cached entry for ${key}`);
      cacheClear(key);
      return null;
    }

    cache[key] = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function cacheClear(key) {
  delete cache[key];
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
