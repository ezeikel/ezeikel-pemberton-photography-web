#!/usr/bin/env python3
"""
Dry run of docs/cloudflare/cutover.sh. Every external tool is replaced by a shim on PATH (curl, vercel, gh, git, npx,
node, shasum, sleep), so nothing real is contacted and nothing real is changed. The REAL script runs, under the same
/bin/bash the owner will use, against a small simulated world: Cloudflare DNS (records per zone, Worker custom
domains that refuse to attach while an A/AAAA/CNAME record still sits on the name, as the real API does), the Vercel
project (paused or not), GitHub (secrets, variables, a deploy workflow run), git (branch, clean tree, pushed,
fast-forward), and the two web servers (Vercel and the Worker) that answer GET requests for each hostname depending
on where DNS points.

    python3 docs/cloudflare/dry-run/run.py                  # every scenario
    python3 docs/cloudflare/dry-run/run.py attach           # scenarios whose name contains "attach"
    CUTOVER_SCRIPT=/path/mutated.sh python3 .../run.py      # mutation checks: the run must then FAIL

The same file is the shim: the wrappers in the world's bin/ call `run.py --shim <tool> <args>`.
"""
import copy
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.environ.get("CUTOVER_SCRIPT") or os.path.join(HERE, "..", "cutover.sh")
CF_TOKEN = "tok-dry-run-cf-1234567890"
FA_TOKEN = "fa-dry-run-9876543210"
SECRETS = (CF_TOKEN, FA_TOKEN, "pk.fake-dry-run-mapbox")
ACCOUNT = "acc00000000000000000000000000001"
SHA = "a" * 40
MAIN_SHA = "b" * 40


# --------------------------------------------------------------------------------------- shared state
class World:
    def __init__(self, path=None):
        self.path = path or os.path.join(os.environ["WORLD"], "state.json")
        with open(self.path) as f:
            self.st = json.load(f)

    def save(self):
        with open(self.path, "w") as f:
            json.dump(self.st, f)

    def log(self, *a):
        self.st["calls"].append(" ".join(str(x) for x in a))


def new_state(cfg, scenario):
    cf = {"token": "active", "zones": {}, "domains": [], "next_id": 1, "attach_fail": None, "delete_fail": None, "conflict_service": None}
    for h in cfg["hosts"]:
        z = cf["zones"].setdefault(h["zone"], {"status": "active", "records": []})
        for r in h["records"]:
            z["records"].append({"id": f"rec{cf['next_id']}", "name": h["host"], **r})
            cf["next_id"] += 1
    for r in cfg.get("extra_records", []):
        z = cf["zones"].setdefault(r["zone"], {"status": "active", "records": []})
        z["records"].append({"id": f"rec{cf['next_id']}", "name": r["name"], "type": r["type"], "content": r["content"], "proxied": False, "ttl": 1})
        cf["next_id"] += 1
    return {
        "scenario": scenario,
        "calls": [],
        "clock": 0,
        "violations": [],
        "git": {"branch": cfg["branch"], "dirty": False, "head": SHA, "origin_branch": SHA, "main_is_ancestor": True, "pushed": []},
        "vercel": {"paused": False, "name": cfg["vercel_name"], "domains": [h["host"] for h in cfg["hosts"]], "pause_calls": 0, "unpause_calls": 0},
        "gh": {"secrets": {}, "vars": {}, "run_found": True, "run_ok": True, "set_fail": []},
        "cf": cf,
        "net": {"hits": {}, "stale_hits": 0, "worker_deployed": True, "worker_mutation": None, "snapshot_before_first_delete": None, "first_delete_seen": False},
        "tools": {"build_fails": False, "tests_fail": False, "sums_fail": False, "deploys": 0, "builds": 0},
    }


# --------------------------------------------------------------------------------------- web servers
def page_for(cfg, path):
    """The answer both servers give for a path (the Worker is a faithful copy unless a scenario mutates it)."""
    p = path.split("?")[0]
    if p in cfg["pages"]:
        return dict(cfg["pages"][p])
    if p != "/" and p.endswith("/"):
        return {"status": 308, "location": p.rstrip("/") + (("?" + path.split("?", 1)[1]) if "?" in path else "")}
    return {"status": 404, "type": "text/html", "text": "This page could not be found."}


def html(title, text, beacon):
    b = '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token":"x"}\'></script>' if beacon else ""
    return f"<!DOCTYPE html><html lang=\"en\"><head><title>{title}</title></head><body><main>{text}</main>{b}</body></html>"


