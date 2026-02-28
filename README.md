# Prerender Server

Self-hosted prerender server for SPA SEO. Renders JavaScript-heavy SPA pages using headless Chrome and serves static HTML to search engine bots.

Built with **Puppeteer + Express**. One server handles all your SPA sites.

## How It Works

```
SPA site's Nginx detects a bot (Googlebot, Bingbot, etc.)
  → Proxies request to this prerender server
    → Server opens page in headless Chrome
      → Waits for JavaScript to finish rendering
        → Returns full HTML to the bot
          → Bot indexes the full content
```

## Quick Deploy on xCloud (Node.js)

### Step 1: Create the site

1. In xCloud panel: **Add New Site → Node.js → Clone a Git Repository**
2. Repository: `https://github.com/Shesek11/prerender-server.git`
3. Branch: `master`
4. Node.js version: **20** (or 18+)
5. Start command: `npm start`
6. Port: note the port xCloud assigns (e.g., 3333)
7. Deploy

### Step 2: Install Chrome dependencies

SSH into the site user and run:

```bash
# Download Chrome's missing system libraries (no root needed)
mkdir -p ~/chrome-deps ~/chrome-libs
cd ~/chrome-deps
apt-get download libatk1.0-0 libatk-bridge2.0-0 libxkbcommon0 \
  libatspi2.0-0 libxcomposite1 libxdamage1 libxrandr2 libasound2 libxi6

# Extract them locally
for deb in *.deb; do dpkg -x "$deb" ~/chrome-libs/; done
```

### Step 3: Install npm dependencies and restart

```bash
cd /var/www/YOUR-SITE-PATH
npm install
pm2 restart 0
```

### Step 4: Test

```bash
# Health check
curl http://localhost:PORT/health

# Render a page
curl http://localhost:PORT/render?url=https://example.com
```

## Deploy on Any Linux Server

### Requirements
- Node.js 18+
- Ubuntu/Debian (for apt-get download)

### Setup

```bash
git clone https://github.com/Shesek11/prerender-server.git
cd prerender-server
npm install

# Install Chrome dependencies (if not root, or on minimal servers)
mkdir -p ~/chrome-deps ~/chrome-libs
cd ~/chrome-deps
apt-get download libatk1.0-0 libatk-bridge2.0-0 libxkbcommon0 \
  libatspi2.0-0 libxcomposite1 libxdamage1 libxrandr2 libasound2 libxi6
for deb in *.deb; do dpkg -x "$deb" ~/chrome-libs/; done
cd -

# If you have root access, this is simpler:
# sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libxkbcommon0 \
#   libatspi2.0-0 libxcomposite1 libxdamage1 libxrandr2 libasound2 libxi6

# Start
npm start
```

### Run with PM2 (production)

```bash
npm install -g pm2
pm2 start npm --name prerender -- start
pm2 save
pm2 startup  # auto-start on reboot
```

## Connecting a SPA Site

Each SPA site needs an Nginx rule that detects bots and proxies to this server.
Add this to the site's Nginx `server` block:

```nginx
set $prerender 0;

# Detect search engine and social media bots
if ($http_user_agent ~* "googlebot|bingbot|yandex|baiduspider|facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot|GPTBot|ClaudeBot|PerplexityBot") {
    set $prerender 1;
}

# Don't prerender static files
if ($uri ~* "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|pdf|mp4|webp)$") {
    set $prerender 0;
}

# Proxy bot requests to prerender server
if ($prerender = 1) {
    rewrite (.*) /render?url=https://$host$request_uri break;
    proxy_pass http://127.0.0.1:3333;
}
```

Replace `3333` with whatever port your prerender server is running on.

## API

### `GET /render?url=<URL>`
Renders the URL in headless Chrome and returns the HTML.
- First request: ~2-3 seconds (Chrome renders the page)
- Cached request: ~3ms (served from memory)
- Header `X-Prerender-Cache: HIT|MISS` indicates cache status

### `GET /health`
Returns server status as JSON:
```json
{
  "status": "ok",
  "cache": { "enabled": true, "size": 5, "maxSize": 1000 },
  "chrome": "connected"
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `MEMORY_CACHE` | `1` | Enable in-memory cache (set to `0` to disable) |
| `CACHE_MAXSIZE` | `1000` | Maximum number of cached pages |
| `CACHE_TTL` | `86400` | Cache lifetime in seconds (default: 24 hours) |

## Troubleshooting

### Chrome crashes: "error while loading shared libraries"
Run the Chrome dependency install steps above. Then verify:
```bash
export LD_LIBRARY_PATH=~/chrome-libs/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH
ldd ~/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome 2>&1 | grep "not found"
```
If anything shows "not found", download that package too with `apt-get download`.

### PM2 keeps restarting (status: errored)
Check logs: `pm2 logs 0 --lines 30 --nostream`
Common causes:
- Missing npm dependencies → `npm install`
- Chrome library issues → see above
- Port conflict → check `.env` for correct PORT

### Server is slow on first request
Normal. Chrome launches on-demand and takes ~2s on first request.
Subsequent requests use the cache (~3ms).

## Architecture Notes

- Uses **Puppeteer** directly (not the `prerender` npm package) for reliable Chrome management
- Chrome launches lazily on first request, not at startup
- Chrome may disconnect between requests (saves memory) — auto-relaunches on next request
- One server handles ALL SPA sites — each site's Nginx config decides whether to route bots here
- Puppeteer downloads its own Chromium binary — no need to install Chrome separately
