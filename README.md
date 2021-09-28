# Ably SDK Team Repository Audit

[![.github/workflows/check.yml](https://github.com/ably/repository-audit/actions/workflows/check.yml/badge.svg)](https://github.com/ably/repository-audit/actions/workflows/check.yml)

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

    app-private-key.pem

This tool also requires the following to be available in the process' environment:

- **`APP_ID`**: Number. The 'App ID' available under 'About' in 'General' settings for the GitHub App.
- **`APP_CLIENT_ID`**: String. The 'Client ID' available under 'About' in 'General' settings for the GitHub App.
- **`APP_CLIENT_SECRET`**: String. A 'Client secret' generated under 'Client secrets' in 'General' settings for the GitHub App.
- **`APP_INSTALLATION_ID_ABLY`**: Number. The `installation_id` for the GitHub App within the `ably` org, available in the browser's address bar (end of URL with prefix `https://github.com/organizations/ably/settings/installations/`) if you click 'Configure' under 'Installed GitHub Apps` in org settings.

## Miscellaneous Notes

### Environment Variable and Secret Names

To make this codebase more navigable we've conformed naming of secrets in the three locations you'll find them, that is:

1. As secrets configured via GitHub's Web UI
2. As environment variables fed into the Node.js process at runtime
3. In the source code, populated from `process.env`

The naming of these secrets, in particular the need to avoid the `GITHUB_` prefix, is constrained by factors which can be found in the GitHub Actions documentation:

- [Security Guides: Encrypted secrets: Naming your secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#naming-your-secrets):
- [Learn GitHub Actions: Environment variables: Default environment variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables)