def serve(w, cfg, host, path):
    """-> (status, headers dict, body bytes); status 0 = no answer (no DNS record, or not attached yet)."""
    st = w.st
    host = host.lower()
    hits = st["net"]["hits"]
    hits[host] = hits.get(host, 0) + 1
    worker_dev = f"{cfg['worker']}.chewybytes.workers.dev"
    backend = None
    if host == worker_dev:
        backend = "worker" if st["net"]["worker_deployed"] else None
    elif host == cfg["canonical"] and not cfg["hosts"]:
        backend = "vercel"                                   # the *.vercel.app address of a site without a domain
    else:
        attached = [d for d in st["cf"]["domains"] if d["hostname"] == host and d["service"] == cfg["worker"]]
        has_records = any(r["name"] == host and r["type"] in ("A", "AAAA", "CNAME") for z in st["cf"]["zones"].values() for r in z["records"])
        since_attach = hits[host] - st["net"].get("attach_at", {}).get(host, 0)
        if attached and since_attach > st["net"]["stale_hits"]:
            backend = "worker"
        elif has_records or attached:
            backend = "vercel"                               # old records (or a resolver that still has them)
    if backend is None:
        return 0, {}, b""
    if backend == "vercel":
        if st["vercel"]["paused"]:
            return 503, {"content-type": "text/plain", "server": "Vercel", "x-vercel-id": "lhr1::dry"}, b"DEPLOYMENT_PAUSED"
        server = {"server": "Vercel", "x-vercel-id": "lhr1::dry"}
    else:
        server = {"server": "cloudflare"}
    # other hostnames are redirects on both servers (the Worker reproduces what Vercel answered)
    alias = next((h["alias"] for h in cfg["hosts"] if h["host"] == host and h.get("alias")), None)
    if alias and backend in ("vercel", "worker"):
        loc = alias["location"].format(path=path)
        if backend == "worker" and st["net"]["worker_mutation"] == "wrong_redirect_status":
            return 302, {**server, "location": loc}, b""
        return alias["status"], {**server, "location": loc, "content-type": "text/plain"}, b""
    pg = page_for(cfg, path)
    if backend == "worker":
        m = st["net"]["worker_mutation"]
        if m == "text" and path.split("?")[0] == "/":
            pg = {**pg, "text": pg.get("text", "") + " EXTRA"}
        if m == "error_after_flip" and host != worker_dev:
            pg = {"status": 500, "type": "text/html", "text": "boom"}
        if path.split("?")[0] == "/robots.txt" and pg["status"] == 404:
            pg = {"status": 200, "type": "text/plain", "text": "# Cloudflare managed robots.txt"}
    if "location" in pg:
        return pg["status"], {**server, "location": pg["location"]}, b""
    ctype = pg.get("type", "text/html")
    if ctype == "text/html":
        body = html("t", pg.get("text", ""), bool(cfg.get("beacon")) and backend == "worker")
        return pg["status"], {**server, "content-type": "text/html; charset=utf-8"}, body.encode()
    return pg["status"], {**server, "content-type": ctype}, pg.get("text", "").encode()


# --------------------------------------------------------------------------------------- shims
def shim_curl(w, cfg, args):
    for a in args:
        if any(s in a for s in SECRETS):
            w.st["violations"].append("a secret value is in a curl argument")
    opts = {"-X": None, "--data": None, "-o": None, "-D": None, "-w": None, "--max-time": None, "--doh-url": None}
    headers, i, url = [], 0, None
    while i < len(args):
        a = args[i]
        if a in opts:
            opts[a] = args[i + 1]
            i += 2
            continue
        if a == "-H":
            headers.append(args[i + 1])
            i += 2
            continue
        if a.startswith("-"):
            i += 1
            continue
        url = a
        i += 1
    u = urllib.parse.urlsplit(url)
    method = opts["-X"] or "GET"
    if u.netloc == "api.cloudflare.com":
        authed = False
        for h in headers:
            if h.startswith("@"):
                authed = open(h[1:]).read().strip() == f"Authorization: Bearer {CF_TOKEN}"
        if not authed:
            return out_json({"success": False, "errors": [{"code": 10000, "message": "Authentication error"}]})
        return out_json(cf_api(w, cfg, method, u.path.replace("/client/v4", ""), urllib.parse.parse_qs(u.query), opts["--data"]))
    # a web request
    status, hdrs, body = serve(w, cfg, u.netloc, u.path + (("?" + u.query) if u.query else ""))
    w.log("http", method, url)
    head = (f"HTTP/2 {status}\r\n" if status else "") + "".join(f"{k}: {v}\r\n" for k, v in hdrs.items()) + "\r\n"
    if opts["-o"] and opts["-o"] != "/dev/null":
        open(opts["-o"], "wb").write(body)
    if opts["-D"]:
        if opts["-D"] == "-":
            sys.stdout.write(head)
        else:
            open(opts["-D"], "w").write(head)
    if opts["-w"] and "%{http_code}" in opts["-w"]:
        sys.stdout.write(f"{status:03d}")
    if not opts["-o"] and not opts["-D"] and not opts["-w"]:
        sys.stdout.buffer.write(body)
    return 0


