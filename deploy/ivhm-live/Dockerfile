# syntax=docker/dockerfile:1
# IVHM live server for the public website: private IVHM server + simulator + read-only gateway.
# Build:  docker build --secret id=github_token,src=<file with the token> -t ivhm-live deploy/ivhm-live
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 MALLOC_ARENA_MAX=2

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# IVHM itself (a private repository), pinned to an exact commit, dependencies checked against their
# SHA-256 hashes. The read-only GitHub token comes from the Render secret file "github_token": it is
# mounted for this one step only, sent as a header (never written to git config), and not kept in the image.
ARG IVHM_REF=de3b6549f1b4ae015698514af9ef91d8b46f6afd
RUN --mount=type=secret,id=github_token,required=true \
    AUTH=$(printf 'x-access-token:%s' "$(tr -d '\r\n' < /run/secrets/github_token)" | base64 -w0) \
 && git -c http.extraHeader="Authorization: Basic $AUTH" clone --quiet https://github.com/tejeshvenkat/ivhm.git /src \
 && cd /src && git checkout --quiet "$IVHM_REF" \
 && pip install --require-hashes -r requirements/linux-py311.txt \
 && pip install --no-deps . \
 && cd / && rm -rf /src

# NASA C-MAPSS engine data for the airliner replay
COPY fetch_cmapss.py /tmp/fetch_cmapss.py
RUN mkdir -p /cmapss && python /tmp/fetch_cmapss.py /cmapss && rm /tmp/fetch_cmapss.py

# Train the engine model now, on the build machine, and ship it in the image. The server finds it in
# /data and loads it in seconds, instead of retraining for minutes on every start of a small free instance.
RUN mkdir -p /data && python -c "from pathlib import Path; from ivhm.live.server import load_turbofan; \
print(load_turbofan('/cmapss', Path('/data/turbofan_FD001.pkl')))" \
 && test -s /data/turbofan_FD001.pkl

WORKDIR /app
COPY gateway.py start.sh ./
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh \
 && useradd --create-home --uid 10001 ivhm && mkdir -p /data && chown ivhm /data /cmapss
USER ivhm

EXPOSE 10000
CMD ["./start.sh"]
