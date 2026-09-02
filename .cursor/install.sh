#!/usr/bin/env bash
# Cloud Agent install phase: durable, idempotent repository setup.
# Installs system + Node dependencies and generates the Prisma client.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# --- System dependency: local PostgreSQL server (app database) ---
# Baked into the environment snapshot; reinstall only if missing so the
# config also works on a fresh build without the snapshot.
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "[install] Installing PostgreSQL..."
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib
fi

# --- Node dependencies ---
echo "[install] Installing Node dependencies (npm ci)..."
npm ci

# --- Prisma client ---
echo "[install] Generating Prisma client..."
npx prisma generate

echo "[install] Done."
