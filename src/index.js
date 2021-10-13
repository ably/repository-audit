const fs = require('fs');
const path = require('path');
const { createAppAuth } = require('@octokit/auth-app');
const { graphql } = require('@octokit/graphql');
const MarkdownWriter = require('./markdown').Writer;
const RepositoryChecks = require('./checks').Repository;
const { GitHub } = require('./github');

require('dotenv').config();

const {
  APP_ID,
  APP_CLIENT_ID,
  APP_CLIENT_SECRET,
  APP_INSTALLATION_ID_ABLY,
} = process.env;

// Entry Point
(async () => {
  try {
    await audit();
  } catch (error) {
    console.error(error);
    process.exit(2);
  }
})();

/**
 * Run the audit and generate the report.
 */
async function audit() {
  const orgName = 'ably';
  const privatePem = await fs.promises.readFile('app-private-key.pem', 'ascii');

  // https://github.com/octokit/auth-app.js/#authenticate-as-installation
  // https://docs.github.com/en/rest/reference/apps#create-an-installation-access-token-for-an-app
  const auth = createAppAuth({
    appId: APP_ID,
    privateKey: privatePem,
    clientId: APP_CLIENT_ID,
    clientSecret: APP_CLIENT_SECRET,
    installationId: APP_INSTALLATION_ID_ABLY,
  });

  const graphqlWithAuth = graphql.defaults({
    request: {
      hook: auth.hook,
    },
  });

  // The type of $previousEndCursor is explicitly `String`, not `String!`. This is because we intentionally supply
  // a value of `null` on our first query.
  const query = `query repositories($orgName: String!, $previousEndCursor: String) {
    organization(login: $orgName) {
      repositories(first: 100, after: $previousEndCursor) {
        nodes {
          name
          hasIssuesEnabled
          hasProjectsEnabled
          hasWikiEnabled
          forkingAllowed
          deleteBranchOnMerge
          rebaseMergeAllowed
          squashMergeAllowed
          mergeCommitAllowed
          autoMergeAllowed
          defaultBranchRef {
            name
          }
          visibility
          branchProtectionRules(first: 100) {
            nodes {
              requiredApprovingReviewCount
              requiresApprovingReviews
              requiresConversationResolution
              requiresStatusChecks
              requiresStrictStatusChecks
              restrictsPushes
              pattern
              allowsDeletions
              allowsForcePushes
            }
            pageInfo {
              hasNextPage
            }
          }
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }`;

  // Keys define check names and Values define their descriptions.
  const checkDescriptions = {
    A: 'Validates that there is a default branch and it is called `main`.',
    B: 'Validates that there is a branch protection rule defined for the default branch and that it has been configured correctly.',
    C: 'Validates that fundamental GitHub features are enabled or disabled as appropriate.',
    D: 'Validates the configuration of the Merge button.',
  };
  const checkCodes = Object.getOwnPropertyNames(checkDescriptions).sort();

  // Create empty arrays and maps for results collection.
  const publicRepositoryNames = [];
  const privateRepositoryNames = [];
  const checkResults = new Map(); // for example: { 'ably-js': { A: 'green', B: 'red' } }

  // Run the asynchronous query / queries.
  const startDate = new Date();
  let queryCount = 0;
  let needToQuery = true;
  let previousEndCursor = null;
  let repositoryCount = 0;
  while (needToQuery) {
    queryCount += 1;
    console.log(`Executing Query #${queryCount}...`);
    const variables = { orgName, previousEndCursor };
    const { organization } = await graphqlWithAuth(query, variables); // eslint-disable-line no-await-in-loop

    const repositoryNodes = organization.repositories.nodes;
    repositoryNodes.forEach((repository) => {
      const { visibility, name } = repository;
      const checks = new RepositoryChecks(repository);

      (visibility === 'PUBLIC' ? publicRepositoryNames : privateRepositoryNames).push(name);
      checkResults.set(name, {
        A: checks.defaultBranchName(),
        B: checks.branchProtectionRuleForDefaultBranch(),
        C: checks.features(),
        D: checks.mergeButton(),
      });
    });
    repositoryCount += repositoryNodes.length;

    const { pageInfo } = organization.repositories;
    previousEndCursor = pageInfo.endCursor;
    needToQuery = pageInfo.hasNextPage;
  }

  const endDate = new Date();
  console.log(`Queried Repository Count: ${repositoryCount}`);

  const github = new GitHub(process.env);

  /**
   * Renders the content for the table row summarising check results for a repository.
   *
   * @param {string} name The repository name (for example: 'ably-java').
   * @returns {string[]} Markdown-formatted content for this cells in this row.
   */
  function repositoryResultCells(name) {
    const results = checkResults.get(name);
    const resultCells = checkCodes.map((code) => {
      // Render as a link if it wasn't a PASS.
      const result = results[code];
      const { emoji, isPass } = result;
      return isPass ? emoji : `[${emoji}](#${name.toLowerCase()}-check-${code.toLowerCase()})`;
    });
    const interactiveName = `[${name}](${github.repositoryURL(orgName, name)})`;
    return [interactiveName].concat(resultCells);
  }

  const interactiveCodes = checkCodes.map((code) => `[${code}](#check-${code.toLowerCase()})`);
  const resultHeaderCells = ['Repository'].concat(interactiveCodes);

  // Create output directory in standard location within working directory.
  // The expectation is that this tool is run from the root of the repository.
  const outputDirectoryPath = 'output';
  createDirectory(outputDirectoryPath);
  const fileName = `${orgName}.md`;

  // Write commit message.
  const { sha, branch, currentRepositoryURL } = github;
  const commitMessage = fs.createWriteStream(path.join(outputDirectoryPath, 'commit-message.txt'));
  commitMessage.write(`Generate report at ${startDate.toISOString()}.\n\n`);
  commitMessage.write(`Queries finished: ${endDate.toISOString()}\n`);
  if (currentRepositoryURL) {
    const commitPath = `commit/${sha}`;
    commitMessage.write(`Generated by: ${new URL(commitPath, currentRepositoryURL)}\n`);
  } else {
    commitMessage.write(`Generated by commit: ${sha}\n`);
  }
  commitMessage.write(`Branch: ${branch}\n`);
  await new Promise((resolve) => {
    commitMessage.on('finish', () => {
      resolve();
    });
    commitMessage.end();
  });

  const publicFolderName = 'public';
  const internalFolderName = 'internal';

  /**
   * Writes the markdown-formatted report.
   *
   * @param {string} folderName The folder within the output directory to write the report to.
   * @param {string[]} repositoryNames The names of the repositories to be written to this report.
   */
  async function writeReport(folderName, repositoryNames) {
    const directoryPath = path.join(outputDirectoryPath, folderName);
    createDirectory(directoryPath);
    const md = new MarkdownWriter(fs.createWriteStream(path.join(directoryPath, fileName)));

    const isInternal = folderName === internalFolderName;
    md.h(1, `Repository Audit for \`${orgName}\`${isInternal ? ' (INTERNAL)' : ''}`);

    if (isInternal) {
      md.lineWithSoftBreak(`:warning: This report reveals details about **PRIVATE** repositories within the \`${orgName}\` org.`);
      md.line('**CONFIDENTIAL**. Please think before exporting or otherwise sharing the contents outside of the canonical presentation context.');
    }

    md.h(2, 'Repositories');
    md.tableHead(resultHeaderCells);
    repositoryNames.sort().forEach((name) => {
      md.tableBodyLine(repositoryResultCells(name));
    });

    md.h(2, 'Checks');
    checkCodes.forEach((code) => {
      md.h(3, `Check: ${code}`);
      md.line(checkDescriptions[code]);
    });

    md.h(2, 'Failure Details');
    repositoryNames.forEach((name) => {
      const results = checkResults.get(name);
      checkCodes.forEach((code) => {
        // Only create a section if it wasn't a PASS.
        const result = results[code];
        if (!result.isPass) {
          const interactiveName = `[${name}](${github.repositoryURL(orgName, name)})`;
          md.h(3, `${interactiveName} check ${code}`);
          md.line(`${result.emoji} ${result.description}`);
        }
      });
    });

    await md.end();
  }

  // Write reports.
  writeReport(publicFolderName, publicRepositoryNames);
  writeReport(internalFolderName, privateRepositoryNames);
}

/**
 * Creates a directory at the given path if it doesn't exist, recursively if necessary.
 *
 * @param {string} directoryPath The directory path. Can be relative to current working directory.
 */
function createDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}
