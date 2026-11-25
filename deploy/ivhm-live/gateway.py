"""Public, read-only gateway in front of the IVHM live server.

The IVHM server (with its admin and write endpoints) listens only inside the container, on
127.0.0.1. This gateway is the only thing exposed to the internet. It passes through exactly
the three read requests the website makes, and nothing else:

    GET /api/fleet
    GET /api/aircraft/{aircraft}
    GET /api/aircraft/{aircraft}/{component}/history

Environment:
    PORT           port to listen on (set by the host, e.g. Render)
    IVHM_UPSTREAM  the private IVHM server (default http://127.0.0.1:8001)
    ALLOW_ORIGINS  comma-separated website origins allowed to read (default: any)
"""
import os
import re
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


def _fetch(path):
    req = urllib.request.Request(UPSTREAM + path, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except (urllib.error.URLError, TimeoutError, ConnectionError):
        return 503, b'{"error": "IVHM server is starting"}'


async def _pass(path):
    status, body = await run_in_threadpool(_fetch, path)
    return Response(body, status_code=status, media_type="application/json",
                    headers={"Cache-Control": "no-store"})


def _ids(request, *names):
    vals = [request.path_params[n] for n in names]
    return vals if all(SAFE_ID.match(v) for v in vals) else None


async def fleet(request):
    return await _pass("/api/fleet")


async def aircraft(request):
    ids = _ids(request, "aid")
    if not ids:
        return JSONResponse({"error": "bad id"}, status_code=400)
    return await _pass(f"/api/aircraft/{ids[0]}")


async def history(request):
    ids = _ids(request, "aid", "cid")
    if not ids:
        return JSONResponse({"error": "bad id"}, status_code=400)
    return await _pass(f"/api/aircraft/{ids[0]}/{ids[1]}/history")


async def health(request):
    status, _ = await run_in_threadpool(_fetch, "/api/health")
    return JSONResponse({"gateway": "ok", "ivhm": "ok" if status == 200 else "starting"})


app = Starlette(
    routes=[
        Route("/api/fleet", fleet),
        Route("/api/aircraft/{aid}", aircraft),
        Route("/api/aircraft/{aid}/{cid}/history", history),
        Route("/health", health),
    ],
    middleware=[Middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET"], allow_headers=["Accept"])],
)
