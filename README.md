# Penumbra Web

The [Prax Wallet](https://praxwallet.com/) monorepo for all things Prax.

![ci status](https://github.com/prax-wallet/web/actions/workflows/turbo-ci.yml/badge.svg?branch=main)

This is a monolithic repository of Prax code, a monorepo. Multiple apps and packages are developed in this repository, to
simplify work and make broad cross-package changes more feasible.

Install the Prax extension
[Prax](https://chrome.google.com/webstore/detail/penumbra-wallet/lkpmkhpnhknhmibgnmmhdhgdilepfghe)
from the Chrome Web Store.

You can talk to us on [Discord](https://discord.gg/hKvkrqa3zC).

## What's in here

### [Prax Extension](https://chrome.google.com/webstore/detail/penumbra-wallet/lkpmkhpnhknhmibgnmmhdhgdilepfghe): Extension for Chrome that provides key custody, manages chain activity, and hosts services used by dapps.

### [Prax Marketing Site](https://praxwallet.com/): Marketing site for the Prax wallet

## Documentation

General documentation is available in [docs/README.md](docs/README.md). Package-specific documentation is available in
each respective package.

## Getting Started

### Prerequisites

- [Install Node.js](https://nodejs.org/en/download/package-manager) version 22 or greater
- [Install pnpm](https://pnpm.io/installation) (probably via corepack)
- Install Google Chrome (Chromium works but we have encountered behavioral differences)

### Building

Once you have all these tools, you can

```sh
git clone https://github.com/prax-wallet/web
cd web
pnpm i
CHROMIUM_PROFILE=chromium-profile pnpm dev
```

The env var `CHROMIUM_PROFILE` is optional. You may simply execute `pnpm dev`,
or set the var to any path. Presence of a path will create and launch a
dedicated browser profile with the extension. The directory 'chromium-profile'
is gitignored.

`CHROMIUM_PROFILE` names 'Chromium' but will launch Google Chrome if installed.
If you want to use a specific binary, you may need to specify a path with the
var `CHROME_PATH`.

You now have a local copy of the marketing site available at
[`https://localhost:5175`](https://localhost:5173) and an unbundled Prax is
available at [`apps/extension/dist`](apps/extension/dist).

If you're working on Prax, Chrome will show extension page changes after a
manual page refresh, but it cannot simply reload the extension worker scripts or
content scripts. For worker script changes, you may need to manually reload the
extension. For content script changes, you must also manually reload pages
hosting the injected scripts.

#### Manually loading your unbundled build of Prax into Chrome

If you don't want to use the profile tool, you must manually load the extension.

1. Go to the Extensions page [`chrome://extensions`](chrome://extensions)
2. Enable _Developer Mode_ by clicking the toggle switch at the top right
3. Click the button _Load unpacked extension_ at the top and locate your cloned
   repository. Select the extension's build output directory
   [`apps/extension/dist`](../apps/extension/dist).
4. Activate the extension to enter onboarding.
   - You may set a blank password.
   - You can pin the Prax extension button to your toolbar for quick access.

#### Using local tarball packages

If you're working on packages in another repository that you'd like to include
in your development cycle, tooling exists here to support use of local `*.tgz`
packages with `pnpm dev` for a fast watch-edit-rebuild cycle

```sh
pnpm add:tgz ../path/to/somewhere/specific.tgz ../path/to/some/repo/packages/*/some-filename-*.tgz`
```

Your other workspace is responsible for rebuilding and repacking the tarballs.

This script also handles peer dependency conflict issues that can arise from use
of local tarball packages.

## Security

If you believe you've found a security-related issue with Penumbra,
please disclose responsibly by contacting the Penumbra Labs team at
security@penumbralabs.xyz.
