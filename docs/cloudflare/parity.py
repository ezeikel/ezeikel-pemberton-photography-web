#!/usr/bin/env python3
"""
parity.py: compare a LIVE site with its STAGED Cloudflare Worker, GET requests only.

    python3 parity.py --live https://www.example.com --stage https://example-web.chewybytes.workers.dev \
        [--alias example.com --alias www.example.net] [--max 150] [--extra /some/path ...] \
        [--no-crawl] [--out report.json] [--md report.md]

Path list = "/", /robots.txt, /sitemap.xml, /favicon.ico, a made-up 404 path, every <loc> of the live
sitemap, then a breadth-first crawl of internal links found in live HTML (capped at --max paths).
/_next/static/* and /_next/image* are skipped in the comparison (hashed names differ between the old
live build and the new one); instead every internal reference found in the STAGED HTML is fetched on the
stage host and must answer 200 ("stage self-check").

For each path, on both sides: first-hop status + Location, final status and final URL after redirects
(hosts replaced by {site}), content type, and a SHA-256 of the visible text (HTML) or of the bytes
(everything else, with host names normalised). HTML also gets a head fingerprint (title, description,
canonical, robots, og:*, twitter:*, icons, html lang) and the set of asset references.
Cache-control, content-encoding (asked with Accept-Encoding: gzip, br) and HSTS are compared too.
"""
import argparse
import hashlib
import json
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 parity-check"
REDIRECTS = (301, 302, 303, 307, 308)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):  # noqa: D401
        return None


_opener = urllib.request.build_opener(_NoRedirect)


def get(url, accept_encoding="identity", timeout=60, retries=2):
    """One GET, never following redirects. Returns (status, headers(lowercase), body)."""
    last = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(
            url, method="GET", headers={"User-Agent": UA, "Accept": "*/*", "Accept-Encoding": accept_encoding}
        )
        try:
            r = _opener.open(req, timeout=timeout)
            return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read()
        except urllib.error.HTTPError as e:
            return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read()
        except Exception as e:  # network hiccup: retry
            last = e
            time.sleep(1.5 * (attempt + 1))
    return 0, {"x-error": repr(last)}, b""


def follow(url, accept_encoding="identity", max_hops=6):
    """GET with manual redirect following. Returns list of hops [(url, status, headers, body)]."""
    hops = []
    cur = url
    for _ in range(max_hops):
        status, headers, body = get(cur, accept_encoding)
        hops.append((cur, status, headers, body))
        loc = headers.get("location")
        if status in REDIRECTS and loc:
            cur = urllib.parse.urljoin(cur, loc)
            continue
        break
    return hops


