# Cloudflare Workers hosting

`dist/` is the output of the Vercel production deployment that served
www.ezeikelpemberton.photography from 27 February 2022 until the move to Cloudflare:
deployment `dpl_fA9867YWxdYRZxSqSG81nNWDm5eB` (project
`prj_kojGnIWJpjEyrl7n4VlxSuRVSt0P`, team `chewy-bytes`, Node 14.x), built from commit
`0c7bdb7` on `master` with `ng build` (a development build: unminified, with source maps).

## Why the built files are committed

Serving the exact files Vercel served keeps production identical and means nothing has to
install about 1,500 old packages on every push. Nothing in CI builds the Angular app;
`wrangler deploy` uploads these files.

## Where they came from

Vercel's file-contents API (`/v8/deployments/{id}/files/{fileId}`) returns 404 for this
deployment's output files, so on 24 October 2026 each of the 23 files in the deployment's file
list (`/v6/deployments/{id}/files`) was downloaded from https://www.ezeikelpemberton.photography
at its own path. Every download's SHA-256 equals the file hash in that list; `SHA256SUMS`
records them (`shasum -a 256 -c SHA256SUMS` from this folder; CI runs `sha256sum -c`).

`vercel-redirects` is the deployment's `_redirects` file (`/*  /index.html 200`), renamed so
that wrangler does not upload it as redirect rules. `wrangler.jsonc` reproduces it with
`not_found_handling: "single-page-application"`.

## Can it be rebuilt?

Yes, checked on 31 October 2026 with Node 22.23.3 (Angular is not upgraded):

```sh
yarn install --frozen-lockfile --ignore-engines --ignore-scripts   # under a minute
NODE_OPTIONS=--openssl-legacy-provider npx ng build                # about 5 seconds, output in dist/browser
```

Without `--openssl-legacy-provider` webpack 4 stops with `ERR_OSSL_EVP_UNSUPPORTED`. The result
matches the committed files except for the directory the build ran in (Vercel built in
`/vercel/path0`), which ends up in webpack comments and inline CSS source maps of `main.js`,
`polyfills.js` and `polyfills-es5.js`: with that directory read as `/vercel/path0` those three and
`vendor.js` are byte-identical, and `main.js.map` differs only in its column mappings, which shift
with the longer path. `runtime.js`, `scripts.js`, `styles.css`, `index.html`, the fonts and the
other maps are identical as built. The committed copy stays the deployed one because an exact copy
is the safest parity for a site that no longer changes.

## Changing the site

Build as above, copy `dist/browser` over `cloudflare/dist/` (keep `vercel-redirects`), update
`SHA256SUMS` (`shasum -a 256 vercel-redirects dist/* dist/assets/*`, with the same paths), and
deploy. `worker.ts` adds the redirects, HSTS, the browser cache, the charset and the Web
Analytics beacon at request time, so the built files never need editing for hosting.
`node --test cloudflare/worker.test.mjs` checks those rules without a network.
