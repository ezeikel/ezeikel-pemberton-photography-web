# Cutover: Ezeikel Pemberton Photography

Prepared 31 October 2026 on branch `wip/cloudflare-static-20261031`. **Nothing here has been run.** The Worker `ezeikel-pemberton-photography-web` is staged at https://ezeikel-pemberton-photography-web.chewybytes.workers.dev. DNS, the Vercel project, GitHub secrets and variables, and `master` are untouched.

What it is: Angular 8 single-page app. Nothing is built: the Worker serves the exact files Vercel's 27 February 2022 production deployment serves (`cloudflare/dist`, SHA-256 checked against Vercel's file list). Content comes from Contentful and enquiries go to Tave, both directly from the visitor's browser.

## What moves

| hostname | zone | records now | after the cutover |
|---|---|---|---|
| `www.ezeikelpemberton.photography` | ezeikelpemberton.photography | A 216.150.1.193 and A 216.150.16.129, both proxied | Worker custom domain (serves the site) |
| `ezeikelpemberton.photography` | ezeikelpemberton.photography | A 216.150.1.1 and A 216.150.1.193, both proxied | Worker custom domain (308 to https://www.ezeikelpemberton.photography, same path and query) |

The script deletes only the A, AAAA and CNAME records at those names, writes them to a rollback file first, and attaches the Worker as a custom domain on each name (Cloudflare then creates the proxied records itself).
Not at these two names, so they stay: the wildcard `*.ezeikelpemberton.photography` (two proxied A records to Vercel IPs), three CAA records and the `_domainconnect` CNAME.

## Before you run it

- `git -C ~/Development/Personal/ezeikel-pemberton-photography-web-cf status` prints nothing and the branch is pushed (the script checks both).
- `vercel whoami --scope chewy-bytes` and `gh auth status` work. The Cloudflare token is read from `~/Development/docs/keys/cloudflare.env`; the script verifies it.
- The script sets these on GitHub for you: secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; variable `CLOUDFLARE_CUTOVER=true`. The repo has none of them today. Its default branch is `master`, so the push goes there.
- A few minutes: the old records are proxied, so no resolver holds a Vercel address and Vercel is paused straight away.

## Run it

```sh
! bash ~/Development/Personal/ezeikel-pemberton-photography-web-cf/docs/cloudflare/cutover.sh
```

`!` commands stop waiting after 120 seconds but carry on; the log is `~/.cutover/ezeikel-pemberton-photography-web/cutover.log` and the rollback file (old DNS records, no secrets) is `~/.cutover/ezeikel-pemberton-photography-web/dns-rollback.json`. The script lives in the worktree it deploys from; set `R=` to point it at a different clean checkout of the branch.

| step | what it does | stops with |
|---|---|---|
| 0 preflight | read only: tools, branch pushed and clean, Cloudflare token and zones, the Vercel project is running and serves these hostnames, no hostname is already on another Worker, the DNS records that will go, and a snapshot of what the live site answers today | nothing changed |
| 1 deploy | builds the pushed commit, runs the Worker tests, `wrangler deploy` to workers.dev, and requires it to answer every path like the live site (status, type, hash of the visible text, redirects) | nothing changed on DNS |
| 2 DNS | saves the old records, then for each hostname deletes them and attaches the Worker. If any call fails, everything already changed is put back by the script itself | DNS restored automatically |
| 3 live checks | the same checks against the real hostnames over DNS over HTTPS, retried for about a minute, including each other hostname's redirect and that Vercel no longer answers | rollback printed, Vercel still running |
| 4 GitHub | sets the secrets and variables, pushes the branch to the default branch (fast-forward only) and watches `deploy-cloudflare.yml`. A failure here is listed under NEEDS YOU at the end and does not undo the move | follow-up listed |
| 5 Vercel | waits out the old records' TTL, then pauses the project (never deletes it) | follow-up listed |

Single steps, each safe to repeat: `verify`, `github`, `pause`, `rollback`.

## If it stops

- Before step 2 nothing has changed; fix the cause named in the message and run it again.
- During step 2 the script restores the records and domains by itself and says so.
- After step 2 (live checks failed, or a resolver still shows Vercel): the site may already be served by the Worker. Wait for the old TTL and run `bash ~/Development/Personal/ezeikel-pemberton-photography-web-cf/docs/cloudflare/cutover.sh verify`, or undo it with the rollback below. A second full run is refused while the rollback file exists.

## Roll back

```sh
! bash ~/Development/Personal/ezeikel-pemberton-photography-web-cf/docs/cloudflare/cutover.sh rollback
```

Detaches the Worker custom domains, re-creates the saved DNS records (skipping any that already exist), unpauses the Vercel project and sets `CLOUDFLARE_CUTOVER=false` so the deploy workflow stops. Safe to run twice. If the branch was already pushed to the default branch nothing needs reverting for Vercel: it ignores the Cloudflare files.

## Dry run

`python3 docs/cloudflare/dry-run/run.py` runs the real script against stubbed `curl`, `vercel`, `gh`, `git`, `npx`, `node`, `shasum` and `sleep` and a simulated Cloudflare, Vercel and GitHub: the happy path, a Worker that differs, a failed build, refusals at preflight, a hostname already on another Worker, a failed attach or delete halfway through, failed live checks followed by a refused rerun and a double rollback, a moved default branch, a failed GitHub secret, a failed deploy workflow, `PAUSE_WAIT=0` and the single-step commands (the scenarios about hostnames and DNS are marked n/a for a site without a domain). It never touches the network. The result of the run on 31 October 2026 is in `PARITY.md`.

## For you to decide

- **Built output, not a rebuild.** See `cloudflare/README.md`. Angular 8 is not upgraded. I did try a rebuild: on Node 22.23.3 `yarn install --frozen-lockfile --ignore-engines --ignore-scripts` takes under a minute and `NODE_OPTIONS=--openssl-legacy-provider ng build` takes 5 seconds (without the flag webpack 4 stops with ERR_OSSL_EVP_UNSUPPORTED). The result equals Vercel's files except for the build directory embedded in comments and inline source maps (identical once that directory is read as /vercel/path0). I still ship Vercel's own bytes: for a site that no longer changes an exact copy is the safest parity, and nothing has to install about 1,500 old packages on each push. The earlier note that it needs Node 14 to build was wrong.
- **What is served is a development build.** Vercel ran `ng build` (not `--prod`): unminified `vendor.js` (4.7 MB), `main.js`, and their source maps are public. The Worker serves the same bytes. A production build (`ng build --prod`) would be much smaller; it was not tried, and it changes what visitors get, so it is your call.
- **Traffic is close to nil.** The zone's Web Analytics site recorded 110 page loads in the last 13 weeks, in 10 separate hours with exactly 10 loads each, a pattern that looks automated rather than like visitors. Contentful still answers (HTTP 200), so the page works; whether the Tave enquiry form still works could not be tried without sending a real enquiry.
- **A Tave secret key and the Contentful token are in a public repository** (`src/app/services/tave-api.service.ts`, `src/environments`) and in every visitor's browser. The form uses the Tave key to create leads, so anyone who reads it can call the same endpoint. Decide whether to rotate it and whether the repo should be private.
- **Google Analytics is dead.** `ga.js` sends to UA-56401027-1; Universal Analytics stopped processing data on 1 July 2024.
- **Soft 404s, as today.** Every unknown path (including `/sitemap.xml` and `/missing.js`) answers the home page with HTTP 200, exactly as Vercel does.
- **Cache.** In front of Vercel, Cloudflare gave scripts, styles, fonts and images a 4 hour browser cache. A Worker's files do not get that, so `cloudflare/worker.ts` sets the same header on the same file types.
- **Analytics beacon.** The earlier commit used a Web Analytics token that is not in the account's site list. The Worker now uses the zone's own Web Analytics site (created March 2026, so no new site) with `send.to: /cdn-cgi/rum`, which a zone token needs.
- **`/robots.txt`.** The zone already answers it with Cloudflare's managed file in front of Vercel; the same should hold in front of the Worker (the script reports a difference without failing).
- **Domain** is registered until 25 March 2027.

## After

- Watch it for a quiet week, then delete the paused Vercel project yourself.
- The wildcard A records can go with the Vercel project if nothing uses a subdomain.
- Open https://www.ezeikelpemberton.photography in a blocker-free browser and check that the beacon's POST to `/cdn-cgi/rum` answers 204.
- `deploy-cloudflare.yml` deploys on every push to the default branch from now on (it only runs once `CLOUDFLARE_CUTOVER` is `true`).
