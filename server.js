const express = require('express');
const puppeteer = require('puppeteer');

const port = process.env.PORT || 3000;

let browser = null;

async function getBrowser() {
  if (browser && browser.connected) {
    return browser;
  }
  console.log('[CHROME] Launching browser...');
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-extensions',
    ],
  });
  browser.on('disconnected', () => {
    console.log('[CHROME] Browser disconnected, will relaunch on next request');
    browser = null;
  });
  console.log('[CHROME] Browser launched successfully');
  return browser;
}

// Cache
const cacheEnabled = process.env.MEMORY_CACHE !== '0';
const cache = new Map();
const maxSize = parseInt(process.env.CACHE_MAXSIZE || '1000', 10);
const ttl = parseInt(process.env.CACHE_TTL || '86400', 10) * 1000;

const app = express();

app.get('/render', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send('Missing ?url= parameter');
  }

  // Check cache
  if (cacheEnabled) {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.time < ttl) {
      console.log(`[CACHE HIT] ${url}`);
      res.set('X-Prerender-Cache', 'HIT');
      return res.send(cached.html);
    }
  }

  console.log(`[RENDER] ${url}`);
  let page = null;
  try {
    const b = await getBrowser();
    page = await b.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait a bit more for any late JavaScript rendering
    await new Promise((r) => setTimeout(r, 500));

    const html = await page.content();

    // Cache the result
    if (cacheEnabled && html) {
      if (cache.size >= maxSize) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      cache.set(url, { html, time: Date.now() });
      console.log(`[CACHED] ${url} (${cache.size}/${maxSize})`);
    }

    res.set('X-Prerender-Cache', 'MISS');
    res.send(html);
  } catch (err) {
    console.error(`[ERROR] ${url}: ${err.message}`);
    res.status(500).send(`Error rendering ${url}: ${err.message}`);
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        // page might already be closed
      }
    }
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const b = await getBrowser();
    res.json({
      status: 'ok',
      cache: { enabled: cacheEnabled, size: cache.size, maxSize },
      chrome: b.connected ? 'connected' : 'disconnected',
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Launch browser at startup, then start HTTP server
getBrowser()
  .then(() => {
    app.listen(port, () => {
      console.log(`Prerender server running on port ${port}`);
      console.log(`Test: http://localhost:${port}/render?url=https://example.com`);
      console.log(`Health: http://localhost:${port}/health`);
    });
  })
  .catch((err) => {
    console.error('[FATAL] Could not launch Chrome:', err.message);
    process.exit(1);
  });
