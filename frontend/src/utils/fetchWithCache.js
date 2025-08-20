import { cacheGet, cacheSet } from "./cacheManager"; // your frontend cache file

export async function fetchWithCache(url, options = {}, cacheKey) {
  const cached = cacheGet(cacheKey);

  // Add the lastUpdated timestamp to the URL as a query parameter
  // This is the correct way to trigger the backend's cache middleware.
  const fetchUrl = new URL(url, window.location.origin);
  if (cached && cached.lastUpdated) {
    fetchUrl.searchParams.set("timestamp", cached.lastUpdated);
    console.log(`[CACHE] Sending request with timestamp: ${cached.lastUpdated}`);
  } else {
    console.log(`[CACHE] No cached timestamp, making full request.`);
  }

  const res = await fetch(fetchUrl.toString(), options);

  // If the server responds with 304 Not Modified, use the cached data.
  // The backend's cacheMiddleware handles this based on the timestamp.
  if (res.status === 304 && cached) {
    console.log(`[CACHE] Got 304 Not Modified → using cached data for ${cacheKey}`);
    return cached.value;
  }

  // If the request is successful, cache the new data and the timestamp.
  if (res.ok) {
    const data = await res.json();
    const etag = res.headers.get("ETag");
    const lastUpdated = data.lastUpdated; // Get the timestamp from the response body

    // Store the data, etag, and lastUpdated timestamp in the cache.
    // This is the corrected cacheSet call.
    cacheSet(cacheKey, { value: data, etag, lastUpdated });

    console.log(`[CACHE] Fresh data fetched and cached with timestamp: ${lastUpdated}`);
    return data;
  }

  throw new Error(`Fetch failed with status ${res.status}`);
}