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
  verify
  publish "$@"

  info "Done!"
}

# Check that there is something to publish
verify() {
  info "Verifying presence of report output..."
  grep 'Repository Audit' output/report/ably.md
  grep 'Generated by' output/commit-message.txt
}

# Clone target repository, modify, commit and push.
# Arguments:
# - Pull Request Number. Optional.
publish() {
  local pullRequestNumber=$1
  local previewBranchName="preview/pulls/${pullRequestNumber}"

  local repo="${TMPDIR}/repo"
  info "Cloning from origin into ${repo}..."
  git clone git@github.com:ably/repository-audit-report-internal "${repo}"

  info "Copying generated report files to repository clone..."
  cp output/report/*.md "${repo}"

  info "Changing working directory to repository clone to perform git operations..."
  cd "${repo}"

  if [ ! -z "${pullRequestNumber}" ]; then
    # Emit some information that may be useful when debugging.
    info "Will publish to preview branch."
    info "Pull Request Number: ${pullRequestNumber}"
    info "Preview Branch Name: ${previewBranchName}"

    # Use git's ls-remote command to check for existing preview branch.
    # For this one command we're disabling (with `set +e`) the instruction to base to exit if a command returns non-zero exit status.
    info "Checking for existing preview branch for this pull request..."
    set +e
    $(git ls-remote --exit-code --heads origin "${previewBranchName}")
    local gitLsRemoteExitCode=$?
    set -e

    if [ $gitLsRemoteExitCode -eq 2 ]; then
        info "Creating new branch..."
        git checkout -b "${previewBranchName}"
    else
        info "Checking out existing branch..."
        git checkout "${previewBranchName}"
    fi
  else
    info "Will publish to main branch."
  fi

  # check there are some changes to publish
  local status="$(git status --porcelain)"
  if [[ -z "${status}" ]]; then
    info "No changes to publish"
    return
  fi

  info "Creating commit..."
  git add .
  git commit "--file=${WORKDIR}/output/commit-message.txt"

  if [ ! -z "${pullRequestNumber}" ]; then
    info "Pushing changes up to origin preview branch..."
    git push --set-upstream origin "${previewBranchName}"
  else
    info "Pushing changes up to origin main branch..."
    git push origin main
  fi
}

# info prints an informational message to stdout
info() {
  local msg=$1
  local timestamp=$(date +%H:%M:%S)
  echo "===> ${timestamp} ${msg}"
}

main "$@"
