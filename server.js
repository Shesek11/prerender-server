const prerender = require('prerender');

const port = process.env.PORT || 3000;

const server = prerender({
  port: port,
  // Chromium flags for server environment (no GUI)
  chromeFlags: [
    '--no-sandbox',
    '--headless',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-extensions',
  ],
});

// Enable in-memory cache
// Pages are cached for CACHE_TTL seconds (default: 24 hours)
// Cache holds up to CACHE_MAXSIZE pages (default: 1000)
if (process.env.MEMORY_CACHE !== '0') {
  server.use(prerender.sendPrerenderHeader());
  server.use(prerender.removeScriptTags());
  server.use(prerender.httpHeaders());

  // Simple in-memory cache
  const cache = new Map();
  const maxSize = parseInt(process.env.CACHE_MAXSIZE || '1000', 10);
  const ttl = parseInt(process.env.CACHE_TTL || '86400', 10) * 1000; // Convert to ms

  server.use({
    requestReceived: (req, res, next) => {
      const cached = cache.get(req.prerender.url);
      if (cached && Date.now() - cached.time < ttl) {
        console.log(`[CACHE HIT] ${req.prerender.url}`);
        return res.send(200, cached.html);
      }
      console.log(`[CACHE MISS] ${req.prerender.url}`);
      next();
    },
    pageLoaded: (req, res, next) => {
      if (req.prerender.statusCode === 200 && req.prerender.content) {
        // Evict oldest entry if cache is full
        if (cache.size >= maxSize) {
          const oldestKey = cache.keys().next().value;
          cache.delete(oldestKey);
        }
        cache.set(req.prerender.url, {
          html: req.prerender.content.toString(),
          time: Date.now(),
        });
        console.log(`[CACHED] ${req.prerender.url} (${cache.size}/${maxSize})`);
      }
      next();
    },
  });
}

server.start();

console.log(`Prerender server running on port ${port}`);
console.log(`Test: http://localhost:${port}/render?url=https://example.com`);
