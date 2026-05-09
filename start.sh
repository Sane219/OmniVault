#!/bin/bash
set -e

echo "==> Starting OmniVault..."

# Start the Hatchet AI worker in the background
echo "==> Starting AI worker (background)..."
cd /app/apps/worker-ai
uv run python -m worker_ai.main &
WORKER_PID=$!
echo "    Worker PID: $WORKER_PID"

# Start the Robyn API in the foreground on the HF Spaces port
echo "==> Starting Robyn API on port 7860..."
cd /app/apps/api-core
HOST="0.0.0.0" PORT=7860 uv run python -m api_core.main
