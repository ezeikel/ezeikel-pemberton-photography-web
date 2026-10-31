// Serves Vercel's production output (cloudflare/dist/, byte-identical) on
// Workers static assets and keeps what Vercel did around it:
// - http -> https and apex -> www, both 308 with path and query kept
// - HSTS on every response
// - every unknown path answers index.html with 200 (wrangler.jsonc:
//   not_found_handling "single-page-application"), as vercel-redirects did
// - "; charset=utf-8" on HTML and CSS, as Vercel sent it
// - a 4 hour browser cache on script, style, font and image files: Cloudflare's own
//   edge (zone setting Browser Cache TTL) put that in front of Vercel, and it does not
//   reach files that a Worker serves, so without it each page view would revalidate
// It also adds the Cloudflare Web Analytics beacon to HTML responses, because
// the files themselves stay unchanged.
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  CF_WEB_ANALYTICS_TOKEN?: string;
}

interface Element {
  onEndTag(handler: (end: { before(content: string, options: { html: boolean }): void }) => void): void;
}
declare class HTMLRewriter {
  on(selector: string, handlers: { element(element: Element): void }): HTMLRewriter;
  transform(response: Response): Response;
}

const APEX = 'ezeikelpemberton.photography';
const CANONICAL_HOST = 'www.ezeikelpemberton.photography';
const HSTS = 'max-age=63072000';
// Cloudflare's default list of file types its edge caches (the ones live had at max-age=14400).
const BROWSER_CACHED = /\.(?:js|css|svg|ico|woff2?|ttf|eot|otf|png|jpe?g|gif|webp|avif|bmp|tiff?)$/i;
const BROWSER_CACHE = 'public, max-age=14400, must-revalidate';

const withHeaders = (response: Response, pathname: string): Response => {
  const headers = new Headers(response.headers);
  headers.set('strict-transport-security', HSTS);
  const type = headers.get('content-type');
  const isHtml = !!type && /^text\/html$/i.test(type);
  if (type && /^text\/(html|css)$/i.test(type)) headers.set('content-type', `${type}; charset=utf-8`);
  // An unknown path that looks like a file falls back to index.html: that stays uncached.
  if (!isHtml && response.status === 200 && BROWSER_CACHED.test(pathname)) headers.set('cache-control', BROWSER_CACHE);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

/** Add the public beacon while workerd streams an HTML response. */
const injectWebAnalytics = (request: Request, response: Response, token?: string): Response => {
  if (
    !token?.trim() ||
    request.method !== 'GET' ||
    request.headers.has('range') ||
    response.headers.has('content-range') ||
    (response.status >= 300 && response.status < 400) ||
    !response.headers.get('content-type')?.startsWith('text/html')
  )
    return response;

  // The token belongs to the Web Analytics site of the ZONE (ezeikelpemberton.photography), not of one
  // hostname, so the beacon must send its report to the zone's own edge (/cdn-cgi/rum); the shared
  // collector refuses a zone token. Reusing the zone site costs no new site (the account is at its cap).
  const beacon = JSON.stringify({ token, send: { to: '/cdn-cgi/rum' } })
    .replaceAll('&', '&amp;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  const script = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${beacon}'></script>`;
  let seen = false;
  return new HTMLRewriter()
    .on('script[src*="static.cloudflareinsights.com"]', {
      element() {
        seen = true;
      },
    })
    .on('body', {
      element(body) {
        body.onEndTag((end) => {
          if (!seen) {
            end.before(script, { html: true });
            seen = true;
          }
        });
      },
    })
    .transform(response);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.protocol === 'http:' || url.hostname === APEX) {
      url.protocol = 'https:';
      if (url.hostname === APEX) url.hostname = CANONICAL_HOST;
      return new Response(null, {
        status: 308,
        headers: { location: url.toString(), 'strict-transport-security': HSTS },
      });
    }
    const response = withHeaders(await env.ASSETS.fetch(request), url.pathname);
    return injectWebAnalytics(request, response, env.CF_WEB_ANALYTICS_TOKEN);
  },
};
