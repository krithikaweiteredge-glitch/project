#!/bin/sh
# One container, three processes:
#   1. the IVHM live server, private: only 127.0.0.1 inside the container (no login needed there)
#   2. the simulator, feeding it a quadcopter (QX1) and an airliner replaying NASA engines (AL1)
#   3. the public read-only gateway on $PORT, the only thing reachable from the internet
set -e
mkdir -p /data

python -m ivhm.live.server --host 127.0.0.1 --port 8001 --db /data/ivhm_live.db \
  --cmapss /cmapss --data-dir /data &

# start the simulator once the server answers (it trains the engine model on first start)
(
  until python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/api/health', timeout=3)" 2>/dev/null; do
    sleep 3
  done
  exec python -m ivhm.live.simulate --server http://127.0.0.1:8001 --cmapss /cmapss --auto-maintain --speed 5
) &

exec uvicorn gateway:app --host 0.0.0.0 --port "${PORT:-10000}" --proxy-headers --forwarded-allow-ips '*'
