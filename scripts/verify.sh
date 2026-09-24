#!/usr/bin/env bash
# Pre-deploy checks. Usage: npm run verify            (types + unit tests)
#                           npm run verify -- --e2e   (also browser tests against staging)
set -uo pipefail
cd "$(dirname "$0")/.."

echo "▶ Type check (errors in *.test.ts files are pre-existing and ignored)"
tsc_errors=$(npx tsc --noEmit --pretty false 2>&1 | grep "error TS" | grep -v '\.test\.ts' || true)
if [ -n "$tsc_errors" ]; then echo "$tsc_errors"; echo "✗ type errors"; exit 1; fi

echo "▶ Unit tests"
npx vitest run || { echo "✗ unit tests failed"; exit 1; }

if [ "${1:-}" = "--e2e" ]; then
  echo "▶ Browser tests (staging)"
  npx playwright test || { echo "✗ browser tests failed — report: npx playwright show-report e2e/.report"; exit 1; }
fi
echo "✓ verify passed"
