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
