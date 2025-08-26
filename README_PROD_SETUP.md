ChainTrust production/dev setup helper
===================================

Purpose
-------
This document explains `scripts/prod-setup.sh` which automates the most common steps required to get ChainTrust running on a remote VM.

Usage
-----
1. Copy `.env` to the VM (do not commit secrets). You can start from `env.example`.
2. On the VM run:

```bash
# local mode: start hardhat node, deploy locally, build and bring up docker
./scripts/prod-setup.sh local

# production deploy: compile and deploy to network set via DEPLOY_NETWORK env
./scripts/prod-setup.sh prod
```

What the script does
- Ensures `.env` exists (copies from `env.example` if missing).
- Installs dependencies and compiles contracts (`npx hardhat compile`).
- Optionally starts a local Hardhat node and runs `scripts/deploy.js` to produce `deployed-addresses.json`.
- Builds the Next.js frontend.
- Creates minimal missing files (backend/package.json, database/init.sql, nginx/nginx.conf) if absent to satisfy Docker build.
- Runs `docker compose up -d --build` when Docker Compose is available.

Database migrations
-------------------
The backend includes a lightweight migrations runner located at `backend/migrations/run_migrations.js`.
Run migrations locally with:

```bash
# uses DATABASE_URL from your environment
node backend/migrations/run_migrations.js
```

The Docker container will also attempt to run migrations at startup.

Notes
-----
- Keep private keys and secrets out of Git. Use Docker secrets or environment config on the VM.
- The script will create placeholder files (DB init, nginx config) which you should replace with production-grade equivalents before going live.