def out_json(d):
    sys.stdout.write(json.dumps(d))
    return 0


def cf_api(w, cfg, method, path, q, data):
    cf = w.st["cf"]
    w.log("cf", method, path + (("?" + urllib.parse.urlencode({k: v[0] for k, v in q.items()})) if q else ""))
    body = json.loads(data) if data else {}
    ok = lambda r=None: {"success": True, "errors": [], "result": r}
    bad = lambda code, msg: {"success": False, "errors": [{"code": code, "message": msg}], "result": None}
    if path == "/user/tokens/verify":
        return ok({"id": "t", "status": cf["token"]})
    m = re.fullmatch(r"/zones/([^/]+)", path)
    if m and method == "GET":
        z = cf["zones"].get(m.group(1))
        return ok({"id": m.group(1), "status": z["status"]}) if z else bad(1001, "zone not found")
    m = re.fullmatch(r"/zones/([^/]+)/dns_records", path)
    if m:
        z = cf["zones"].get(m.group(1))
        if not z:
            return bad(1001, "zone not found")
        if method == "GET":
            name, typ = q.get("name", [None])[0], q.get("type", [None])[0]
            return ok([r for r in z["records"] if (not name or r["name"] == name) and (not typ or r["type"] == typ)])
        if method == "POST":
            rec = {"id": f"rec{cf['next_id']}", "name": body["name"], "type": body["type"], "content": body["content"], "proxied": body["proxied"], "ttl": body["ttl"]}
            cf["next_id"] += 1
            z["records"].append(rec)
            return ok(rec)
    m = re.fullmatch(r"/zones/([^/]+)/dns_records/([^/]+)", path)
    if m and method == "DELETE":
        if not w.st["net"]["first_delete_seen"]:
            w.st["net"]["first_delete_seen"] = True
            w.st["net"]["snapshot_before_first_delete"] = os.path.exists(os.path.join(os.environ["WORLD"], "state", "dns-rollback.json"))
        z = cf["zones"].get(m.group(1))
        rec = next((r for r in z["records"] if r["id"] == m.group(2)), None) if z else None
        if cf["delete_fail"] and rec and rec["name"] == cf["delete_fail"]:
            return bad(9999, "simulated delete failure")
        if not rec:
            return bad(81044, "record not found")
        z["records"].remove(rec)
        return ok({"id": rec["id"]})
    m = re.fullmatch(r"/accounts/[^/]+/workers/domains", path)
    if m and method == "GET":
        h, s = q.get("hostname", [None])[0], q.get("service", [None])[0]
        rows = [d for d in cf["domains"] if (not h or d["hostname"] == h) and (not s or d["service"] == s)]
        if cf["conflict_service"] and h and not s and not rows and h in [x["host"] for x in cfg["hosts"]][:1]:
            rows = [{"id": "foreign", "hostname": h, "service": cf["conflict_service"], "zone_id": "z"}]
        return ok(rows)
    if m and method == "PUT":
        h = body["hostname"]
        if cf["attach_fail"] == h:
            return bad(10000, "simulated attach failure")
        z = cf["zones"].get(body["zone_id"])
        if z and any(r["name"] == h and r["type"] in ("A", "AAAA", "CNAME") for r in z["records"]):
            return bad(100117, "Hostname already has externally managed DNS records")
        d = {"id": f"dom{cf['next_id']}", "hostname": h, "service": body["service"], "zone_id": body["zone_id"], "environment": body["environment"]}
        cf["next_id"] += 1
        cf["domains"].append(d)
        w.st["net"].setdefault("attach_at", {})[h] = w.st["net"]["hits"].get(h, 0)
        return ok(d)
    m = re.fullmatch(r"/accounts/[^/]+/workers/domains/([^/]+)", path)
    if m and method == "DELETE":
        before = len(cf["domains"])
        cf["domains"] = [d for d in cf["domains"] if d["id"] != m.group(1)]
        return ok({}) if len(cf["domains"]) < before else bad(10007, "domain not found")
    w.st["violations"].append(f"unexpected Cloudflare API call {method} {path}")
    return bad(9109, "unexpected call in the dry run")


