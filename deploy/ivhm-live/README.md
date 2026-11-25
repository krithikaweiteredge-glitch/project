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

## Permission and access

IVHM (`tejeshvenkat/ivhm`) is private and proprietary: hosting it needs Tejesh Venkat Dokku's permission.
Render downloads it at build time with a **read-only GitHub token**. Tejesh has to create it, because
GitHub fine-grained tokens only reach repositories owned by the account that creates them:

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
2. Resource owner: `tejeshvenkat`. Repository access: **Only select repositories** → `ivhm`.
3. Permissions → Repository permissions → **Contents: Read-only** (nothing else).
4. Set an expiry date, generate, and copy the token.

The token is never put in this repository or in the built image. It's mounted for the one build step that
downloads IVHM, then discarded.

## Host it on Render

1. Sign in at render.com with GitHub (you create the account; it's free).
2. **New → Blueprint**, pick the `project` repository, and apply. Render reads `render.yaml`.
   The first build fails with a missing secret; that's expected until step 3.
3. Open the new **ivhm-live** service → **Environment** → **Secret Files** → Add:
   - Filename: `github_token`
   - Contents: the token from Tejesh (just the token, on one line)

   Save, then **Manual Deploy → Deploy latest commit**. The build takes about 5–10 minutes.
4. When it's live, open `https://<your-service>.onrender.com/health`. It should say
   `{"gateway":"ok","ivhm":"ok"}`. Just after a start, `"ivhm":"starting"` is normal for a few seconds.
   (The engine model is trained during the build and ships in the image, so starts are quick.)

When the token expires, Tejesh makes a new one and you replace the secret file. Running copies keep
working; only new builds need the token.

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
