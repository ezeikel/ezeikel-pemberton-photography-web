#!/usr/bin/env python3
"""
check.py: the HTTP checks of cutover.sh, kept out of bash so a dry run can test them.

Every request goes through `curl` (GET only; it can use DNS over HTTPS, which skips the Mac's cached DNS, and a
dry run can stub it). Redirects are never followed: a redirect is compared by its status and Location.

    check.py snapshot --origin URL --out FILE [--doh] [--alias URL ...] PATH...
        Record status, content type and a hash of the visible text (HTML) or of the bytes (anything else) of each
        path on ORIGIN, and the first hop of each --alias URL. Run against the live site BEFORE DNS moves.

    check.py compare --live URL --stage URL [--doh] [--allow PATH=reason ...] PATH...
        The staged Worker must answer every path like the live site (status, type, hash).

    check.py verify --baseline FILE --origin URL [--doh] [--allow PATH=reason ...]
                    [--expect-no-vercel] [--expect-beacon]
        After DNS moved: ORIGIN must answer every recorded path and alias like the snapshot did.

Exit status 0 when everything matches (an --allow'ed difference is printed, not counted), 1 otherwise.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parity import Page, ctype_base  # noqa: E402  (same visible-text rules as the parity report)

DOH = "https://cloudflare-dns.com/dns-query"


def fetch(url, doh=False, timeout=60):
    """One GET with curl, no redirect following. Returns (status, headers, body); status 0 = no answer."""
    with tempfile.TemporaryDirectory() as d:
        body_f, head_f = os.path.join(d, "body"), os.path.join(d, "head")
        cmd = ["curl", "-s", "--max-time", str(timeout), "-o", body_f, "-D", head_f, "-w", "%{http_code}"]
        if doh:
            cmd += ["--doh-url", DOH]
        cmd.append(url)
        r = subprocess.run(cmd, capture_output=True, text=True)
        out = (r.stdout or "").strip()
        status = int(out) if out.isdigit() else 0
        headers = {}
        if os.path.exists(head_f):
            for line in open(head_f, errors="replace").read().splitlines():
                if ":" in line and not line.startswith("HTTP/"):
                    k, v = line.split(":", 1)
                    headers[k.strip().lower()] = v.strip()
        body = open(body_f, "rb").read() if os.path.exists(body_f) else b""
    return status, headers, body


def digest(body, headers, hosts):
    """Visible-text hash for HTML, byte hash (hosts and <lastmod> normalised) for everything else."""
    base = ctype_base(headers)
    if base in ("text/html", "application/xhtml+xml"):
        p = Page()
        p.feed(body.decode("utf-8", "replace"))
        return hashlib.sha256(p.visible().encode()).hexdigest()
    norm = body
    for h in hosts:
        norm = norm.replace(h.encode(), b"{site}")
    if base in ("application/xml", "text/xml"):
        norm = re.sub(rb"<lastmod>[^<]*</lastmod>", b"<lastmod/>", norm)
    return hashlib.sha256(norm).hexdigest()


def describe(url, hosts, doh):
    status, headers, body = fetch(url, doh)
    loc = headers.get("location")
    if loc:
        loc = urllib.parse.urljoin(url, loc)
        p = urllib.parse.urlsplit(loc)
        # keep the absolute target of a redirect to ANOTHER host, make same-host redirects host independent
        loc = ("{site}" if p.netloc.lower() in hosts else f"{p.scheme}://{p.netloc}") + p.path + (f"?{p.query}" if p.query else "")
    return {
        "status": status,
        "type": ctype_base(headers),
        "sha": digest(body, headers, hosts) if status and not (300 <= status < 400) else None,
        "location": loc,
        "vercel": bool(headers.get("x-vercel-id") or (headers.get("server", "").lower() == "vercel")),
        "beacon": b"static.cloudflareinsights.com/beacon.min.js" in body,
    }


def host_of(url):
    return urllib.parse.urlsplit(url).netloc.lower()


def parse_allow(items):
    out = {}
    for a in items or []:
        k, _, v = a.partition("=")
        out[k] = v or "expected"
    return out


def same(a, b):
    """Why two descriptions differ, or None."""
    if a["status"] != b["status"]:
        return f"status {a['status']} -> {b['status']}"
    if a["location"] != b["location"]:
        return f"location {a['location']} -> {b['location']}"
    # a redirect has no body worth comparing: Vercel labels it text/plain, a Worker sends no type
    if a["type"] != b["type"] and not (300 <= a["status"] < 400):
        return f"type {a['type']} -> {b['type']}"
    if a["sha"] != b["sha"]:
        return "content differs"
    return None


def report(rows, allow, label_w=44):
    bad = 0
    for label, path, why in rows:
        if why is None:
            print(f"  ok      {label}")
        elif path in allow:
            print(f"  allowed {label}: {why} ({allow[path]})")
        else:
            bad += 1
            print(f"  DIFF    {label}: {why}")
    return bad


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("snapshot")
    s.add_argument("--origin", required=True)
    s.add_argument("--out", required=True)
    s.add_argument("--doh", action="store_true")
    s.add_argument("--alias", action="append", default=[])
    s.add_argument("--host", action="append", default=[], help="extra hostnames to treat as the same site")
    s.add_argument("paths", nargs="+")

    c = sub.add_parser("compare")
    c.add_argument("--live", required=True)
    c.add_argument("--stage", required=True)
    c.add_argument("--doh", action="store_true")
    c.add_argument("--allow", action="append", default=[])
    c.add_argument("--host", action="append", default=[])
    c.add_argument("paths", nargs="+")

    v = sub.add_parser("verify")
    v.add_argument("--baseline", required=True)
    v.add_argument("--origin", required=True)
    v.add_argument("--doh", action="store_true")
    v.add_argument("--allow", action="append", default=[])
    v.add_argument("--host", action="append", default=[])
    v.add_argument("--expect-no-vercel", action="store_true")
    v.add_argument("--expect-beacon", action="store_true")

    a = ap.parse_args()

    if a.cmd == "snapshot":
        origin = a.origin.rstrip("/")
        hosts = {host_of(origin), *a.host}
        snap = {"origin": origin, "pages": {}, "aliases": {}}
        for p in a.paths:
            snap["pages"][p] = describe(origin + p, hosts, a.doh)
        for u in a.alias:
            snap["aliases"][u] = describe(u, hosts, a.doh)
        bad = [p for p, d in snap["pages"].items() if d["status"] == 0]
        bad += [u for u, d in snap["aliases"].items() if d["status"] == 0]
        json.dump(snap, open(a.out, "w"), indent=1)
        for p, d in snap["pages"].items():
            print(f"  {d['status']} {d['type'] or '-':<26} {p}")
        for u, d in snap["aliases"].items():
            print(f"  {d['status']} {d['location'] or '-':<26} {u}")
        if bad:
            print("  no answer from: " + ", ".join(bad))
            sys.exit(1)
        return

    if a.cmd == "compare":
        live, stage = a.live.rstrip("/"), a.stage.rstrip("/")
        hosts = {host_of(live), host_of(stage), *a.host}
        allow = parse_allow(a.allow)
        rows = []
        for p in a.paths:
            l, s_ = describe(live + p, hosts, a.doh), describe(stage + p, hosts, a.doh)
            rows.append((f"{p:<40} live {l['status']} stage {s_['status']}", p, same(l, s_) if l["status"] else "no answer from live"))
        sys.exit(1 if report(rows, allow) else 0)

    if a.cmd == "verify":
        snap = json.load(open(a.baseline))
        origin = a.origin.rstrip("/")
        hosts = {host_of(snap["origin"]), host_of(origin), *a.host}
        allow = parse_allow(a.allow)
        rows = []
        first = True
        for p, before in snap["pages"].items():
            now = describe(origin + p, hosts, a.doh)
            why = same(before, now) if now["status"] else "no answer"
            if first and why is None:
                if a.expect_no_vercel and now["vercel"]:
                    why = "still answered by Vercel (x-vercel-id / server: Vercel)"
                if a.expect_beacon and not now["beacon"]:
                    why = "the Cloudflare Web Analytics beacon is missing from the page"
            first = False
            rows.append((f"{p:<40} {before['status']} -> {now['status']}", p, why))
        for u, before in snap["aliases"].items():
            now = describe(u, hosts, a.doh)
            rows.append((f"{u:<60} {before['status']} -> {now['status']}", u, same(before, now) if now["status"] else "no answer"))
        sys.exit(1 if report(rows, allow) else 0)


if __name__ == "__main__":
    main()