def shim_vercel(w, cfg, args):
    rest = list(args)
    assert rest[0] == "api"
    path = rest[1]
    method = "POST" if "-X" in rest and rest[rest.index("-X") + 1] == "POST" else "GET"
    v = w.st["vercel"]
    w.log("vercel", method, path)
    pid = cfg["vercel_project"]
    if path == f"/v9/projects/{pid}" and method == "GET":
        sys.stdout.write("Vercel CLI 54.0.0\n" + json.dumps({"id": pid, "name": v["name"], "paused": True if v["paused"] else None}))
    elif path == f"/v9/projects/{pid}/domains":
        sys.stdout.write(json.dumps({"domains": [{"name": d} for d in v["domains"]]}))
    elif path == f"/v1/projects/{pid}/pause" and method == "POST":
        v["paused"] = True
        v["pause_calls"] += 1
        sys.stdout.write("{}")
    elif path == f"/v1/projects/{pid}/unpause" and method == "POST":
        v["paused"] = False
        v["unpause_calls"] += 1
        sys.stdout.write("{}")
    elif (m := re.fullmatch(rf"/v9/projects/{pid}/env/(\w+)", path)):
        sys.stdout.write(json.dumps({"value": cfg.get("vercel_env", {}).get(m.group(1), "")}))
    else:
        w.st["violations"].append(f"unexpected vercel call {method} {path}")
        return 1
    if any(x in ("rm", "remove", "delete") for x in rest) or "DELETE" in rest:
        w.st["violations"].append("a Vercel delete was attempted")
    return 0


def shim_gh(w, cfg, args):
    g = w.st["gh"]
    a = list(args)
    w.log("gh", *[x for x in a if not x.startswith("tok")])
    if a[:2] == ["secret", "set"]:
        value = sys.stdin.read()
        name = a[2]
        if name in g["set_fail"]:
            return 1
        if not value:
            w.st["violations"].append(f"secret {name} set with an empty value")
        g["secrets"][name] = len(value)
        if any(s in " ".join(a) for s in SECRETS):
            w.st["violations"].append("a secret value is in a gh argument")
        if name == "FONTAWESOME_NPM_AUTH_TOKEN" and value != FA_TOKEN:
            w.st["violations"].append("the Font Awesome token was not read from ~/.npmrc")
        return 0
    if a[:2] == ["variable", "set"]:
        name = a[2]
        if name in g["set_fail"]:
            return 1
        g["vars"][name] = a[a.index("--body") + 1] if "--body" in a else sys.stdin.read()
        g.setdefault("var_order", []).append(name)
        return 0
    if a[:2] == ["run", "list"]:
        sys.stdout.write("123456\n" if g["run_found"] else "")
        return 0
    if a[:2] == ["run", "watch"]:
        return 0 if g["run_ok"] else 1
    w.st["violations"].append(f"unexpected gh call {a[:2]}")
    return 1


def shim_git(w, cfg, args):
    g = w.st["git"]
    a = list(args)
    if a[:1] == ["-C"]:
        a = a[2:]
    w.log("git", *a)
    if a[:2] == ["branch", "--show-current"]:
        print(g["branch"])
    elif a[:2] == ["status", "--porcelain"]:
        print(" M file" if g["dirty"] else "", end="")
    elif a[:1] == ["fetch"]:
        pass
    elif a[0] == "rev-parse":
        ref = a[1]
        print(g["head"] if ref == "HEAD" else g["origin_branch"] if ref == f"origin/{cfg['branch']}" else MAIN_SHA)
    elif a[:2] == ["merge-base", "--is-ancestor"]:
        return 0 if g["main_is_ancestor"] else 1
    elif a[:1] == ["push"]:
        g["pushed"].append(a[-1])
    else:
        w.st["violations"].append(f"unexpected git call {a}")
        return 1
    return 0


def shim_tool(w, cfg, tool, args):
    t = w.st["tools"]
    w.log(tool, *args)
    if tool == "sleep":
        w.st["clock"] += float(args[0])
        return 0
    if tool == "npx":
        joined = " ".join(args)
        if "install" in args:
            t["installs"] = t.get("installs", 0) + 1
            if cfg.get("needs_fa") and os.environ.get("FONTAWESOME_NPM_AUTH_TOKEN") != FA_TOKEN:
                w.st["violations"].append("pnpm install ran without FONTAWESOME_NPM_AUTH_TOKEN in the environment")
        if "wrangler" in joined and "deploy" in joined:
            t["deploys"] += 1
        if args[-1] == "build" or "turbo run build" in joined:
            t["builds"] += 1
            if t["build_fails"]:
                return 1
        return 0
    if tool == "node":
        return 1 if t["tests_fail"] else 0
    if tool == "shasum":
        return 1 if t["sums_fail"] else 0
    return 0


