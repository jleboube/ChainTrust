#!/usr/bin/env bash
# Production/setup helper for ChainTrust
# Usage: ./scripts/prod-setup.sh [mode]
# mode: local  -> start a local hardhat node, deploy to localhost, build and docker-compose up
#       prod   -> compile, deploy to target network (requires PRIVATE_KEY + RPC envs), build and docker-compose up

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

MODE="local"
if [ $# -ge 1 ]; then MODE="$1"; fi

echo "[chaintrust] Running prod-setup in mode: $MODE"

command_exists() { command -v "$1" >/dev/null 2>&1; }

if ! command_exists node || ! command_exists npm; then
  echo "Node/npm not found. Please install Node 16+ on the VM and re-run." >&2
  exit 1
fi

if ! command_exists docker; then
  echo "Docker not found. Please install Docker on the VM." >&2
fi

# Ensure .env exists
if [ ! -f .env ]; then
  if [ -f env.example ]; then
    echo "Creating .env from env.example - edit secrets before running in production"
    cp env.example .env
  else
    echo "No .env or env.example found. Create a .env file with required environment variables." >&2
    exit 1
  fi
fi

echo "[chaintrust] Installing root dependencies (production)..."
npm ci

echo "[chaintrust] Compiling smart contracts (hardhat)..."
npx hardhat compile

if [ "$MODE" = "local" ]; then
  echo "[chaintrust] Starting local Hardhat node (background)..."
  # Start hardhat node in background and capture PID
  nohup npx hardhat node > hardhat.node.log 2>&1 &
  HARDHAT_PID=$!
  echo "[chaintrust] Hardhat node PID: $HARDHAT_PID (logs: hardhat.node.log)"

  echo "[chaintrust] Deploying contracts to localhost..."
  npx hardhat run scripts/deploy.js --network localhost
else
  echo "[chaintrust] Deploying contracts to production network (requires PRIVATE_KEY + RPC envs)"
  if [ -z "${PRIVATE_KEY:-}" ]; then
    echo "PRIVATE_KEY not set in environment. Aborting production deploy." >&2
    exit 1
  fi
  npx hardhat run scripts/deploy.js --network ${DEPLOY_NETWORK:-polygonMumbai}
fi

echo "[chaintrust] Ensuring artifacts and deployed-addresses.json exist..."
if [ ! -d artifacts ] || [ ! -f deployed-addresses.json ]; then
  echo "Warning: artifacts/ or deployed-addresses.json missing. Ensure contracts compiled and deploy script produced deployed-addresses.json" >&2
fi

echo "[chaintrust] Creating uploads directory and basic folders"
mkdir -p uploads nginx/logs nginx/ssl
touch nginx/logs/.gitkeep nginx/ssl/.gitkeep

echo "[chaintrust] Building frontend (Next.js)"
cd frontend
npm ci
npm run build
cd ..

echo "[chaintrust] Creating minimal backend/package.json if missing (to satisfy Dockerfile COPY)"
if [ ! -f backend/package.json ]; then
  cat > backend/package.json <<'JSON'
{
  "name": "chaintrust-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node backend/server.js"
  }
}
JSON
fi

echo "[chaintrust] Creating minimal database init script if missing"
if [ ! -f database/init.sql ]; then
  mkdir -p database
  cat > database/init.sql <<'SQL'
-- initial schema placeholder for ChainTrust
-- Postgres will create the database using docker-compose env vars; add schema SQL here if needed
CREATE TABLE IF NOT EXISTS migrations (
  id serial PRIMARY KEY,
  name text NOT NULL,
  applied_at timestamptz DEFAULT now()
);
SQL
fi

echo "[chaintrust] Creating nginx config if missing"
if [ ! -f nginx/nginx.conf ]; then
  mkdir -p nginx
  cat > nginx/nginx.conf <<'NGINX'
user  nginx;
worker_processes  1;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events { worker_connections  1024; }

http {
  include       mime.types;
  default_type  application/octet-stream;
  sendfile        on;
  keepalive_timeout  65;

  upstream frontend_up { server frontend:3000; }
  upstream backend_up  { server backend:3001; }

  server {
    listen 80;
    server_name _;

    location /api/ {
      proxy_pass http://backend_up/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
      proxy_pass http://frontend_up/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
  }
}
NGINX
fi

echo "[chaintrust] Bringing up services with docker compose (build + detach)"
if command_exists docker && command_exists docker-compose; then
  docker-compose up -d --build
elif command_exists docker && docker compose version >/dev/null 2>&1; then
  docker compose up -d --build
else
  echo "Docker Compose not available - skip docker bringup. You can run 'docker compose up -d --build' on the VM." >&2
fi

echo "[chaintrust] Setup script finished. Check services with 'docker compose ps' or view logs with 'docker compose logs -f backend'"

if [ "$MODE" = "local" ]; then
  echo "Local mode: Hardhat node is running in background (PID: $HARDHAT_PID). To stop it: kill $HARDHAT_PID" || true
fi

echo "Done."
