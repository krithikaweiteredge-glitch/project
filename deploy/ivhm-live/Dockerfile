# IVHM live server for the public website: private IVHM server + simulator + read-only gateway.
# Build from the repository root:  docker build -t ivhm-live deploy/ivhm-live
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 MALLOC_ARENA_MAX=2

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# IVHM itself, pinned to an exact commit, dependencies checked against their SHA-256 hashes
ARG IVHM_REF=de3b6549f1b4ae015698514af9ef91d8b46f6afd
RUN git clone https://github.com/tejeshvenkat/ivhm.git /src \
 && cd /src && git checkout "$IVHM_REF" \
 && pip install --require-hashes -r requirements/linux-py311.txt \
 && pip install --no-deps . \
 && rm -rf /src

# NASA C-MAPSS engine data for the airliner replay
COPY fetch_cmapss.py /tmp/fetch_cmapss.py
RUN mkdir -p /cmapss && python /tmp/fetch_cmapss.py /cmapss && rm /tmp/fetch_cmapss.py

WORKDIR /app
COPY gateway.py start.sh ./
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh \
 && useradd --create-home --uid 10001 ivhm && mkdir -p /data && chown ivhm /data /cmapss
USER ivhm

EXPOSE 10000
CMD ["./start.sh"]