def shim_main(tool, args):
    w = World()
    cfg = json.load(open(os.path.join(os.environ["WORLD"], "world.json")))
    try:
        if tool == "curl":
            rc = shim_curl(w, cfg, args)
        elif tool == "vercel":
            rc = shim_vercel(w, cfg, args)
        elif tool == "gh":
            rc = shim_gh(w, cfg, args)
        elif tool == "git":
            rc = shim_git(w, cfg, args)
        else:
            rc = shim_tool(w, cfg, tool, args)
    finally:
        w.save()
    sys.stdout.flush()
    sys.exit(rc or 0)


# --------------------------------------------------------------------------------------- scenarios
def snapshot_records(st):
    return sorted((r["name"], r["type"], r["content"], r["proxied"], r["ttl"]) for z in st["cf"]["zones"].values() for r in z["records"])


class Run:
    def __init__(self, cfg, name, mutate=None, args=(), env=None, state=None):
        self.cfg, self.name = cfg, name
        self.dir = tempfile.mkdtemp(prefix=f"cutover-dry-{name}-")
        d = self.dir
        for sub in ("bin", "home", "repo", "state", *[os.path.join("repo", x) for x in cfg.get("repo_dirs", [])]):
            os.makedirs(os.path.join(d, sub), exist_ok=True)
        json.dump(cfg, open(os.path.join(d, "world.json"), "w"))
        st = new_state(cfg, name)
        if mutate:
            mutate(st)
        self.initial = snapshot_records(st)
        json.dump(st, open(os.path.join(d, "state.json"), "w"))
        open(os.path.join(d, "cloudflare.env"), "w").write(f"CLOUDFLARE_API_TOKEN={CF_TOKEN}\nCLOUDFLARE_ACCOUNT_ID={ACCOUNT}\n")
        open(os.path.join(d, "home", ".npmrc"), "w").write(f"//npm.fontawesome.com/:_authToken={FA_TOKEN}\n")
        me = os.path.abspath(__file__)
        for tool in ("curl", "vercel", "gh", "git", "npx", "node", "shasum"):
            p = os.path.join(d, "bin", tool)
            open(p, "w").write(f'#!/bin/sh\nexec python3 "{me}" --shim {tool} "$@"\n')
            os.chmod(p, 0o755)
        # sleep never sleeps: it notes the seconds (plain sh, so a long wait costs no Python start-ups)
        p = os.path.join(d, "bin", "sleep")
        open(p, "w").write(f'#!/bin/sh\necho "$1" >> "{d}/sleep.log"\n')
        os.chmod(p, 0o755)
        self.env = {
            **os.environ,
            "WORLD": d,
            "HOME": os.path.join(d, "home"),
            "R": os.path.join(d, "repo"),
            "S": os.path.join(d, "state"),
            "CF_ENV_FILE": os.path.join(d, "cloudflare.env"),
            "NODE_BIN": os.path.join(d, "bin"),
            "PATH": os.path.join(d, "bin") + os.pathsep + os.environ["PATH"],
            **(env or {}),
        }
        self.args = list(args)
        self.out = ""
        self.rc = None

    def run(self, *args):
        a = list(args) if args else self.args
        r = subprocess.run(["/bin/bash", SCRIPT, *a], env=self.env, capture_output=True, text=True, timeout=600)
        self.out, self.rc = r.stdout + r.stderr, r.returncode
        self.log = open(os.path.join(self.dir, "state", "cutover.log")).read() if os.path.exists(os.path.join(self.dir, "state", "cutover.log")) else ""
        return self

    @property
    def st(self):
        st = json.load(open(os.path.join(self.dir, "state.json")))
        sl = os.path.join(self.dir, "sleep.log")
        st["clock"] = sum(float(x) for x in open(sl).read().split()) if os.path.exists(sl) else 0
        return st

    def edit(self, fn):
        st = json.load(open(os.path.join(self.dir, "state.json")))
        fn(st)
        json.dump(st, open(os.path.join(self.dir, "state.json"), "w"))

    def calls(self):
        return self.st["calls"]


class Fail(Exception):
    pass


