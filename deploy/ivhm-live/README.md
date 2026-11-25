# Hosted IVHM live server for the website

The website shows live data from the IVHM server. On your computer the dev server forwards `/api`
to `127.0.0.1:8000`. The deployed website can't reach your computer, so it needs the server hosted online.

## What runs online

One container with three processes (see `start.sh`):

1. **IVHM live server**: private, listening only on `127.0.0.1` inside the container.
   Its admin and write endpoints are never reachable from the internet.
2. **Simulator**: feeds the server a quadcopter (QX1) and an airliner replaying NASA C-MAPSS engines (AL1).
3. **Read-only gateway** (`gateway.py`): the only public part. It passes through exactly
   `GET /api/fleet`, `GET /api/aircraft/{id}` and `GET /api/aircraft/{id}/{part}/history`, and nothing else.

The data is simulated. Anyone who knows the gateway address can read it, but no one can change it.

## Host it on Render

1. Sign in at render.com with GitHub (you create the account; it's free).
2. **New → Blueprint**, pick the `project` repository. Render reads `render.yaml` and builds
   `deploy/ivhm-live/Dockerfile`. The first build takes about 5–10 minutes.
3. When it's live, open `https://<your-service>.onrender.com/health`. It should say
   `{"gateway":"ok","ivhm":"ok"}`. Just after a start, `"ivhm":"starting"` is normal for a minute
   while the engine model trains.

## Point the website at it

In the website's hosting settings (Vercel: Project → Settings → Environment Variables; Netlify: Site
configuration → Environment variables) add:

    VITE_IVHM_API = https://<your-service>.onrender.com

Then redeploy the website. Optionally set `ALLOW_ORIGINS` on Render to your website's address
(for example `https://your-site.vercel.app`) so only your site can read it from a browser.

## Things to know about the free plan

- It **sleeps after about 15 minutes** with no visitors. The next visit wakes it, which takes about a minute.
  Until then the site shows demo data, then switches to live by itself (it checks every 8 seconds).
- **Data restarts** with each wake-up: the fleet starts again from the beginning. A paid plan with a disk keeps it.
- The free plan has 512 MB of memory. If the service restarts with "out of memory", choose the next plan up.
