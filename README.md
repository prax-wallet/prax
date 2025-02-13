# Prax Wallet

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

#### Building against feature branches

When testing Prax locally, you may want to depend on as-yet unreleased
software changes, e.g. in the [web repo]. To do so:

1. In the [web repo], run `pnpm install && pnpm build && pnpm dev:pack`
2. In the [web repo], run `pnpm dev` (in a separate terminal)
3. In the [prax repo], run `pnpm -w add:tgz ~/PATH_TO_WEB_REPO/web/packages/*/penumbra-zone-*.tgz && pnpm -w syncpack fix-mismatches && pnpm dev`

Provided you configured `CHROMIUM_PROFILE`, you should see a browser launch,
running the local builds. You must also ensure that the desired feature branches
are checked out in the local git repos.

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

## Security

If you believe you've found a security-related issue with Penumbra,
please disclose responsibly by contacting the Penumbra Labs team at
security@penumbralabs.xyz.

[web repo]: https://github.com/penumbra-zone/web
[prax repo]: https://github.com/prax-wallet/prax
