---
name: Deployment
about: Use this template when you're going to deploy a new release of the extension and web app.
title: Publish vX.X.X extension + web app
labels: deployment
---

## User flows to test

Manual testing to confirm extension works with all flows. Can use mainnet rpc or [testnet](https://testnet.plinfra.net/). Can request testnet tokens from team members.

- Prax UI

  - Fresh wallet onboarding
    - [ ] Create new wallet (block sync should be must faster)
      - [ ] Wallet birthday generates
      - [ ] Can select 12 vs 24 words
      - [ ] Seed phrase validation
    - [ ] Import seed phrase (12 or 24 words)
      - [ ] Block height empty
      - [ ] Block height selected
    - [ ] Password selection & validation
    - [ ] Rpc selection & custom entry
    - [ ] Frontend selection & custom entry
    - [ ] Numeraires selection
  - Popup home
    - [ ] Account selection arrows
      - [ ] Copy icon works
    - [ ] IBC deposit address generation
    - [ ] Validate addresses
      - [ ] Invalid address
      - [ ] Owned IBC deposit address
      - [ ] Owned Normal address
      - [ ] Unowned normal address
    - [ ] Manage Portfolio button goes to selected frontend url
    - [ ] Top-right chain id links to node status page
    - [ ] Test sync can complete within an expected/reasonable amount of time
    - [ ] Disable wifi on computer and re-enable. See if syncing continues without issues.
  - Settings
    - [ ] Seed phrase recovery flow
    - [ ] Change RPC & re-sync
    - [ ] Change default frontend
    - Connected sites
      - [ ] Connect to minifront. See if approved in settings. Remove approved site and confirm connect popup is triggered again.
      - [ ] Attempt connection with minifront and click "ignore". See if "ignored" in settings. Remove and confirm re-connect works.
      - [ ] Attempt connection with minifront and click "deny". See if "denied" in settings. Remove and confirm re-connect works.
    - Price denomination
      - [ ] Confirm able to select/deselect
    - Advanced
      - [ ] Confirm can clear cache of sync
    - Lock wallet
      - [ ] Confirm requires to re-enter password when popup clicked again
  - Lock screen
    - [ ] Entering correct password grants entry
    - [ ] Entering incorrect password denies entry and gives warning
    - [ ] Forgot password flow allows to reset wallet state
    - [ ] Penumbra support link correctly links to discord
  - [ ] Previous wallet version upgrade. Ways to test:
    - In dev env, have previous version loaded (via `load unpacked`) and click `window -> extensions -> update` after re-building new code.
    - Download crx or zip and drag into extensions chrome window with previous version installed
  - For developer:
    - [ ] Test sync with [assertRootValid()](https://github.com/prax-wallet/web/blob/main/docs/debugging.md) enabled. Will throw if TCT roots are not correct. Only test the first few dozen blocks; if those succeed, there's no need to keep going.

- Minifront UI
  - Initial visit
    - [ ] Asks to install (and correctly links to chrome store) if Prax is not installed
    - [ ] Asks to connect if installed and not connected. Can successfully connect.
    - [ ] After connecting, can disconnect by hovering Prax logo in top right and clicking "Disconnect"
  - Assets page
    - Assets tab
      - [ ] Balances show as expected (amounts, account grouping)
    - Transactions tab
      - [ ] Click into various transactions and ensure there are no errors with displaying details
      - [ ] When clicking a specific transaction, ensure Private vs Public view toggle works
  - Shield funds
    - Ibc-in
      - [ ] Able to connect to Keplr and Leap wallet
      - [ ] Can connect to all networks in drop down
      - [ ] Displays address correctly
      - [ ] Accurately displays balances on those chains
      - [ ] Can select assets in balance. Gives warning if selecting too much.
      - [ ] Can select penumbra account # to transfer to
      - [ ] Successfully shields asset and success toast links to Mintscan. Balance shows up in Assets page.
    - Ibc-out
      - [ ] Able to select UM on all chains
      - [ ] Able to select native counterparty assets to transfer back to home chains
      - [ ] Address validation works correctly on all chains
      - [ ] Able to perform withdraw of USDC to noble (and confirm arrived)
      - [ ] Able to perform withdraw of UM to Osmosis (and confirm arrived)
      - [ ] Able to perform withdraw of tokens to other chains (and confirm arrived)
  - Send page
    - [ ] Can send funds from one account to another (test memo with tx)
    - [ ] Can send funds to foreign address
    - [ ] Low/Medium/High fee tiers work
    - [ ] With an account with no UM but with usdc, it will use usdc as the gas token. Try with osmo as well.
    - [ ] When attempting to send more than the balance, an error is shown in the UI
    - [ ] Recipient addresses are validated
    - [ ] Receive tab works just like Prax popup screen (account selector, ibc toggle, etc)
  - Swap page
    - [ ] Asset-in selector shows balances and account #'s correctly. Also shows other assets at the bottom.
    - [ ] Asset-out selector shows all assets
    - [ ] When attempting to swap more than the balance, an error is shown in the UI
    - [ ] Price history displayed for asset pair
    - Instant swap
      - [ ] Can estimate a swap
      - [ ] Can perform a swap + swap claim
      - [ ] Claim an unclaimed swap
        - How to: after swap is successful, reload the browser. It will show unclaimed swaps section.
    - Dutch auction
      - [ ] Can select different durations
      - [ ] Can estimate Max/Min w/ button
      - [ ] Can initiate auctions
        - [ ] "My Auctions" section shows auctions that are expandable on click
        - [ ] Auctions can be individually ended
        - [ ] Auctions can be individually withdrawn
        - [ ] Auctions can be batch ended
        - [ ] Auctions can be batch withdrawn
        - [ ] Successful auctions have a checkmark, unfilled auctions do not
  - Stake page
    - [ ] Available to delegate shows UM balance
    - [ ] Can view multiple accounts (using arrows)
    - [ ] Validators ranked by voting power
    - [ ] Can delegate successfully
    - [ ] Can undelegate successfully (Unbonding amount reflected at the top)

## For release manager:

### Prep release

- [ ] Update [manifest](https://github.com/prax-wallet/web/blob/main/apps/extension/public/manifest.json#L4) and [package.json](https://github.com/prax-wallet/web/blob/main/apps/extension/package.json) versions. General guidelines:
  - **Major** version bump: new features that are significant in impact and often come with major architecture changes. Also for changes that cannot be reverted in a downgrade due to breaking changes (e.g. db schema or version changes).
  - **Minor** version bump: new forward-compatible feature, can be reverted if needed cleanly.
  - **Patch** version bump: bug fixes or small adjustments.
- [ ] [Create repo release](https://github.com/prax-wallet/web/releases/new) with `vX.X.X` tag. Triggers approval to run chrome extension publishing.
- [ ] Go into [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
  - Submit BETA version for approval + immediate publishing
  - Submit PROD version for approval (without publishing)

### Release

- [ ] Wait 1-3 days until new extensions have been approved. Inform BETA testers to test it out. If all is well, publish PROD version which makes it is live on [chrome web store](https://chromewebstore.google.com/detail/penumbra-wallet/lkpmkhpnhknhmibgnmmhdhgdilepfghe)
- [ ] Work with comms team for relevant discord announcements and social posts for new features we want to amplify
