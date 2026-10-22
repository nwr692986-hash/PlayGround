#!/usr/bin/env bash
set -euo pipefail

# Per-command timing
start_time=$(date +%s.%N)

PROJECT_DIR="/home/runner/work/PlayGround/PlayGround"
cd "$PROJECT_DIR"

# Ensure dist exists
if [[ ! -d "dist" ]]; then
    echo "[$(date +%H:%M:%S)] dist directory not found, running build..."
    mkdir -p dist
    cp index.html style.css script.js dist/
fi

# Write deployment output
DEPLOYMENT_OUTPUT="/home/runner/work/_temp/omgithub-web/deployment-output.json"
mkdir -p "$(dirname "$DEPLOYMENT_OUTPUT")"
cat > "$DEPLOYMENT_OUTPUT" <<EOF
{
  "project": "/home/runner/work/PlayGround/PlayGround",
  "directory": "/home/runner/work/PlayGround/PlayGround/dist"
}
EOF

echo "[$(date +%H:%M:%S)] Starting server on port ${PORT:-3000}..."
echo "[$(date +%H:%M:%S)] Serving from /home/runner/work/PlayGround/PlayGround/dist"

# Start the server
exec node server.js