def check(cond, msg):
    if not cond:
        raise Fail(msg)


def common(r, cfg, expect_rc=0):
    st = r.st
    check(r.rc == expect_rc, f"exit {r.rc}, wanted {expect_rc}\n{r.out[-1800:]}")
    check(not st["violations"], f"violations: {st['violations']}")
    for s in SECRETS:
        check(s not in r.out and s not in r.log, f"secret value {s[:6]}... was printed or logged")


def has_hosts(cfg):
    return bool(cfg["hosts"])


def sc_happy(cfg):
    r = Run(cfg, "happy").run()
    st = r.st
    common(r, cfg)
    check(st["vercel"]["paused"] and st["vercel"]["pause_calls"] == 1, "Vercel was not paused exactly once")
    check(st["vercel"]["unpause_calls"] == 0, "Vercel was unpaused")
    check(st["tools"]["deploys"] == 1, f"wrangler deploy ran {st['tools']['deploys']} times")
    if cfg.get("needs_fa"):
        check(st["tools"].get("installs", 0) >= 1, "pnpm install did not run")
    check(st["git"]["pushed"] == [f"HEAD:{cfg['default_branch']}"], f"pushed {st['git']['pushed']}")
    check(st["gh"]["vars"].get("CLOUDFLARE_CUTOVER") == "true", "CLOUDFLARE_CUTOVER not set")
    for n in ("CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID") + (("FONTAWESOME_NPM_AUTH_TOKEN",) if cfg.get("needs_fa") else ()):
        check(n in st["gh"]["secrets"], f"GitHub secret {n} not set")
    for v in cfg.get("gh_vars", []):
        check(v in st["gh"]["vars"], f"GitHub variable {v} not set")
    check(st["gh"]["var_order"][-1] == "CLOUDFLARE_CUTOVER", "the deploy switch must be the last variable set, right before the push")
    if has_hosts(cfg):
        check(st["net"]["snapshot_before_first_delete"] is True, "the DNS snapshot did not exist before the first record was deleted")
        names = {h["host"] for h in cfg["hosts"]}
        check({d["hostname"] for d in st["cf"]["domains"]} == names, "Worker domains do not match the hostnames")
        left = [r_ for z in st["cf"]["zones"].values() for r_ in z["records"] if r_["name"] in names and r_["type"] in ("A", "AAAA", "CNAME")]
        check(not left, f"old records left: {left}")
        others_now = sorted(t for t in snapshot_records(st) if t[0] not in names)
        others_before = sorted(t for t in r.initial if t[0] not in names)
        check(others_now == others_before, f"records at other names changed.\nwas {others_before}\nnow {others_now}")
        check(os.path.exists(os.path.join(r.dir, "state", "dns-rollback.json")), "no rollback file")
        calls = r.calls()
        ttl = cfg["expected_ttl_wait"]
        check(st["clock"] >= ttl * 0.95, f"slept {st['clock']}s in total, the old TTL is {ttl}s")
        i_pause = next(i for i, c in enumerate(calls) if "/pause" in c)
        i_last_attach = max(i for i, c in enumerate(calls) if c.startswith("cf PUT"))
        check(i_pause > i_last_attach, "Vercel was paused before the last hostname was attached")
        i_push = next(i for i, c in enumerate(calls) if c.startswith("git push"))
        i_var = next(i for i, c in enumerate(calls) if c.startswith("gh variable set CLOUDFLARE_CUTOVER"))
        check(i_var < i_push < i_pause, "order must be: deploy switch, push, then pause")
    else:
        check(not any(c.startswith("cf DELETE") or c.startswith("cf PUT") for c in r.calls()), "a site without a domain touched DNS")
    return "ok"


def sc_stale(cfg):
    if not has_hosts(cfg):
        return "n/a (no domain)"
    r = Run(cfg, "stale_resolvers", mutate=lambda st: st["net"].__setitem__("stale_hits", 4)).run()
    common(r, cfg)
    check(r.st["vercel"]["paused"], "Vercel was not paused")
    return "ok"


def sc_worker_differs(cfg):
    r = Run(cfg, "worker_differs", mutate=lambda st: st["net"].__setitem__("worker_mutation", "text")).run()
    common(r, cfg, expect_rc=1)
    st = r.st
    check("staged Worker differs" in r.out, "no clear message")
    check(not any(c.startswith("cf DELETE") or c.startswith("cf PUT") for c in r.calls()), "DNS was touched")
    check(not st["vercel"]["paused"] and not st["git"]["pushed"], "Vercel paused or main pushed")
    return "ok"


