# Cloudflare Workers hosting

`dist/` is the output of the Vercel production deployment that served
www.ezeikelpemberton.photography from 27 February 2022 until the move to Cloudflare:
deployment `dpl_fA9867YWxdYRZxSqSG81nNWDm5eB` (project
`prj_kojGnIWJpjEyrl7n4VlxSuRVSt0P`, team `chewy-bytes`, Node 14.x), built from commit
`0c7bdb7` on `master`.

## Why the built files are committed

The app is Angular 8 and needs Node 14 to build. Serving the exact files Vercel served keeps
production identical and avoids rebuilding an old dependency tree. Nothing in CI builds the
Angular app; `wrangler deploy` uploads these files.

## Where they came from

Vercel's file-contents API (`/v8/deployments/{id}/files/{fileId}`) returns 404 for this
deployment's output files, so on 24 October 2026 each of the 23 files in the deployment's file
list (`/v6/deployments/{id}/files`) was downloaded from https://www.ezeikelpemberton.photography
at its own path. Every download's SHA-256 equals the file hash in that list; `SHA256SUMS`
records them (`shasum -a 256 -c SHA256SUMS` from this folder).

`vercel-redirects` is the deployment's `_redirects` file (`/*  /index.html 200`), renamed so
that wrangler does not upload it as redirect rules. `wrangler.jsonc` reproduces it with
`not_found_handling: "single-page-application"`.

## Changing the site

Edit the source, build it with Node 14 (`yarn build`, output in `dist/`), copy the output over
`cloudflare/dist/`, update `SHA256SUMS`, and deploy. `worker.ts` adds the redirects, HSTS and
the Web Analytics beacon at request time, so the built files never need editing for hosting.
