# Ably Repository Audit

[![Check Workflow Status](https://github.com/ably/repository-audit/actions/workflows/check.yml/badge.svg)](https://github.com/ably/repository-audit/actions/workflows/check.yml)
[![Run Workflow Status](https://github.com/ably/repository-audit/actions/workflows/run.yml/badge.svg)](https://github.com/ably/repository-audit/actions/workflows/run.yml)

## Overview

Audit. Monitor. Conform.

This tool is being designed by the SDK Team at Ably to provide oversight of our repositories,
those public in our [`ably` org](https://github.com/ably/), and beyond.

It is partnered with the
['Ably Repository Audit' GitHub App](https://github.com/apps/ably-repository-audit),
where this tool authenticates as that app in order to do its work.

### Why?

Oversight. Monitoring.

While GitHub clearly understand that their users have a desire to gain a bird's eye view of activity across their organization(s)
(see [their September 2021 announcement of 'audit log streaming' entering public beta](https://github.blog/2021-09-16-audit-log-streaming-public-beta/)),
the reality is that with our current interfaces to GitHub (being `git` clients and their browser UI) we have limitations,
due to the manual nature of all these interactions:

- To check if a repository is configured correctly we need to navigate via the browser UI to its settings page
- To check if two repositories are configured the same then we need to load up two browser UIs side-by-side
- If a repository is used infrequently then its settings can drift out of sync with what we're tending to use elsewhere
- We often grant several people permission to change repository settings and these changes (deliberate or accidental) may not be spotted for some time
- There are things we care about but we need to care about them across hundreds of repositories, public and private, across multiple GitHub orgs

### What?

Essentially a [lint](https://en.wikipedia.org/wiki/Lint_(software)) tool for our repository configurations.
While this tool may examine repository _contents_ (a.k.a. source code) in time (for example, to check for presence of standard files),
we're focussing initially on settings which are available to most of us only via GitHub's browser UI.

#### Naming / Vocabulary

We care about others and have empathy for their views ('tech needs humanity' is [one of Ably's core values](https://ably.com/blog/ably-values)).
It's important that we make concerted efforts to remove non-inclusive terminology from our nomenclature.
This includes the branch names we use in our repositories, especially the default branch names, for both public and private repositories.

#### Consistency / Principle of Least Astonishment

Developers working with Ably (as maintainers or customers) should be able to, wherever idiomatically and logically possible,
seamlessly move from repository to repository with minimal friction. This means consistent:

- Use of labels for issues and pull requests ([#2](https://github.com/ably/repository-audit/issues/2))
- Appearance of 'Projects', 'Wikis' and 'Issues' tabs on repository home pages ([#11](https://github.com/ably/repository-audit/issues/11))
- Appearance of 'Releases', 'Packages' and 'Environments' sections in the side column on repository home pages ([#16](https://github.com/ably/repository-audit/issues/16))
- Presence and contents of `LICENSE` ([#26](https://github.com/ably/repository-audit/issues/26))
- Presence and contents of `COPYRIGHT`
- Presence and contents of `MAINTAINERS.md`
- Presence and broad layout of `README.md`

#### Guard Rails / Workflow

As a company Ably is very focussed on a 'written first' approach to the way that we approach our work.

An implicit principle of written first is that we aim to keep things [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself),
meaning that we would rather be able to point people towards a canonical location where process-oriented instructions live.
In other words, our response to a query about the way to do something should be along the lines of
'look over there, where this is documented'.

Extending this principle out - where it is possible for us to install guard rails that naturally, innately steer people onto the correct tracks - we don't have to explicitly write this down in plain English (because it's a switch or rule that was installed somewhere).
In which case, this tool is here to periodically check that those guard rails are consistently configured correctly.
For example:

- Allowed Behaviour of the Merge button ([#11](https://github.com/ably/repository-audit/issues/11))
- Branch protection rule for the default branch (typically `main`)

### How?

The questions that needed answering in order to bring this tool to life were:

1. **Who does it run as (the 'actor')?** As a [GitHub App](https://docs.github.com/en/developers/apps/getting-started-with-apps/about-apps#about-github-apps) (see [Runtime Requirements](#runtime-requirements)).
2. **Where does it run?** In GitHub-hosted runners (see [the run workflow](https://github.com/ably/repository-audit/blob/main/.github/workflows/run.yml)).
3. **How does it get triggered?** Automatically when code is pushed to this repository, periodically to keep the report output fresh and manually if there is a need to update the report before the next periodic update (see [the run workflow](https://github.com/ably/repository-audit/blob/main/.github/workflows/run.yml)).
4. **What form does the report take?** Markdown. Because:
    - The GitHub browser UI provides us a free rendering engine for markdown
    - If formatted logically, markdown is very git-diff friendly
    - _Keeps It Simple_ and is universally understood by many
5. **Where does the report output go?** Downstream repositories ([internal/private](https://github.com/ably/repository-audit-report-internal) and [public](https://github.com/ably/repository-audit-report)). See previous answer regarding markdown for the reason why this needs be no more complex than that.
6. **Is there any potential for monitoring changes to the report output over time?** Yes. Each update to the report is a `git` commit and will generally only update a small part of the report reflecting what has changed since the report was last run. This means we can use `git` tools and the GitHub browser UI to examine these report diffs over time.

## Runtime Requirements

This tool needs a private key for the GitHub App in order to sign access token requests.
That private key is created and downloaded, in PEM format, from the 'Private keys' area within the app's 'General' settings
([here](https://github.com/organizations/ably/settings/apps/ably-repository-audit),
only accessible to those with permissions to act as
[GitHub App managers](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/permission-levels-for-an-organization#github-app-managers)).
This tool expects that file to be at:

    app-private-key.pem

This tool also requires the following to be available in the process' environment:

- **`APP_ID`**: Number. The 'App ID' available under 'About' in 'General' settings for the GitHub App.
- **`APP_CLIENT_ID`**: String. The 'Client ID' available under 'About' in 'General' settings for the GitHub App.
- **`APP_CLIENT_SECRET`**: String. A 'Client secret' generated under 'Client secrets' in 'General' settings for the GitHub App.
- **`ORG_INSTALLATION_IDS`**: String, [YAML](http://yaml.org/) formatted. The `installation_id`(s) for the GitHub App within the org(s) that it has been installed into. See [Org Installations](#org-installations) for details.

## Miscellaneous Notes

### Environment Variable and Secret Names

To make this codebase more navigable we've conformed naming of secrets in the three locations you'll find them, that is:

1. As secrets configured via GitHub's Web UI
2. As environment variables fed into the Node.js process at runtime
3. In the source code, populated from `process.env`

The naming of these secrets, in particular the need to avoid the `GITHUB_` prefix, is constrained by factors which can be found in the GitHub Actions documentation:

- [Security Guides: Encrypted secrets: Naming your secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets#naming-your-secrets):
- [Learn GitHub Actions: Environment variables: Default environment variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables)

### Deploy Keys for Downstream Repositories

The [run workflow](.github/workflows/run.yml) publishes updates to the report as Git commits to the downstream repositories:

- [ably/repository-audit-report-internal](https://github.com/ably/repository-audit-report-internal): private, only visible to teams within the `ably` org
- [ably/repository-audit-report](https://github.com/ably/repository-audit-report): public, open

In order to do this it uses the `INTERNAL_REPORT_REPOSITORY_SSH_KEY` and `PUBLIC_REPORT_REPOSITORY_SSH_KEY` secrets.

Creation and installation of a deploy key involves the following steps:

#### 1. Generate the key pair

Using `ssh-keygen` on your local machine - for example:

    ssh-keygen -f /tmp/ably-deploy-key -t ed25519 -C "ably-repository-audit[bot]@noreply.ably.com"

Contrary to the instructions in
[GitHub's server-configuration-oriented documentation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent#generating-a-new-ssh-key),
leave the passphrase empty.

#### 2. Install public key

Copy file contents to clipboard:

    cat /tmp/ably-deploy-key.pub | pbcopy

Navigate to the downstream repository's 'Deploy keys' in 'Settings'
([here](https://github.com/ably/repository-audit-report-internal/settings/keys) for private/internal,
[here](https://github.com/ably/repository-audit-report/settings/keys) for public,
requires `Admin`
[permissions](https://docs.github.com/en/organizations/managing-access-to-your-organizations-repositories/repository-permission-levels-for-an-organization))
and click 'Add deploy key'.

Paste your clipboard contents into 'Key'.

Enter something logical for 'Title' - for example: `repository-audit publish key`

#### 3. Install private key

Copy file contents to clipboard:

    cat /tmp/ably-deploy-key | pbcopy

Navigate to this repository's 'Secrets' for 'Actions' in 'Settings'
([here](https://github.com/ably/repository-audit/settings/secrets/actions),
requires `Admin`
[permissions](https://docs.github.com/en/organizations/managing-access-to-your-organizations-repositories/repository-permission-levels-for-an-organization))
and click 'New repository secret'.

Paste your clipboard contents into 'Value'.

Provide the name expected by the workflow into 'Name':

- `INTERNAL_REPORT_REPOSITORY_SSH_KEY` for the private/internal downstream target repository
- `PUBLIC_REPORT_REPOSITORY_SSH_KEY` for the public downstream target repository

#### 4. Cleanup locally

Delete the key pair from your local workstation:

```
rm /tmp/ably-deploy-key
rm /tmp/ably-deploy-key.pub
```

### Org Installations

These are available, for an org into which the GitHub App associated with this tool has been installed, from the browser's address bar (end of URL with prefix `https://github.com/organizations/ORG-NAME/settings/installations/`) if you click 'Configure' under 'Installed GitHub Apps` in org settings.

At runtime the tool looks for a file named `installations.yml`, whose contents must contain one or more orgs alongside their installation ids.
For example (mock installation ids):

```yml
ably: 123
ably-labs: 456
ably-forks: 789
```

This file is created by the [rehearse](.github/workflows/rehearse.yml) and [run](.github/workflows/run.yml) workflows from the `ORG_INSTALLATION_IDS` repository secret.

### Docker setup for local development

This development environment use a [node official image](https://hub.docker.com/_/node).

Please be sure to have the following files in the root directory to make the project work locally:

* `.env` populated with environnement variables (see [Runtime Requirements](#runtime-requirements))
* `app-private-key.pem` (see [Runtime Requirements](#runtime-requirements))
* `installations.yml` (see [Org Installations](#org-installations))

Build the image:

    docker-compose build

Start the environment:

    docker-compose run node bash

Then install the dependencies:

    npm install

To run the tests:

    npm test

To generate the reports:

    node .
