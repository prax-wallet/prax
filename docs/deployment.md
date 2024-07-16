# Deployment Workflows

### Prax Chrome Extension

Create a [github issue deployment issue](https://github.com/penumbra-zone/web/issues/new?template=deployment.md&title=Publish+vX.X.X+extension+%2B+web+app) to track deployment progress and steps.

Upon a new [git tag](https://github.com/penumbra-zone/web/releases/tag/v4.2.0) being pushed to the repo,
a [workflow](../.github/workflows/extension-publish.yml) is kicked off. It then requests permission to
continue from [github group](https://github.com/orgs/penumbra-zone/teams/penumbra-labs) and, after approval,
bundles the extension into a .zip which gets put in the Chrome Webstore review queue. It typically takes
1-3 days to go live. The publication status can be monitored in the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/aabc0949-93db-4e77-ad9f-e6ca1d132501?hl=en).

### Web app

Manually run [Deploy Firebase Dapp](https://github.com/penumbra-zone/web/actions/workflows/deploy-firebase-dapp.yml) github action on main branch.
