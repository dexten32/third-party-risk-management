import { getLastUpdated, setLastUpdated } from "../utils/cacheManager.js";

const cacheStore = new Map();

export function cacheMiddleware(routeKey) {
  return async (req, res, next) => {
    try {
      const key = typeof routeKey === "function" ? routeKey(req) : routeKey;
      const skipCache = req.query.refresh === "true";
      const cached = cacheStore.get(key);

      const clientTimestamp = Number(req.query.timestamp || req.params.timestamp);
      const serverLastUpdated = getLastUpdated(key);

      const isFresh =
        !skipCache &&
        cached &&
        serverLastUpdated &&
        cached.fetchedAt >= serverLastUpdated;

      const timestampsMatch = clientTimestamp && serverLastUpdated === clientTimestamp;

      // Early exit if client and server timestamps match
      if (timestampsMatch) return res.status(304).end();

      // Serve cached response if fresh
      if (isFresh) {
        return res.json({
          success: true,
          data: cached.data,
          lastUpdated: serverLastUpdated,
        });
      }

      // Intercept response to cache it
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (body?.success && body?.data) {
          const now = Date.now();
          cacheStore.set(key, { data: body.data, fetchedAt: now });
          setLastUpdated(key);
          body.lastUpdated = now;
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error("Cache middleware error:", err);
      next(err);
    }
  };
}
