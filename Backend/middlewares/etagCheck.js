  import crypto from "crypto";

  /**
   * Generate a strong ETag using MD5 hash of the stringified data.
   */
  const generateETag = (data) => {
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(data))
      .digest("hex");
    return `"${hash}"`; // Quoted ETag format
  };

  /**
   * Middleware to compare ETag with client's If-None-Match header.
   * If ETag matches, sends 304 Not Modified.
   */
  const etagCheck = (getData) => {
    return async (req, res, next) => {
      try {
        const data = await getData(req);
        if (!data) return next(); // skip if no data returned

        const currentETag = generateETag(data);
        const clientETag = req.headers["if-none-match"];

        // ETag matches → send 304
        if (clientETag && clientETag === currentETag) {
          return res.status(304).end();
        }

        // Set ETag for client
        res.setHeader("ETag", currentETag);
        req.cachedData = data; // forward data to route handler
        next();
      } catch (err) {
        console.error("ETag middleware error:", err);
        next(err);
      }
    };
  };

  export default etagCheck;
