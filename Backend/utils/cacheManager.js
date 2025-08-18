import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE_PATH = path.resolve(__dirname, "../../cache/meta.json");

let lastUpdatedMap = {};

// Load existing cache metadata
export async function loadCacheMeta() {
  try {
    if (await fs.pathExists(CACHE_FILE_PATH)) {
      lastUpdatedMap = await fs.readJson(CACHE_FILE_PATH);
    }
  } catch (err) {
    console.error("Failed to load cache metadata:", err);
    lastUpdatedMap = {};
  }
}


// Get last updated time
export function getLastUpdated(routeKey) {
  return lastUpdatedMap[routeKey];
}

// Set new timestamp and persist to file
export async function setLastUpdated(routeKey) {
  lastUpdatedMap[routeKey] = Date.now();
  await fs.outputJson(CACHE_FILE_PATH, lastUpdatedMap, { spaces: 2 });
}