class Page(HTMLParser):
    """Visible text, head fingerprint and asset references of one HTML document."""

    SKIP = {"script", "style", "template", "noscript"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text = []
        self.skip = 0
        self.title = None
        self.in_title = False
        self.meta = {}
        self.refs = set()
        self.links = set()
        self.lang = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        if tag in self.SKIP:
            self.skip += 1
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            key = a.get("name") or a.get("property") or a.get("http-equiv")
            if key and "content" in a:
                key = key.lower()
                if key in ("description", "robots", "viewport", "theme-color") or key.startswith(("og:", "twitter:")):
                    self.meta[key] = a["content"]
            if "charset" in a or "charSet" in a:
                self.meta["charset"] = a.get("charset") or a.get("charSet")
        if tag == "link" and a.get("rel"):
            rel = a["rel"].lower()
            if rel in ("canonical", "icon", "apple-touch-icon", "shortcut icon", "manifest", "alternate"):
                self.meta["link:" + rel + ":" + (a.get("type") or a.get("hreflang") or a.get("sizes") or "")] = a.get("href", "")
        for k in ("href", "src", "poster", "data-src"):
            if a.get(k):
                self.refs.add(a[k])
                if tag == "a":
                    self.links.add(a[k])
        for k in ("srcset", "imagesrcset"):
            if a.get(k):
                for part in a[k].split(","):
                    u = part.strip().split(" ")[0]
                    if u:
                        self.refs.add(u)

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title = (self.title or "") + data
        elif not self.skip:
            self.text.append(data)

    def visible(self):
        return re.sub(r"\s+", " ", " ".join(self.text)).strip()


def sha(b):
    return hashlib.sha256(b).hexdigest()


# Two spellings of the same type; browsers treat them alike, so they are not a difference.
MIME_SYNONYMS = {
    "image/x-icon": "image/vnd.microsoft.icon",
    "application/javascript": "text/javascript",
    "application/x-javascript": "text/javascript",
    "text/xml": "application/xml",
}


def ctype_base(h):
    t = (h.get("content-type") or "").split(";")[0].strip().lower()
    return MIME_SYNONYMS.get(t, t)


def describe(base, hops, hosts):
    """Summarise a fetch chain for comparison."""
    first_url, st0, h0, _ = hops[0]
    last_url, st, h, body = hops[-1]

    def nrm(u):
        p = urllib.parse.urlsplit(u)
        host = p.netloc.lower()
        scheme = p.scheme
        path = p.path + ("?" + p.query if p.query else "")
        return ("{site}" if host in hosts else scheme + "://" + host) + path

    d = {
        "first_status": st0,
        "first_location": nrm(urllib.parse.urljoin(first_url, h0["location"])) if h0.get("location") else None,
        "hops": len(hops) - 1,
        "status": st,
        "final": nrm(last_url),
        "ctype": h.get("content-type"),
        "ctype_base": ctype_base(h),
        "cache": h.get("cache-control"),
        "hsts": h.get("strict-transport-security"),
        "length": len(body),
        "etag": bool(h.get("etag")),
    }
    cb = d["ctype_base"]
    if cb in ("text/html", "application/xhtml+xml"):
        p = Page()
        try:
            p.feed(body.decode("utf-8", "replace"))
        except Exception as e:  # malformed HTML: still compare bytes
            d["parse_error"] = repr(e)
        txt = p.visible()
        d["text_len"] = len(txt)
        d["text_sha"] = sha(txt.encode())
        d["title"] = (p.title or "").strip()
        d["head"] = dict(sorted({**p.meta, "lang": p.lang}.items()))
        d["refs"] = sorted(p.refs)
        d["links"] = sorted(p.links)
    else:
        norm = body
        for h_ in hosts:
            norm = norm.replace(h_.encode(), b"{site}")
        if cb in ("application/xml", "text/xml"):
            # <lastmod> is the build/request time (new Date()), never comparable between two builds
            norm = re.sub(rb"<lastmod>[^<]*</lastmod>", b"<lastmod/>", norm)
        d["text_sha"] = sha(norm)
        d["text_len"] = len(body)
    return d


def sitemap_paths(live, hosts):
    status, _, body = get(live + "/sitemap.xml")
    out = []
    if status == 200:
        for m in re.finditer(r"<loc>\s*([^<\s]+)\s*</loc>", body.decode("utf-8", "replace")):
            u = urllib.parse.urlsplit(m.group(1).strip())
            if u.netloc.lower() in hosts:
                out.append((u.path or "/") + ("?" + u.query if u.query else ""))
    return out


def internal_path(ref, base_url, hosts):
    if not ref or ref.startswith(("#", "mailto:", "tel:", "javascript:", "data:", "blob:", "sms:", "whatsapp:")):
        return None
    u = urllib.parse.urlsplit(urllib.parse.urljoin(base_url, ref))
    if u.scheme not in ("http", "https") or u.netloc.lower() not in hosts:
        return None
    return (u.path or "/") + ("?" + u.query if u.query else "")


def skip_hashed(path):
    return path.startswith("/_next/static/") or path.startswith("/_next/image")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", required=True, help="canonical live origin, e.g. https://www.krispymeme.com")
    ap.add_argument("--stage", required=True, help="workers.dev origin")
    ap.add_argument("--alias", action="append", default=[], help="other live hostnames that should count as the same site")
    ap.add_argument("--max", type=int, default=150)
    ap.add_argument("--extra", action="append", default=[])
    ap.add_argument("--no-crawl", action="store_true")
    ap.add_argument("--no-sitemap", action="store_true")
    ap.add_argument("--out")
    ap.add_argument("--md")
    ap.add_argument("--title", default="")
    ap.add_argument("--allow", action="append", default=[], help="PATH=reason: a difference that is expected (reported, not a failure)")
    args = ap.parse_args()
    allow = {}
    for a in args.allow:
        k, _, v = a.partition("=")
        allow[k] = v or "expected"

    live = args.live.rstrip("/")
    stage = args.stage.rstrip("/")
    live_host = urllib.parse.urlsplit(live).netloc.lower()
    stage_host = urllib.parse.urlsplit(stage).netloc.lower()
    hosts = {live_host, stage_host, *[a.lower() for a in args.alias]}
    missing = "/nope-404-" + "".join(random.choice("abcdefghij") for _ in range(6))

    paths = ["/", "/robots.txt", "/sitemap.xml", "/favicon.ico", missing]
    paths += args.extra
    if not args.no_sitemap:
        paths += sitemap_paths(live, hosts)
    seen = []
    for p in paths:
        if p not in seen:
            seen.append(p)
    paths = seen

    # crawl internal links on the live site (HTML only), breadth first
    if not args.no_crawl:
        queue = list(paths)
        i = 0
        while i < len(queue) and len(paths) < args.max:
            p = queue[i]
            i += 1
            if skip_hashed(p):
                continue
            hops = follow(live + p)
            _, st, h, body = hops[-1]
            if st != 200 or ctype_base(h) != "text/html":
                continue
            page = Page()
            page.feed(body.decode("utf-8", "replace"))
            for ref in sorted(page.refs):
                ip = internal_path(ref, hops[-1][0], hosts)
                if ip and not skip_hashed(ip) and ip not in paths and len(paths) < args.max:
                    paths.append(ip)
                    queue.append(ip)

    rows = []
    stage_html_refs = set()
    live_html_refs = set()
    image_checks = []
    image_seen = set()
    for p in paths:
        lh = follow(live + p)
        sh = follow(stage + p)
        ld = describe(live, lh, hosts)
        sd = describe(stage, sh, hosts)
        row = {"path": p, "live": ld, "stage": sd, "diff": []}

        def cmp(name, a, b, severity="DIFF"):
            if a != b:
                row["diff"].append({"field": name, "live": a, "stage": b, "severity": severity})

        cmp("first_status", ld["first_status"], sd["first_status"])
        cmp("first_location", ld["first_location"], sd["first_location"])
        cmp("status", ld["status"], sd["status"])
        cmp("final_url", ld["final"], sd["final"])
        cmp("content_type", ld["ctype_base"], sd["ctype_base"])
        if ld["ctype"] != sd["ctype"] and ld["ctype_base"] == sd["ctype_base"]:
            row["diff"].append({"field": "content-type header", "live": ld["ctype"], "stage": sd["ctype"], "severity": "minor"})
        if ld["status"] == sd["status"] == 200 or ld["status"] == sd["status"] == 404:
            if ld["ctype_base"] == "text/html":
                cmp("visible_text_sha", ld["text_sha"], sd["text_sha"])

                def head_n(h):
                    # og:image / twitter:image carry a cache-busting ?hash that differs per build; the image
                    # bytes are compared separately below
                    return {k: (v.split("?")[0] if k in ("og:image", "twitter:image") and isinstance(v, str) else v) for k, v in (h or {}).items()}

                cmp("head", head_n(ld.get("head")), head_n(sd.get("head")))
                for key in ("og:image", "twitter:image"):
                    lu, su = (ld.get("head") or {}).get(key), (sd.get("head") or {}).get(key)
                    if lu and su:
                        lp = internal_path(lu, live + p, hosts) or lu
                        sp = internal_path(su, stage + p, hosts) or su
                        if (key, lp.split("?")[0]) not in image_seen:
                            image_seen.add((key, lp.split("?")[0]))
                            li = follow(live + lp) if lp.startswith("/") else follow(lp)
                            si = follow(stage + sp) if sp.startswith("/") else follow(sp)
                            image_checks.append(
                                {
                                    "page": p,
                                    "meta": key,
                                    "path": lp.split("?")[0],
                                    "live_status": li[-1][1],
                                    "stage_status": si[-1][1],
                                    "live_sha": sha(li[-1][3]),
                                    "stage_sha": sha(si[-1][3]),
                                    "live_type": ctype_base(li[-1][2]),
                                    "stage_type": ctype_base(si[-1][2]),
                                    "live_cache": li[-1][2].get("cache-control"),
                                    "stage_cache": si[-1][2].get("cache-control"),
                                }
                            )
                lr, sr = set(ld.get("refs", [])), set(sd.get("refs", []))
                lr_n = {r for r in lr if not r.startswith("/_next/")}
                sr_n = {r for r in sr if not r.startswith("/_next/")}
                if lr_n != sr_n:
                    row["diff"].append(
                        {"field": "refs", "live_only": sorted(lr_n - sr_n)[:8], "stage_only": sorted(sr_n - lr_n)[:8], "severity": "info"}
                    )
            else:
                cmp("body_sha", ld["text_sha"], sd["text_sha"])
        cmp("cache_control", ld["cache"], sd["cache"], "cache")
        cmp("hsts", ld["hsts"], sd["hsts"], "minor")
        if sd["status"] == 200 and sd["ctype_base"] == "text/html":
            for r in sd.get("refs", []):
                ip = internal_path(r, stage + p, {stage_host})
                if ip:
                    stage_html_refs.add(ip)
        if ld["status"] == 200 and ld["ctype_base"] == "text/html":
            for r in ld.get("refs", []):
                ip = internal_path(r, live + p, {live_host})
                if ip:
                    live_html_refs.add(ip)
        if p in allow:
            for d in row["diff"]:
                if d["severity"] == "DIFF":
                    d["severity"] = "allowed"
                    d["reason"] = allow[p]
        rows.append(row)

    # hashed build assets differ in name between the old live build and the new one, so compare one of each
    # kind by class: content type and cache-control must match
    def first_of(refs, suffixes):
        for r in sorted(refs):
            if r.startswith("/_next/static/") and r.split("?")[0].endswith(suffixes):
                return r
        return None

    asset_classes = []
    for label, suffixes in (("js", (".js",)), ("css", (".css",)), ("woff2", (".woff2",))):
        lp, sp = first_of(live_html_refs, suffixes), first_of(stage_html_refs, suffixes)
        if lp and sp:
            lh, sh = get(live + lp)[:2], get(stage + sp)[:2]
            asset_classes.append(
                {
                    "kind": label,
                    "live_path": lp,
                    "stage_path": sp,
                    "live_status": lh[0],
                    "stage_status": sh[0],
                    "live_type": lh[1].get("content-type"),
                    "stage_type": sh[1].get("content-type"),
                    "live_cache": lh[1].get("cache-control"),
                    "stage_cache": sh[1].get("cache-control"),
                }
            )

    # stage self-check: every internal reference in the staged HTML must resolve on the stage host
    broken = []
    for ip in sorted(stage_html_refs):
        st, h, _ = get(stage + ip)[0:3]
        if st != 200:
            broken.append({"path": ip, "status": st})

    # compression: ask with gzip, br for one sample per type
    comp = {}
    samples = {}
    for r in rows:
        if r["stage"]["status"] == 200:
            key = r["stage"]["ctype_base"]
            samples.setdefault(key, r["path"])
    for ctype, p in sorted(samples.items()):
        ls, lh, lb = get(live + p, "gzip, br")
        ss, sh, sb = get(stage + p, "gzip, br")
        comp[ctype] = {"path": p, "live": lh.get("content-encoding"), "stage": sh.get("content-encoding"), "live_bytes": len(lb), "stage_bytes": len(sb)}

    # first-hop behaviour of the other live hostnames (apex, other TLDs): live only, a Worker cannot be asked
    # these on workers.dev, so worker.test.mjs checks the same URLs against the Worker code
    alias_probes = []
    for a in args.alias:
        if a.lower() == live_host:
            continue
        for ppath in ("/", "/x-check?x=1"):
            url = "https://" + a + ppath
            st, hd, _ = get(url)
            alias_probes.append({"url": url, "status": st, "location": hd.get("location"), "server": hd.get("server"), "hsts": hd.get("strict-transport-security")})

    n_diff = sum(1 for r in rows if any(d["severity"] == "DIFF" for d in r["diff"]))
    bad_images = [i for i in image_checks if (i["live_status"], i["live_sha"]) != (i["stage_status"], i["stage_sha"])]
    report = {
        "live": live,
        "stage": stage,
        "paths": len(rows),
        "paths_with_differences": n_diff,
        "rows": rows,
        "stage_self_check": {"internal_refs": len(stage_html_refs), "broken": broken},
        "compression": comp,
        "image_checks": image_checks,
        "asset_classes": asset_classes,
        "alias_probes": alias_probes,
    }
    if args.out:
        json.dump(report, open(args.out, "w"), indent=1)

    # markdown / console table
    lines = []
    lines.append(f"Parity: {live}  vs  {stage}  ({len(rows)} paths, {n_diff} with differences)")
    lines.append("")
    lines.append("| path | status live/stage | final URL same | content-type | text sha | cache-control live | cache-control stage | notes |")
    lines.append("|---|---|---|---|---|---|---|---|")
    for r in rows:
        ld, sd = r["live"], r["stage"]
        notes = []
        for d in r["diff"]:
            if d.get("severity") == "allowed":
                if not any(n.startswith("expected:") for n in notes):
                    notes.append("expected: " + d["reason"])
            if d["field"] in ("first_status", "first_location", "status", "final_url", "content_type", "visible_text_sha", "body_sha", "cache_control"):
                continue
            if d["field"] == "refs":
                notes.append(f"refs: live-only {d['live_only'][:2]} stage-only {d['stage_only'][:2]}")
            elif d["field"] == "head":
                notes.append("head differs")
            else:
                notes.append(f"{d['field']}: {d['live']!r} vs {d['stage']!r}")
        sf = "same" if ld["final"] == sd["final"] else f"{ld['final']} vs {sd['final']}"
        ct = ld["ctype_base"] if ld["ctype_base"] == sd["ctype_base"] else f"{ld['ctype_base']} vs {sd['ctype_base']}"
        ts = "same" if ld["text_sha"] == sd["text_sha"] else "DIFF"
        st = f"{ld['status']}/{sd['status']}" + (f" (first {ld['first_status']}/{sd['first_status']})" if (ld["first_status"] != ld["status"] or sd["first_status"] != sd["status"]) else "")
        lines.append(f"| {r['path']} | {st} | {sf} | {ct} | {ts} | {ld['cache']} | {sd['cache']} | {'; '.join(notes)} |")
    lines.append("")
    lines.append(f"Stage self-check: {len(stage_html_refs)} internal references in staged HTML, {len(broken)} broken {broken[:10]}")
    lines.append("")
    if image_checks:
        lines.append("Share images (og:image / twitter:image, fetched on both sides, bytes compared):")
        for i in image_checks:
            same = "identical bytes" if (i["live_status"], i["live_sha"]) == (i["stage_status"], i["stage_sha"]) else "DIFFERENT"
            lines.append(f"- {i['meta']} {i['path']}: {i['live_status']}/{i['stage_status']} {i['live_type']} {same}; cache-control live {i['live_cache']} stage {i['stage_cache']}")
        lines.append("")
    if asset_classes:
        lines.append("Hashed build assets (one of each kind; names differ per build, so type and cache-control are compared):")
        for a in asset_classes:
            lines.append(f"- {a['kind']}: status {a['live_status']}/{a['stage_status']}; type live {a['live_type']} stage {a['stage_type']}; cache-control live {a['live_cache']} stage {a['stage_cache']}")
        lines.append("")
    lines.append("Compression (Accept-Encoding: gzip, br), content-encoding live/stage: " + ", ".join(f"{k}: {v['live']}/{v['stage']}" for k, v in comp.items()))
    if alias_probes:
        lines.append("")
        lines.append("Other live hostnames, first hop only (live behaviour the Worker must reproduce; see worker.test.mjs):")
        for a in alias_probes:
            lines.append(f"- {a['url']} -> {a['status']} {a['location'] or ''} (server {a['server']})")
    md = "\n".join(lines)
    print(md)
    if args.md:
        open(args.md, "w").write(md + "\n")
    # exit non-zero when a hard difference exists
    hard = [r for r in rows if any(d["severity"] == "DIFF" for d in r["diff"])]
    sys.exit(1 if hard or broken or bad_images else 0)


if __name__ == "__main__":
    main()