def sc_build_fails(cfg):
    r = Run(cfg, "build_fails", mutate=lambda st: st["tools"].__setitem__("tests_fail", True)).run()
    common(r, cfg, expect_rc=1)
    check("build or deploy failed" in r.out, "no clear message")
    check(not any(c.startswith("cf DELETE") for c in r.calls()) and not r.st["vercel"]["paused"], "something changed")
    return "ok"


def sc_dirty_and_unpushed(cfg):
    for name, mut, msg in (
        ("dirty_tree", lambda st: st["git"].__setitem__("dirty", True), "uncommitted"),
        ("not_pushed", lambda st: st["git"].__setitem__("origin_branch", "c" * 40), "not pushed"),
        ("wrong_branch", lambda st: st["git"].__setitem__("branch", "main"), "is not on"),
        ("vercel_paused", lambda st: st["vercel"].__setitem__("paused", True), "paused"),
        ("token_inactive", lambda st: st["cf"].__setitem__("token", "expired"), "not active"),
    ):
        r = Run(cfg, name, mutate=mut).run()
        common(r, cfg, expect_rc=1)
        check(msg in r.out, f"{name}: no clear message ({msg})")
        check(r.st["tools"]["deploys"] == 0 and not any(c.startswith("cf DELETE") for c in r.calls()), f"{name}: something changed")
    return "ok"


def sc_foreign_domain(cfg):
    if not has_hosts(cfg):
        return "n/a (no domain)"
    r = Run(cfg, "foreign_worker_domain", mutate=lambda st: st["cf"].__setitem__("conflict_service", "someone-elses-worker")).run()
    common(r, cfg, expect_rc=1)
    check("another Worker" in r.out, "no clear message")
    check(r.st["tools"]["deploys"] == 0, "deployed anyway")
    return "ok"


def sc_attach_fails(cfg):
    if not has_hosts(cfg):
        return "n/a (no domain)"
    victim = cfg["hosts"][-1]["host"]
    r = Run(cfg, "attach_fails", mutate=lambda st: st["cf"].__setitem__("attach_fail", victim)).run()
    common(r, cfg, expect_rc=1)
    st = r.st
    check(snapshot_records(st) == r.initial, f"DNS not restored.\nwanted {r.initial}\ngot    {snapshot_records(st)}")
    check(st["cf"]["domains"] == [], "a Worker domain is still attached")
    check(not st["vercel"]["paused"] and not st["git"]["pushed"], "Vercel paused or main pushed")
    check("restoring the records" in r.out, "no message about restoring")
    return "ok"


def sc_delete_fails(cfg):
    if not has_hosts(cfg):
        return "n/a (no domain)"
    victim = cfg["hosts"][-1]["host"]
    r = Run(cfg, "delete_fails", mutate=lambda st: st["cf"].__setitem__("delete_fail", victim)).run()
    common(r, cfg, expect_rc=1)
    st = r.st
    check(snapshot_records(st) == r.initial, f"DNS not restored.\nwanted {r.initial}\ngot    {snapshot_records(st)}")
    check(st["cf"]["domains"] == [] and not st["vercel"]["paused"], "domains attached or Vercel paused")
    return "ok"


def sc_checks_fail_then_rollback(cfg):
    if not has_hosts(cfg):
        return "n/a (no domain)"
    r = Run(cfg, "checks_fail", mutate=lambda st: st["net"].__setitem__("worker_mutation", "wrong_redirect_status"), env={"VERIFY_TRIES": "3"}).run()
    common(r, cfg, expect_rc=1)
    st = r.st
    check("live checks failed" in r.out, "no clear message")
    check(not st["vercel"]["paused"] and not st["git"]["pushed"], "Vercel paused or main pushed although the checks failed")
    check("bash" in r.out and "cutover.sh rollback" in r.out, "the rollback command was not printed")
    check(os.path.exists(os.path.join(r.dir, "state", "dns-rollback.json")), "no rollback file")
    # a new run is refused while the snapshot exists
    r.run()
    check(r.rc == 1 and "an earlier run reached the DNS step" in r.out, "a second run was not refused")
    # rollback puts everything back, and is safe to repeat
    r.run("rollback")
    st = r.st
    check(r.rc == 0, f"rollback exit {r.rc}\n{r.out[-1500:]}")
    check(snapshot_records(st) == r.initial, f"records differ after rollback.\nwanted {r.initial}\ngot    {snapshot_records(st)}")
    check(st["cf"]["domains"] == [], "Worker domains remain after rollback")
    check(not st["vercel"]["paused"], "Vercel is paused after rollback")
    check(st["gh"]["vars"].get("CLOUDFLARE_CUTOVER") == "false", "the deploy switch was not turned off")
    r.run("rollback")
    check(r.rc == 0 and "already restored" in r.out, f"second rollback not clean: rc {r.rc}\n{r.out[-800:]}")
    common(r, cfg)
    return "ok"


