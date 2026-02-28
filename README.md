# Prerender Server

Self-hosted prerender server for SPA SEO. Renders JavaScript-heavy SPA pages and serves static HTML to search engine bots.

## What This Does

Search engines send crawlers to your SPA site. Without pre-rendering, they see an empty page. This server renders the page in a headless browser and returns the full HTML.

## Deploy on xCloud (Node.js)

1. Fork/clone this repo to your GitHub
2. In xCloud panel: Add New Site → Node.js → Clone a Git Repository
3. Set start command: `npm start`
4. Set Node.js version: 18 or higher
5. Deploy

## How It Works

```
Your SPA site's Nginx config detects a bot →
  Proxies request to this prerender server →
    Server opens page in headless Chrome →
      Waits for JavaScript to finish →
        Returns full HTML to the bot
```

## Test

After deployment, test with:
```bash
curl http://your-prerender-server:3000/render?url=https://your-spa-site.com
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| MEMORY_CACHE | 1 | Enable in-memory cache (0 to disable) |
| CACHE_MAXSIZE | 1000 | Max cached pages |
| CACHE_TTL | 86400 | Cache lifetime in seconds (24h) |
