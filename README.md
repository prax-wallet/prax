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

###  Packages

- context
- eslint-config
- tailwind-config
- tsconfig
- ui

## Documentation

General documentation is available in [docs/README.md](docs/README.md). Package-specific documentation is available in
each respective package.

## Getting Started

### Prerequisites

- [Install Rust and Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html) (probably with rustup)
- [Install Wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- Install [cargo-watch](https://crates.io/crates/cargo-watch): `cargo install cargo-watch`
- [Install Node.js](https://nodejs.org/en/download/package-manager) however you like (at least version 20)
- [Install pnpm](https://pnpm.io/installation) (probably via corepack)
- Install Google Chrome

### Building

Once you have all these tools, you can

```sh
git clone https://github.com/prax-wallet/web
cd web
pnpm i
pnpm dev
```

You now have a local copy of the marketing site available at
[`https://localhost:5175`](https://localhost:5173) and an unbundled Prax is
available at [`apps/extension/dist`](apps/extension/dist), ready to be loaded
into your browser.

If you're working on Prax, Chrome will show extension page changes after a
manual refresh, but cannot reload the extension worker scripts or content
scripts. For worker script changes, you must manually reload the extension. For
content script changes, you must also manually reload pages hosting the injected
scripts.

#### Loading your unbundled build of Prax into Chrome

After building Prax, you can load it into Chrome.

It's recommended to use a dedicated browser profile for development, not your
personal profile.

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