def sc_main_moved(cfg):
    r = Run(cfg, "main_moved", mutate=lambda st: st["git"].__setitem__("main_is_ancestor", False)).run()
    common(r, cfg)
    st = r.st
    check(not st["git"]["pushed"], "pushed although main moved")
    check(st["vercel"]["paused"], "the rest of the cutover should still finish (Vercel paused)")
    check("NEEDS YOU" in r.out and "moved past" in r.out, "no follow-up message")
    return "ok"


def sc_github_failure(cfg):
    r = Run(cfg, "github_secret_fails", mutate=lambda st: st["gh"].__setitem__("set_fail", ["CLOUDFLARE_API_TOKEN"])).run()
    common(r, cfg)
    st = r.st
    check(not st["git"]["pushed"], "pushed without the secret")
    check("NEEDS YOU" in r.out and "CLOUDFLARE_API_TOKEN" in r.out, "no follow-up message")
    check(st["vercel"]["paused"], "the rest of the cutover should still finish")
    return "ok"


def sc_workflow_fails(cfg):
    r = Run(cfg, "workflow_fails", mutate=lambda st: st["gh"].__setitem__("run_ok", False)).run()
    common(r, cfg)
    check("FAILED" in r.out and "NEEDS YOU" in r.out, "no follow-up message")
    check(r.st["vercel"]["paused"], "the rest of the cutover should still finish")
    return "ok"


def sc_pause_now(cfg):
    r = Run(cfg, "pause_wait_zero", env={"PAUSE_WAIT": "0"}).run()
    common(r, cfg)
    check(r.st["clock"] < 3600 or not has_hosts(cfg), "PAUSE_WAIT=0 still waited")
    return "ok"


def sc_subcommands(cfg):
    if not has_hosts(cfg):
        return "n/a (no domain)"
    r = Run(cfg, "subcommands", env={"PAUSE_WAIT": "0"}).run()
    common(r, cfg)
    r.edit(lambda st: st["vercel"].__setitem__("paused", False))
    r.run("pause")
    check(r.rc == 0 and r.st["vercel"]["paused"], f"pause subcommand failed\n{r.out[-600:]}")
    r.run("verify")
    check(r.rc == 0 and "live checks passed" in r.out, f"verify subcommand failed\n{r.out[-600:]}")
    return "ok"


SCENARIOS = [
    ("happy path", sc_happy),
    ("stale resolvers (answers lag behind DNS)", sc_stale),
    ("staged Worker differs from live", sc_worker_differs),
    ("build fails", sc_build_fails),
    ("preflight refusals", sc_dirty_and_unpushed),
    ("hostname already on another Worker", sc_foreign_domain),
    ("attach fails mid-flip", sc_attach_fails),
    ("delete fails mid-flip", sc_delete_fails),
    ("live checks fail, rerun refused, rollback twice", sc_checks_fail_then_rollback),
    ("main moved", sc_main_moved),
    ("GitHub secret cannot be set", sc_github_failure),
    ("deploy workflow fails", sc_workflow_fails),
    ("PAUSE_WAIT=0", sc_pause_now),
    ("pause and verify subcommands", sc_subcommands),
]


def main():
    if len(sys.argv) > 2 and sys.argv[1] == "--shim":
        shim_main(sys.argv[2], sys.argv[3:])
    cfg = json.load(open(os.path.join(HERE, "world.json")))
    want = sys.argv[1] if len(sys.argv) > 1 else ""
    bad = 0
    print(f"cutover dry run for {cfg['slug']}: {os.path.abspath(SCRIPT)}", flush=True)
    for name, fn in SCENARIOS:
        if want and want not in name:
            continue
        try:
            res = fn(copy.deepcopy(cfg))
            print(f"  PASS  {name}" + (f"  [{res}]" if res != "ok" else ""), flush=True)
        except Fail as e:
            bad += 1
            print(f"  FAIL  {name}: {e}", flush=True)
        except subprocess.TimeoutExpired:
            bad += 1
            print(f"  FAIL  {name}: the script hung")
    print("all scenarios passed" if not bad else f"{bad} scenario(s) FAILED")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
