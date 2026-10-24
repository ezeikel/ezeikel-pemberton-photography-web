// Serves Vercel's production output (cloudflare/dist/, byte-identical) on
// Workers static assets and keeps what Vercel did around it:
// - http -> https and apex -> www, both 308 with path and query kept
// - HSTS on every response
// - every unknown path answers index.html with 200 (wrangler.jsonc:
//   not_found_handling "single-page-application"), as vercel-redirects did
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

const withHsts = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set('strict-transport-security', HSTS);
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

  const beacon = JSON.stringify({ token })
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
    const response = withHsts(await env.ASSETS.fetch(request));
    return injectWebAnalytics(request, response, env.CF_WEB_ANALYTICS_TOKEN);
  },
};
