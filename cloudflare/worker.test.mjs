// Checks cloudflare/worker.ts without a network: the redirects that cannot be exercised on
// workers.dev (the apex only reaches the Worker after the cutover), the headers and the beacon.
// Run: node --test cloudflare/worker.test.mjs
// The expected behaviour is what Vercel and Cloudflare answered on 31 Oct 2026 (docs/cloudflare/PARITY.md).
import assert from 'node:assert/strict';
import { test } from 'node:test';

// HTMLRewriter only exists inside workerd. This stand-in runs the <body> end-tag handler and records
// what the Worker would insert before </body>.
const inserted = [];
globalThis.HTMLRewriter = class {
  constructor() {
    this.handlers = [];
  }
  on(selector, handler) {
    this.handlers.push({ selector, handler });
    return this;
  }
  transform(response) {
    for (const { selector, handler } of this.handlers) {
      if (selector === 'body') {
        handler.element({ onEndTag: (cb) => cb({ before: (content) => inserted.push(content) }) });
      }
    }
    return response;
  }
};
const { default: worker } = await import('./worker.ts');

const files = new Map([
  ['/index.html', new Response('<html><body>app</body></html>', { headers: { 'content-type': 'text/html' } })],
  ['/main.js', new Response('js', { headers: { 'content-type': 'text/javascript' } })],
  ['/main.js.map', new Response('{}', { headers: { 'content-type': 'application/json' } })],
]);
const env = {
  CF_WEB_ANALYTICS_TOKEN: 'zonetoken',
  ASSETS: {
    // single-page-application fallback: anything that is not a file is index.html with 200
    async fetch(request) {
      const { pathname } = new URL(request.url);
      const hit = files.get(pathname === '/' ? '/index.html' : pathname) ?? files.get('/index.html');
      return hit.clone();
    },
  },
};
const get = (url, init) => worker.fetch(new Request(url, init), env);

test('the apex 308s to www, keeping path and query, with HSTS', async () => {
  for (const [from, to] of [
    ['https://ezeikelpemberton.photography/', 'https://www.ezeikelpemberton.photography/'],
    ['https://ezeikelpemberton.photography/x-check?x=1', 'https://www.ezeikelpemberton.photography/x-check?x=1'],
    ['https://ezeikelpemberton.photography/blog/a', 'https://www.ezeikelpemberton.photography/blog/a'],
  ]) {
    const res = await get(from);
    assert.equal(res.status, 308, from);
    assert.equal(res.headers.get('location'), to, from);
    assert.equal(res.headers.get('strict-transport-security'), 'max-age=63072000');
  }
});

test('http on www 308s to https', async () => {
  const res = await get('http://www.ezeikelpemberton.photography/home?a=b');
  assert.equal(res.status, 308);
  assert.equal(res.headers.get('location'), 'https://www.ezeikelpemberton.photography/home?a=b');
});

test('every unknown path answers index.html with 200, with HSTS and a charset, and is not cached', async () => {
  for (const path of ['/', '/home', '/blog/anything', '/nope-404', '/index.html', '/missing.js']) {
    const res = await get(`https://www.ezeikelpemberton.photography${path}`);
    assert.equal(res.status, 200, path);
    assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8', path);
    assert.equal(res.headers.get('strict-transport-security'), 'max-age=63072000', path);
    assert.notEqual(res.headers.get('cache-control'), 'public, max-age=14400, must-revalidate', path);
  }
});

test('script, style and font files keep the 4 hour browser cache live had, source maps do not', async () => {
  const js = await get('https://www.ezeikelpemberton.photography/main.js');
  assert.equal(js.headers.get('cache-control'), 'public, max-age=14400, must-revalidate');
  assert.equal(await js.text(), 'js');
  const map = await get('https://www.ezeikelpemberton.photography/main.js.map');
  assert.notEqual(map.headers.get('cache-control'), 'public, max-age=14400, must-revalidate');
});

test('the beacon uses the zone site token and sends to the zone edge', async () => {
  inserted.length = 0;
  await get('https://www.ezeikelpemberton.photography/home');
  assert.equal(inserted.length, 1);
  assert.match(inserted[0], /static\.cloudflareinsights\.com\/beacon\.min\.js/);
  assert.match(inserted[0], /"token":"zonetoken"/);
  assert.match(inserted[0], /"send":\{"to":"\/cdn-cgi\/rum"\}/);
  // no token, no beacon
  inserted.length = 0;
  await worker.fetch(new Request('https://www.ezeikelpemberton.photography/home'), { ...env, CF_WEB_ANALYTICS_TOKEN: '' });
  assert.equal(inserted.length, 0);
});
