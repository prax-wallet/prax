# Custody

Onboarding generates or imports a seed phrase, then prompts the user to create a password.

### Password

The user's password is keystretched via `PBKDF2` to improve entropy, deriving a `Key` and `KeyPrint`.
The `KeyPrint` is a salted digest of `Key`, and is stored persistently.

When the user unlocks Prax, the input password is used to re-derive a `Key` confirmed to match the `KeyPrint`.
A successfully derived `Key` is held in temporary session storage until the session ends.

### Wallet

The seed phrase is sealed by the `Key` into an encrypted `Box` container, which is stored persistently.
The actual `Box` is managed by the [`Wallet`](../packages/wallet/src/wallet.ts) class, with associated data.

When Prax needs to authorize activity, the `Box` is unsealed by the `Key` to reveal the seed phrase for further key derivation.

| Component                                             | Storage                                           | Purpose                     |
| ----------------------------------------------------- | ------------------------------------------------- | --------------------------- |
| [`Wallet`](../packages/wallet/src/wallet.ts)          | persistent `chrome.storage.local`                 | Contains `Box` and metadata |
| [`Box`](../packages/encryption/src/box.ts)            | persistent `chrome.storage.local` inside `Wallet` | Encrypted record            |
| [`KeyPrint`](../packages/encryption/src/key-print.ts) | persistent `chrome.storage.local`                 | Key record                  |
| [`Key`](../packages/encryption/src/key.ts)            | temporary `chrome.storage.session`                | Derived key                 |
