"""Screenshot helper for the rebuild (dev only, not shipped).

Usage (from ascend/frontend, with `npx vite --port <PORT>` running and
VITE_API_URL=http://127.0.0.1:8000):
    python scripts_shoot.py <PORT> <route> <out.png> [width] [height] [--full] [--guest]

Logs in as the demo account (unless --guest) by injecting a session, opens
http://localhost:<PORT><route>, waits for the network to settle and saves a
screenshot. --full scrolls the app's scroll container and stitches a full page.
"""
import json, sys, time, urllib.request
from playwright.sync_api import sync_playwright

port, route, out = sys.argv[1], sys.argv[2], sys.argv[3]
w = int(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4].isdigit() else 1440
h = int(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5].isdigit() else 900
full = '--full' in sys.argv
guest = '--guest' in sys.argv

session = None
if not guest:
    # Reuse one cached demo session: logging in on every screenshot trips the
    # backend's login rate limit (HTTP 429) when several builders run at once.
    import os, tempfile
    cache = os.path.join(tempfile.gettempdir(), 'ascend_demo_session.json')
    try:
        cached = json.load(open(cache))
        if cached.get('expires_at', 0) - 120 > time.time():
            session = cached
    except Exception:
        pass
    if session is None:
        req = urllib.request.Request('http://127.0.0.1:8000/auth/login', data=json.dumps({'identifier': 'demo', 'password': 'Demo-rvTQrsWxNH0i'}).encode(), headers={'Content-Type': 'application/json'})
        r = json.load(urllib.request.urlopen(req))
        session = {k: r[k] for k in ('access_token', 'refresh_token', 'expires_at', 'user')}
        json.dump(session, open(cache, 'w'))

with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge')
    ctx = b.new_context(viewport={'width': w, 'height': h}, timezone_id='Asia/Kolkata', device_scale_factor=1, has_touch=w < 700)
    if session:
        ctx.add_init_script(f"localStorage.setItem('ascend_session', {json.dumps(json.dumps(session))});")
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(f'http://localhost:{port}{route}', wait_until='networkidle')
    time.sleep(2.5)
    pg.screenshot(path=out, full_page=full)
    sw = pg.evaluate('document.documentElement.scrollWidth')
    print('saved', out, '| horizontal overflow' if sw > w else '| no overflow', '| errors:', errs[:5])
    b.close()
