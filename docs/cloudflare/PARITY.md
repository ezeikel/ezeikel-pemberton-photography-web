# Parity with the live site: Ezeikel Pemberton Photography

Run on 31 October 2026 with `docs/cloudflare/parity.py` (GET requests only) against the staged Worker https://ezeikel-pemberton-photography-web.chewybytes.workers.dev. For each path it compares the first redirect hop, the final status and URL, the content type, a SHA-256 of the visible text (HTML) or of the bytes (anything else, with host names normalised and sitemap `<lastmod>` ignored), the head metadata of HTML pages, cache-control, compression and HSTS. Hashed build assets differ in name between the old build and the new one, so one of each kind is compared by type and cache-control, and every internal reference in the staged HTML must answer 200 on the staged host.

```
Parity: https://www.ezeikelpemberton.photography  vs  https://ezeikel-pemberton-photography-web.chewybytes.workers.dev  (31 paths, 0 with differences)

| path | status live/stage | final URL same | content-type | text sha | cache-control live | cache-control stage | notes |
|---|---|---|---|---|---|---|---|
| / | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /robots.txt | 200/200 | same | text/plain vs text/html | DIFF | public, max-age=14400, must-revalidate | public, max-age=0, must-revalidate | expected: the zone answers /robots.txt with Cloudflare's managed file in front of Vercel today; workers.dev shows the app's own answer (the home page) |
| /sitemap.xml | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /favicon.ico | 200/200 | same | image/vnd.microsoft.icon | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate |  |
| /nope-404-ciifdj | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /home | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /blog | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /blog/anything | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /index.html | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /404.html | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /runtime.js | 200/200 | same | text/javascript | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate | content-type header: 'application/javascript; charset=utf-8' vs 'text/javascript' |
| /polyfills.js | 200/200 | same | text/javascript | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate | content-type header: 'application/javascript; charset=utf-8' vs 'text/javascript' |
| /polyfills-es5.js | 200/200 | same | text/javascript | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate | content-type header: 'application/javascript; charset=utf-8' vs 'text/javascript' |
| /main.js | 200/200 | same | text/javascript | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate | content-type header: 'application/javascript; charset=utf-8' vs 'text/javascript' |
| /vendor.js | 200/200 | same | text/javascript | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate | content-type header: 'application/javascript; charset=utf-8' vs 'text/javascript' |
| /styles.css | 200/200 | same | text/css | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate |  |
| /scripts.js | 200/200 | same | text/javascript | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate | content-type header: 'application/javascript; charset=utf-8' vs 'text/javascript' |
| /assets/logo-ep-full.svg | 200/200 | same | image/svg+xml | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate |  |
| /fontawesome-webfont.woff2 | 200/200 | same | font/woff2 | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate |  |
| /fontawesome-webfont.woff | 200/200 | same | font/woff | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate |  |
| /fontawesome-webfont.ttf | 200/200 | same | font/ttf | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate |  |
| /fontawesome-webfont.eot | 200/200 | same | application/vnd.ms-fontobject | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate |  |
| /fontawesome-webfont.svg | 200/200 | same | image/svg+xml | same | public, max-age=14400, must-revalidate | public, max-age=14400, must-revalidate |  |
| /main.js.map | 200/200 | same | application/json | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | content-type header: 'application/json; charset=utf-8' vs 'application/json' |
| /vendor.js.map | 200/200 | same | application/json | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | content-type header: 'application/json; charset=utf-8' vs 'application/json' |
| /_redirects | 200/200 | same | application/octet-stream vs text/html | DIFF | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | expected: Vercel happened to serve its _redirects file; the Worker cannot (it is renamed vercel-redirects so wrangler does not read it as rules) |
| /api/x | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /home?utm=1 | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /home/ | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /blog/a/b | 200/200 | same | text/html | same | public, max-age=0, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |
| /missing.js | 200/200 | same | text/html | same | public, max-age=14400, must-revalidate | public, max-age=0, must-revalidate | refs: live-only [] stage-only ['https://static.cloudflareinsights.com/beacon.min.js'] |

Stage self-check: 41 internal references in staged HTML, 0 broken []

Compression (Accept-Encoding: gzip, br), content-encoding live/stage: application/json: br/br, application/vnd.ms-fontobject: br/br, font/ttf: br/br, font/woff: None/None, font/woff2: None/None, image/svg+xml: br/br, image/vnd.microsoft.icon: br/br, text/css: br/br, text/html: br/br, text/javascript: br/br

Other live hostnames, first hop only (live behaviour the Worker must reproduce; see worker.test.mjs):
- https://ezeikelpemberton.photography/ -> 308 https://www.ezeikelpemberton.photography/ (server cloudflare)
- https://ezeikelpemberton.photography/x-check?x=1 -> 308 https://www.ezeikelpemberton.photography/x-check?x=1 (server cloudflare)
```

## Rendered in a browser

`docs/cloudflare/hydrate.py` renders a live page and its staged twin in headless Chrome (its own throw-away profile, JavaScript executed, up to 15 virtual seconds for requests such as Contentful) and compares the visible text of the resulting DOM. On 31 October 2026 the text was identical for `/` (1107 characters), `/blog` (256 characters).

## Cutover dry run

```
cutover dry run for ezeikel-pemberton-photography-web: ~/Development/Personal/ezeikel-pemberton-photography-web-cf/docs/cloudflare/cutover.sh
  PASS  happy path
  PASS  stale resolvers (answers lag behind DNS)
  PASS  staged Worker differs from live
  PASS  build fails
  PASS  preflight refusals
  PASS  hostname already on another Worker
  PASS  attach fails mid-flip
  PASS  delete fails mid-flip
  PASS  live checks fail, rerun refused, rollback twice
  PASS  main moved
  PASS  GitHub secret cannot be set
  PASS  deploy workflow fails
  PASS  PAUSE_WAIT=0
  PASS  pause and verify subcommands
all scenarios passed
```
