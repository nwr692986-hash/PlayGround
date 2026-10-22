#!/usr/bin/env bash
set -euo pipefail

# Per-command timing
start_time=$(date +%s.%N)

PROJECT_DIR="/home/runner/work/PlayGround/PlayGround"
cd "$PROJECT_DIR"

echo "[$(date +%H:%M:%S)] Starting one-time setup..."

# Install dependencies if needed
if [[ ! -d "node_modules" ]] || [[ ! -f "node_modules/.package-lock.json" ]] || [[ "package-lock.json" -nt "node_modules/.package-lock.json" ]]; then
    echo "[$(date +%H:%M:%S)] Installing npm dependencies..."
    npm ci 2>&1 | tail -20
    cp package-lock.json node_modules/.package-lock.json 2>/dev/null || true
else
    echo "[$(date +%H:%M:%S)] Dependencies already installed, skipping..."
fi

# Build step - copy files to dist
echo "[$(date +%H:%M:%S)] Building project..."
rm -rf dist
mkdir -p dist
cp index.html style.css script.js dist/

end_time=$(date +%s.%N)
duration=$(echo "$end_time - $start_time" | bc)
echo "[$(date +%H:%M:%S)] Startup completed in ${duration}s"