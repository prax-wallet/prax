#!/bin/bash

# Relative paths to the web repositories
PENUMBRA_ZONE_WEB_PATH="../../web"
PRAX_REPO_PATH="."

# Repack the packages in penumbra-zone/web
repack() {
  (cd "$PENUMBRA_ZONE_WEB_PATH" && ./pack-public.sh)
}

# Install dependencies in prax-wallet/web
install_prax() {
  (cd "$PRAX_REPO_PATH" && pnpm add -w ../../web/packages/*/penumbra-zone-*-*.tgz)
}

# Reload webpack
reload_webpack() {
  pkill -f "pnpm run dev" # Stop any existing webpack dev server
  (cd "$PRAX_REPO_PATH" && pnpm run dev &)
}

# Watch for changes in penumbra-zone/web and trigger repack and reload
while true; do
  fswatch -1 -o "$PENUMBRA_ZONE_WEB_PATH/packages" | while read -r; do
    repack
    install_prax
    reload_webpack
    break
  done
done