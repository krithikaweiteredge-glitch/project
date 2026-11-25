"""Public, read-only gateway in front of the IVHM live server.

The IVHM server (with its admin and write endpoints) listens only inside the container, on
127.0.0.1. This gateway is the only thing exposed to the internet. It passes through exactly
the three read requests the website makes, and nothing else:

    GET /api/fleet
    GET /api/aircraft/{aircraft}
    GET /api/aircraft/{aircraft}/{component}/history

On a small free instance the IVHM server can be slow to answer while it processes incoming
flights. So the gateway keeps the last good answer for each request and serves it at once:
the fleet is refreshed in the background every few seconds, and the other two are refreshed
when asked. A visitor gets data at most a few seconds old instead of a timeout.

Environment:
    PORT           port to listen on (set by the host, e.g. Render)
    IVHM_UPSTREAM  the private IVHM server (default http://127.0.0.1:8001)
    ALLOW_ORIGINS  comma-separated website origins allowed to read (default: any)
"""
import asyncio
import contextlib
import os
import re
import threading
import time
import urllib.error
import urllib.request

from starlette.applications import Starlette
from starlette.concurrency import run_in_threadpool
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

UPSTREAM = os.environ.get("IVHM_UPSTREAM", "http://127.0.0.1:8001").rstrip("/")
ORIGINS = [o.strip() for o in os.environ.get("ALLOW_ORIGINS", "*").split(",") if o.strip()]
SAFE_ID = re.compile(r"^[A-Za-z0-9_.\-]{1,64}$")

FLEET_EVERY_S = 8          # background refresh of the fleet
FRESH_S = 20               # aircraft / history answers younger than this are served without asking again
WAIT_S = 6                 # how long a visitor waits for a fresh answer before getting the last good one
UPSTREAM_TIMEOUT_S = 60    # a slow IVHM server still gets time to answer (in the background)

_cache = {}                # path -> (time, status, body) of the last good (200) answer
_lock = threading.Lock()
_inflight = {}             # path -> asyncio.Task fetching it now


def _fetch(path, timeout=UPSTREAM_TIMEOUT_S):
    req = urllib.request.Request(UPSTREAM + path, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            status, body = r.status, r.read()
    except urllib.error.HTTPError as e:
        status, body = e.code, e.read()
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError):
        return 503, b'{"error": "IVHM server is starting"}'
    if status == 200:
        with _lock:
            _cache[path] = (time.time(), status, body)
    return status, body


def _cached(path):
    with _lock:
        return _cache.get(path)


def _reply(status, body, age=None):
    headers = {"Cache-Control": "no-store"}
    if age is not None:
        headers["X-Data-Age"] = str(int(age))
    return Response(body, status_code=status, media_type="application/json", headers=headers)


async def _refresh(path):
    """One upstream fetch per path at a time; others wait for the same one."""
    task = _inflight.get(path)
    if task is None or task.done():
        task = asyncio.ensure_future(run_in_threadpool(_fetch, path))
        _inflight[path] = task
    return await asyncio.shield(task)


async def _serve(path):
    hit = _cached(path)
    if hit and time.time() - hit[0] < FRESH_S:
        return _reply(hit[1], hit[2], time.time() - hit[0])
    try:
        status, body = await asyncio.wait_for(_refresh(path), WAIT_S)
        if status == 200 or not hit:
            return _reply(status, body, 0 if status == 200 else None)
    except asyncio.TimeoutError:
        if not hit:
            return _reply(503, b'{"error": "IVHM server is busy, try again shortly"}')
    return _reply(hit[1], hit[2], time.time() - hit[0])            # the last good answer


def _ids(request, *names):
    vals = [request.path_params[n] for n in names]
    return vals if all(SAFE_ID.match(v) for v in vals) else None


async def fleet(request):
    hit = _cached("/api/fleet")
    if hit:
        return _reply(hit[1], hit[2], time.time() - hit[0])
    return await _serve("/api/fleet")


async def aircraft(request):
    ids = _ids(request, "aid")
    if not ids:
        return JSONResponse({"error": "bad id"}, status_code=400)
    return await _serve(f"/api/aircraft/{ids[0]}")


async def history(request):
    ids = _ids(request, "aid", "cid")
    if not ids:
        return JSONResponse({"error": "bad id"}, status_code=400)
    return await _serve(f"/api/aircraft/{ids[0]}/{ids[1]}/history")


async def health(request):
    status, _ = await run_in_threadpool(_fetch, "/api/health", 10)
    hit = _cached("/api/fleet")
    return JSONResponse({"gateway": "ok", "ivhm": "ok" if status == 200 else "starting",
                         "fleet_age_s": int(time.time() - hit[0]) if hit else None})


def _fleet_loop():
    while True:
        _fetch("/api/fleet")
        time.sleep(FLEET_EVERY_S)


@contextlib.asynccontextmanager
async def _lifespan(app):
    threading.Thread(target=_fleet_loop, daemon=True).start()
    yield


app = Starlette(
    routes=[
        Route("/api/fleet", fleet),
        Route("/api/aircraft/{aid}", aircraft),
        Route("/api/aircraft/{aid}/{cid}/history", history),
        Route("/health", health),
    ],
    middleware=[Middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET"], allow_headers=["Accept"],
                           expose_headers=["X-Data-Age"])],
    lifespan=_lifespan,
)
