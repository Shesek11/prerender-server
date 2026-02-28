# Project: spa-prerender

## Quick Reference
- **Local Path:** C:\dev\prerender-server
- **GitHub:** https://github.com/Shesek11/prerender-server
- **Main Branch:** master
- **Auto-Deploy:** no
- **Deploy Branch:** N/A
- **Server:** spa_prerender@64.177.67.166:22
- **Remote Path:** /var/www/spa-prerender.wp1.site
- **Port:** 3333
- **Database:** none (in-memory cache only)

## Connection Commands
```bash
# SSH into server
ssh spa_prerender@64.177.67.166

# Test prerender
curl http://localhost:3333/render?url=https://example.com

# Health check
curl http://localhost:3333/health

# PM2 management
ssh spa_prerender@64.177.67.166 "pm2 show 0"
ssh spa_prerender@64.177.67.166 "pm2 logs 0 --lines 30 --nostream"
ssh spa_prerender@64.177.67.166 "pm2 restart 0"
```

## SSH Key Status
- **Key configured:** yes (CLAUDE key)

## Chrome Dependencies
Chrome system libraries installed locally (no root needed):
- Location: `~/chrome-libs/usr/lib/x86_64-linux-gnu/`
- Downloaded via `apt-get download` + `dpkg -x`
- `LD_LIBRARY_PATH` set in npm start script
- Libraries: libatk, libatk-bridge, libxkbcommon, libatspi, libXcomposite, libXdamage, libXrandr, libasound, libXi

## Development Log
<!-- Auto-updated by Claude - newest entries at top -->

### 2026-03-01 - Server Working
- Rewrote from prerender npm package to Puppeteer + Express (v2.0.0)
- Fixed Chrome shared library dependencies (local install without root)
- Removed --single-process flag (caused core dumps)
- Chrome launches lazily on first request
- Cache working: first render ~2s, cache hit ~3ms
- Server stable on PM2

### 2026-03-01 - Project Initialized
- Prerender server deployed as Node.js site on xCloud
- Repository cloned from GitHub
- Initial setup complete

## Architecture
```
Request flow:
  /render?url=X → check cache → HIT: return cached HTML
                              → MISS: launch Chrome → render → cache → return HTML

  /health → return server + cache + chrome status
```

## Notes
- This is a prerender server for SPA SEO
- One instance serves ALL SPA sites on the server
- Each site's Nginx config decides whether to route bots here
- Chrome disconnects between requests (saves memory) and relaunches on demand
- Puppeteer bundled Chromium at: ~/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome
