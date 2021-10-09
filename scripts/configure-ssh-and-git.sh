#!/usr/bin/env bash
#
# Expects the private SSH key to be in ssh-private-key.pem in the current working folder.

# exit if any command returns a non-zero exit status
set -e

# Configure ssh
eval $(ssh-agent -s)
ssh-add ssh-private-key.pem

# Configure git
git config --global user.name "Ably Repository Audit [bot]"
git config --global user.email "ably-repository-audit[bot]@noreply.ably.com"
