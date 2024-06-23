#!/bin/bash

# Check if `PENUMBRA_ZONE_WEB_PATH` is set and points to a valid directory
if [ -z "$PENUMBRA_ZONE_WEB_PATH" ] || [ ! -d "$PENUMBRA_ZONE_WEB_PATH" ]; then
  PENUMBRA_ZONE_WEB_PATH="../../web"
fi

# Check if `PRAX_REPO_PATH` is set and points to a valid directory
if [ -z "$PRAX_REPO_PATH" ] || [ ! -d "$PRAX_REPO_PATH" ]; then
  PRAX_REPO_PATH="."
fi

# Repack the packages in `penumbra-zone/web`
repack() {
  (cd "$PENUMBRA_ZONE_WEB_PATH" && ./pack-public.sh)
}

# Install dependencies in `prax-wallet/web`
install_prax() {
  (cd "$PRAX_REPO_PATH" && pnpm add -w $PENUMBRA_ZONE_WEB_PATH/packages/*/penumbra-zone-*-*.tgz)
}

# Reload webpack
reload_webpack() {
  (cd "$PRAX_REPO_PATH" && pkill -f "webpack-prax-dev-server")
  (cd "$PRAX_REPO_PATH" && pnpm run dev &)
}

# Watch for changes in `penumbra-zone/web` and trigger repack and reload
while true; do
  fswatch -1 -o "$PENUMBRA_ZONE_WEB_PATH/packages" | while read -r; do
    repack
    install_prax
    reload_webpack
    break
  done
done