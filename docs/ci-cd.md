# CI/CD guide

### Run commands locally

The CI/CD enforces strict standards before a PR can be merged. It's helpful to run these locally
so you can iterate without pushing to github. Running these commands in the root
directory will recursively run them in each app/package. The essential commands:

- **pnpm install**: Make sure all deps are installed
- **pnpm format**: Use Prettier to format code according to repo's code styling config
- **pnpm lint**: Run ESLint for code syntax, quality, best practice checks
- **pnpm test**: Runs Vitest test suite (i.e. runs \*.test.ts files)
- **pnpm build**: Ensures apps can make production builds

### Github actions

All checks above will be run on opening a pull request and merging to main.
Main merges will also deploy dapp on Firebase. Workflows can be [seen here](../.github/workflows).

### On release

If a release is made in the repo, the extension code will be submitted for publishing
to the Chrome Web Store. See more in [publishing](./publishing.md).

### Creds for publishing

Publishing to the webstore requires three (3) credentials to be present in CI:

1. Google app oauth client_id
2. Google app oauth client_secret
3. Google app refresh_token

If an extension publishing job fails with an HTTP 429, it's likely either:

1. unreviewed drafts in the developer web ui, or
2. an expired "refresh token" being used in CI

If you need to update 2:

1. Follow this guide: https://github.com/fregante/chrome-webstore-upload-keys
2. Download JSON file with client_id and client_secret (constituting 2/3 of the creds you need)
3. `node cli.js` in that repo, follow the interactive tool
4. Edit the CI secrets in this repo with the new client_id, client_secret, and refresh_token values

Then rerun the failed publishing job, and confirm it passes.
