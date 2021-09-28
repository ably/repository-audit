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

    github-app-private-key.pem

This tool also requires the following to be available in the process' environment:

- **`GITHUB_APP_ID`**: Number. The 'App ID' available under 'About' in 'General' settings for the GitHub App.
- **`GITHUB_APP_CLIENT_ID`**: String. The 'Client ID' available under 'About' in 'General' settings for the GitHub App.
- **`GITHUB_APP_CLIENT_SECRET`**: String. A 'Client secret' generated under 'Client secrets' in 'General' settings for the GitHub App.
- **`GITHUB_APP_INSTALLATION_ID`**: Number. The `installation_id` for the GitHub App within the `ably` org, available in the browser's address bar (end of URL with prefix `https://github.com/organizations/ably/settings/installations/`) if you click 'Configure' under 'Installed GitHub Apps` in org settings.

## Miscellaneous Notes

### Environment Variable and Secret Names

To make this codebase more navigable we've conformed naming of secrets in the three locations you'll find them, that is:

1. As secrets configured via GitHub's Web UI
2. As environment variables fed into the Node.js process at runtime
3. In the source code, populated from `process.env`

The naming of these secrets, in particular the need to avoid the `GITHUB_` prefix, is constrained by factors which can be found in the GitHub Actions documentation:

- [Security Guides: Encrypted secrets: Naming your secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#naming-your-secrets):
- [Learn GitHub Actions: Environment variables: Default environment variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables)

### Deploy Key for Downstream Repository

The [run workflow](.github/workflows/run.yml) publishes updates to the report as a Git commit to the downstream repository
[ably/repository-audit-report](https://github.com/ably/repository-audit-report)
(private, only visible to teams within the `ably` org).

In order to do this it uses the `ABLY_REPOSITORY_AUDIT_REPORT_SSH_KEY` secret.

Creation and installation of a deploy key involves the following steps:

#### 1. Generate the key pair

Using `ssh-keygen` on your local machine - e.g.:

    ssh-keygen -t ed25519 -C "ably-repository-audit[bot]@noreply.ably.com"

Contrary to the instructions in
[GitHub's server-configuration-oriented documentation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent#generating-a-new-ssh-key),
leave the passphrase empty.

For this illustration, given there were no existing Ed25519 key pairs in my `.ssh` folder, I accepted the default file location to save the key.

#### 2. Install public key

Copy file contents to clipboard:

    cat ~/.ssh/id_ed25519.pub| pbcopy

Navigate to the downstream repository's 'Deploy keys' in 'Settings'
([here](https://github.com/ably/repository-audit-report/settings/keys))
and click 'Add deploy key'.

Paste your clipboard contents into 'Key'.

Enter something logical for 'Title' - e.g.: `repository-audit publish key`

#### 3. Install private key

Copy file contents to clipboard:

    cat ~/.ssh/id_ed25519| pbcopy

Navigate to this repository's 'Secrets' for 'Actions' in 'Settings'
([here](https://github.com/ably/repository-audit/settings/secrets/actions))
and click 'New repository secret'.

Paste your clipboard contents into 'Value'.

Provide the name expected by the workflow into 'Name' - i.e.: `ABLY_REPOSITORY_AUDIT_REPORT_SSH_KEY`

#### 4. Cleanup locally

Delete the key pair from your local workstation:

```
rm ~/.ssh/id_ed25519
rm ~/.ssh/id_ed25519.pub
```
