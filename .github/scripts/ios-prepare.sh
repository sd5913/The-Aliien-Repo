#!/usr/bin/env bash
set -euo pipefail

for setting in VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_PUBLIC_APP_ORIGIN; do
  if [[ -z "${!setting:-}" ]]; then
    echo "::error::Missing iOS build configuration: $setting"
    exit 1
  fi
done

# Build and resolve dependencies before any Apple credentials enter the job.
npm ci --ignore-scripts
npm run ios:sync

packages="$RUNNER_TEMP/bothpls-spm"
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App \
  -clonedSourcePackagesDirPath "$packages"
# Capacitor Swift PM 8.6.2. Update the revision when upgrading Capacitor.
test "$(git -C "$packages/checkouts/capacitor-swift-pm" rev-parse HEAD)" = \
  b945758eaf3f034cea377e3138a60611cb40a88b
