# Ably SDK Team Repository Audit

## Overview

Audit. Monitor. Conform.

This tool is being designed by the SDK Team at Ably to provide oversight of our repositories,
those public in our [`ably` org](https://github.com/ably/), and beyond.

It is partnered with the
[Ably SDK Team Repository Audit](https://github.com/organizations/ably/settings/apps/ably-sdk-team-repository-audit)
GitHub App, where this tool authenticates as that app in order to do its work.

## Runtime Requirements

This tool needs a private key for the GitHub App in order to sign access token requests.
That private key is created and downloaded, in PEM format, from the 'Private keys' area with the app's 'General' settings.
This tool expects that file to be at:

    github-app-private-key.pem

This tool also requires the following to be available in the process' environment:

- **`GITHUB_APP_ID`**: Number. The 'App ID' available under 'About' in 'General' settings for the GitHub App.
- **`GITHUB_APP_CLIENT_ID`**: String. The 'Client ID' available under 'About' in 'General' settings for the GitHub App.
- **`GITHUB_APP_CLIENT_SECRET`**: String. A 'Client secret' generated under 'Client secrets' in 'General' settings for the GitHub App.
- **`GITHUB_APP_INSTALLATION_ID`**: Number. The `installation_id` for the GitHub App within the `ably` org, available in the browser's address bar (end of URL with prefix `https://github.com/organizations/ably/settings/installations/`) if you click 'Configure' under 'Installed GitHub Apps` in org settings.

## Troubleshooting Runtime Issues

### HttpError: Not Found

For example:

```
(node:94958) UnhandledPromiseRejectionWarning: HttpError: Not Found
    at /Users/quintinwillison/code/ably/repository-audit/node_modules/@octokit/request/dist-node/index.js:86:21
    at processTicksAndRejections (internal/process/task_queues.js:95:5)
    at async getInstallationAuthentication (/Users/quintinwillison/code/ably/repository-audit/node_modules/@octokit/auth-app/dist-node/index.js:280:7)
    at async /Users/quintinwillison/code/ably/repository-audit/index.js:28:38
```

Encountered when the `installationId` (a.k.a. `installation_id`) passed to [the `auth` function](https://github.com/octokit/auth-app.js#authenticate-as-installation) was incorrect.
It seems Octokit isn't super friendly when things are out of place (see
[this issue](https://github.com/octokit/auth-app.js/issues/184)),
so this same runtime error may well come up when any of the fields (identifiers, keys / secrets) are incorrect.
