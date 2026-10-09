#!/usr/bin/env bash
# Run the Maestro E2E flows on a visible iOS Simulator, against the API in mock mode.
#   pnpm e2e:ios            # build the app (first run takes a few minutes), then run all flows
#   pnpm e2e:ios --no-build # reuse the installed app
#   pnpm e2e:studio         # Maestro Studio: inspect elements and click through flows by hand
# Needs Xcode (App Store), CocoaPods (bundled with Xcode's Ruby or `brew install cocoapods`), and Maestro.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"

command -v xcrun >/dev/null || { echo "Xcode is required: install it from the App Store, then run: sudo xcode-select -s /Applications/Xcode.app"; exit 1; }
command -v maestro >/dev/null || { echo "Maestro is required: curl -fsSL https://get.maestro.mobile.dev | bash"; exit 1; }

# 1. API in mock mode (reuse one that's already running).
if ! curl -fsS localhost:8000/health >/dev/null 2>&1; then
  echo "▶ starting API (mock provider) on :8000"
  (cd "$ROOT/apps/api" && LLM_PROVIDER=mock RATE_LIMIT=10000/minute uv run uvicorn app.main:app --port 8000 >/tmp/pocket-chat-api.log 2>&1 &)
  for _ in $(seq 1 30); do curl -fsS localhost:8000/health >/dev/null 2>&1 && break; sleep 1; done
fi

# 2. Boot a simulator and bring the Simulator window to the front so you can watch.
UDID=$(xcrun simctl list devices booted -j | python3 -c "import sys,json; print(next((d['udid'] for ds in json.load(sys.stdin)['devices'].values() for d in ds), ''))")
if [ -z "$UDID" ]; then
  UDID=$(xcrun simctl list devices available -j | python3 -c "import sys,json; d=json.load(sys.stdin)['devices']; print(next(x['udid'] for r,ds in sorted(d.items(), reverse=True) if 'iOS' in r for x in ds if x['name'].startswith('iPhone')))")
  xcrun simctl boot "$UDID"
fi
open -a Simulator
xcrun simctl bootstatus "$UDID" -b >/dev/null

# 3. Build and install a Release app that talks to the local API.
if [ "${1:-}" != "--no-build" ]; then
  echo "▶ building app (Release, server backend)"
  cd "$MOBILE"
  EXPO_PUBLIC_DEFAULT_BACKEND=server EXPO_PUBLIC_API_URL=http://localhost:8000 \
    npx expo run:ios --configuration Release --device "$UDID" --no-bundler
fi

# 4. Run the flows. Watch the Simulator window; recordings land in apps/mobile/.maestro/output.
cd "$MOBILE"
maestro --device "$UDID" test .maestro --test-output-dir .maestro/output
echo "✔ done. Videos and screenshots: apps/mobile/.maestro/output"
