// Frontend cache manager
const cache = {};

export function cacheSet(key, value) {
  cache[key] = { value, timestamp: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(cache[key]));
  } catch {
    // Intentionally ignore localStorage errors
  }
}

export function cacheGet(key) {
  if (cache[key]) return cache[key].value;

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      cache[key] = parsed;
      return parsed.value;
    }
  } catch { /* empty */ }
  return null;
}

export function isCacheFresh(key, expiryMs) {
  if (cache[key]) return Date.now() - cache[key].timestamp < expiryMs;

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      cache[key] = parsed;
      return Date.now() - parsed.timestamp < expiryMs;
    }
  } catch { /* empty */ }
  return false;
}
