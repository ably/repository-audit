#!/usr/bin/env bash
#
# A script to publish the generated report to the downstream GitHub repository.
# `node .` will need to have been run first, creating the `output/report` folder.
#
# The script assumes there's an SSH key available with read/write permissions
# to the downstream repository, and thus uses SSH URLs.
#
# Based on @lmars original work at:
# https://github.com/ably/ably-common/blob/main/scripts/publish-go.sh

# exit if any command returns a non-zero exit status
set -e

# TMPDIR is a temporary directory used for cloning git repositories that's
# deleted on exit
TMPDIR="$(mktemp -d)"
trap "rm -rf ${TMPDIR}" EXIT

# WORKDIR is expected to be the repository root
WORKDIR="$(pwd)"

# main runs the main logic of the program
main() {
  publish

  info "Done!"
}

publish() {
  local repo="${TMPDIR}/repo"
  info "Cloning from origin into ${repo}..."
  git clone git@github.com:ably/repository-audit-report-internal "${repo}"

  info "Copying generated report files to repository clone..."
  cp output/report/*.md "${repo}"

  # check there are some changes to publish
  cd "${repo}"
  local status="$(git status --porcelain)"
  if [[ -z "${status}" ]]; then
    info "No changes to publish"
    return
  fi

  info "Pushing changes back to origin..."
  git add .
  git commit "--file=${WORKDIR}/output/commit-message.txt"
  git push origin main
}

# info prints an informational message to stdout
info() {
  local msg=$1
  local timestamp=$(date +%H:%M:%S)
  echo "===> ${timestamp} ${msg}"
}

main "$@"
