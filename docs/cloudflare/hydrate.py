#!/usr/bin/env python3
"""Render live and staged pages in headless Chrome (its own throw-away profile), compare the HYDRATED visible text.
Catches what plain HTML fetches cannot: a client bundle that fails to load or crashes after the move."""
import hashlib, os, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parity import Page
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def dump(url):
    with tempfile.TemporaryDirectory() as prof:
        r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
                            f"--user-data-dir={prof}", "--virtual-time-budget=15000", "--dump-dom", url],
                           capture_output=True, text=True, timeout=180)
    return r.stdout

def text(dom):
    p = Page(); p.feed(dom); return p.visible()

ok = True
for live, stage in zip(sys.argv[1::2], sys.argv[2::2]):
    a, b = text(dump(live)), text(dump(stage))
    same = a == b and len(a) > 40
    ok &= same
    print(f"{'same     ' if same else 'DIFFERENT'} {len(a):6d} {len(b):6d} chars  {live}  vs  {stage}")
    if not same:
        n = next((i for i in range(min(len(a), len(b))) if a[i] != b[i]), min(len(a), len(b)))
        print("   first difference at", n, "\n   live :", repr(a[max(0,n-60):n+80]), "\n   stage:", repr(b[max(0,n-60):n+80]))
sys.exit(0 if ok else 1)
