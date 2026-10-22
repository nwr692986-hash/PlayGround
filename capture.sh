#!/usr/bin/env bash
set -euo pipefail

# Per-command timing
start_time=$(date +%s.%N)

CAPTURE_URL="${CAPTURE_URL:-}"
CAPTURE_DIR="${CAPTURE_DIR:-}"

if [[ -z "$CAPTURE_URL" ]] || [[ -z "$CAPTURE_DIR" ]]; then
    echo "Error: CAPTURE_URL and CAPTURE_DIR environment variables are required" >&2
    exit 1
fi

mkdir -p "$CAPTURE_DIR"

echo "[$(date +%H:%M:%S)] Starting capture for $CAPTURE_URL"
echo "[$(date +%H:%M:%S)] Output directory: $CAPTURE_DIR"

# Check if we have chromium/chrome available
CHROME_BIN=""
for bin in chromium chromium-browser google-chrome google-chrome-stable; do
    if command -v "$bin" &>/dev/null; then
        CHROME_BIN="$bin"
        break
    fi
done

if [[ -z "$CHROME_BIN" ]]; then
    echo "[$(date +%H:%M:%S)] No Chrome/Chromium found, attempting to install..."
    if command -v apt-get &>/dev/null; then
        apt-get update && apt-get install -y chromium 2>&1 | tail -10
        CHROME_BIN=$(command -v chromium || command -v chromium-browser)
    fi
fi

if [[ -z "$CHROME_BIN" ]]; then
    echo "[$(date +%H:%M:%S)] ERROR: Could not find or install Chrome/Chromium" >&2
    exit 75
fi

echo "[$(date +%H:%M:%S)] Using browser: $CHROME_BIN"

# Function to capture screenshot
capture_screenshot() {
    local url="$1"
    local output="$2"
    local width="$3"
    local height="$4"
    local device_scale_factor="$5"
    local user_agent="$6"
    
    local cmd=(
        "$CHROME_BIN"
        --headless=new
        --disable-gpu
        --no-sandbox
        --disable-dev-shm-usage
        --virtual-time-budget=10000
        --run-all-compositor-stages-before-draw
        --force-device-scale-factor="$device_scale_factor"
        --window-size="${width},${height}"
        --screenshot="$output"
        --user-agent="$user_agent"
        "$url"
    )
    
    echo "[$(date +%H:%M:%S)] Capturing ${width}x${height} -> $output"
    if ! "${cmd[@]}" 2>&1; then
        echo "[$(date +%H:%M:%S)] ERROR: Failed to capture screenshot" >&2
        return 75
    fi
    
    if [[ ! -f "$output" ]] || [[ ! -s "$output" ]]; then
        echo "[$(date +%H:%M:%S)] ERROR: Screenshot file not created or empty" >&2
        return 75
    fi
    
    echo "[$(date +%H:%M:%S)] Screenshot saved: $output ($(wc -c < "$output") bytes)"
    return 0
}

# Capture desktop view (1920x1080)
desktop_start=$(date +%s.%N)
if ! capture_screenshot \
    "$CAPTURE_URL" \
    "$CAPTURE_DIR/final-desktop.png" \
    1920 1080 \
    1 \
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"; then
    exit_code=$?
    if [[ $exit_code -eq 75 ]]; then
        exit 75
    fi
    exit 1
fi
desktop_end=$(date +%s.%N)
desktop_duration=$(echo "$desktop_end - $desktop_start" | bc)
echo "[$(date +%H:%M:%S)] Desktop capture took ${desktop_duration}s"

# Capture mobile view (390x844 - iPhone 12/13/14 Pro)
mobile_start=$(date +%s.%N)
if ! capture_screenshot \
    "$CAPTURE_URL" \
    "$CAPTURE_DIR/final-mobile.png" \
    390 844 \
    3 \
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"; then
    exit_code=$?
    if [[ $exit_code -eq 75 ]]; then
        exit 75
    fi
    exit 1
fi
mobile_end=$(date +%s.%N)
mobile_duration=$(echo "$mobile_end - $mobile_start" | bc)
echo "[$(date +%H:%M:%S)] Mobile capture took ${mobile_duration}s"

end_time=$(date +%s.%N)
total_duration=$(echo "$end_time - $start_time" | bc)
echo "[$(date +%H:%M:%S)] Total capture completed in ${total_duration}s"

# Verify both screenshots exist
if [[ ! -f "$CAPTURE_DIR/final-desktop.png" ]] || [[ ! -f "$CAPTURE_DIR/final-mobile.png" ]]; then
    echo "[$(date +%H:%M:%S)] ERROR: One or both screenshots missing" >&2
    exit 1
fi

echo "[$(date +%H:%M:%S)] Capture successful!"
echo "  Desktop: $CAPTURE_DIR/final-desktop.png"
echo "  Mobile:  $CAPTURE_DIR/final-mobile.png"