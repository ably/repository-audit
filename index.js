const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const { createAppAuth } = require('@octokit/auth-app');
const { graphql } = require('@octokit/graphql');
const MarkdownWriter = require('./markdown').Writer;
const RepositoryChecks = require('./checks').Repository;

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

async function audit() {
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
  const query = `query repositories($previousEndCursor: String) {
    organization(login: "ably") {
      repositories(first: 100, after: $previousEndCursor) {
        nodes {
          name,
          defaultBranchRef {
            name
          },
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
    B: 'Validates that there is a branch protection rule defined for the `main` branch.',
  };
  const checkCodes = Object.getOwnPropertyNames(checkDescriptions).sort();

  // Create empty arrays and maps for results collection.
  const publicRepositoryNames = [];
  const privateRepositoryNames = [];
  const checkResults = new Map(); // e.g. { 'ably-js': { A: 'green', B: 'red' } }

  // Run the asynchronous query / queries.
  const startDate = new Date();
  let queryCount = 0;
  let needToQuery = true;
  let previousEndCursor = null;
  let repositoryCount = 0;
  while (needToQuery) {
    queryCount += 1;
    console.log(`Executing Query #${queryCount}...`);
    const variables = { previousEndCursor };
    const { organization } = await graphqlWithAuth(query, variables); // eslint-disable-line no-await-in-loop

    const repositoryNodes = organization.repositories.nodes;
    repositoryNodes.forEach((repository) => {
      const { visibility, name } = repository;
      const checks = new RepositoryChecks(repository);

      (visibility === 'PUBLIC' ? publicRepositoryNames : privateRepositoryNames).push(name);
      checkResults.set(name, {
        A: checks.defaultBranchName(),
        B: checks.branchProtectionRuleForDefaultBranch(),
      });
    });
    repositoryCount += repositoryNodes.length;

    const { pageInfo } = organization.repositories;
    previousEndCursor = pageInfo.endCursor;
    needToQuery = pageInfo.hasNextPage;
  }

  const endDate = new Date();
  console.log(`Queried Repository Count: ${repositoryCount}`);

  function repositoryResultCells(name) {
    const results = checkResults.get(name);
    const resultCells = checkCodes.map((code) => results[code].emoji);
    const interactiveName = `[${name}](https://github.com/ably/${name})`;
    return [interactiveName].concat(resultCells);
  }

  const interactiveCodes = checkCodes.map((code) => `[${code}](#check-${code.toLowerCase()})`);
  const resultHeaderCells = ['Repository'].concat(interactiveCodes);

  // Create output directory in standard location within working directory.
  // The expectation is that this tool is run from the root of the repository.
  const outputDirectoryName = 'output';
  const reportDirectoryName = path.join(outputDirectoryName, 'report');
  const fileName = 'ably.md';
  if (!fs.existsSync(reportDirectoryName)) {
    fs.mkdirSync(reportDirectoryName, { recursive: true });
  }

  // Write commit message.
  const sha = childProcess.execSync('git rev-parse HEAD').toString().trim();
  const branch = childProcess.execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const commitMessage = fs.createWriteStream(path.join(outputDirectoryName, 'commit-message.txt'));
  commitMessage.write(`Generate report at ${startDate.toISOString()}.\n\n`);
  commitMessage.write(`Queries finished: ${endDate.toISOString()}\n`);
  commitMessage.write(`Generated by: https://github.com/ably/repository-audit/commit/${sha}\n`);
  commitMessage.write(`Branch: ${branch}\n`);
  await new Promise((resolve) => {
    commitMessage.on('finish', () => {
      resolve();
    });
    commitMessage.end();
  });

  // Write report.
  const md = new MarkdownWriter(fs.createWriteStream(path.join(reportDirectoryName, fileName)));

  md.h(1, 'Repository Audit for `ably`');

  md.h(2, 'Public Repositories');
  md.tableHead(resultHeaderCells);
  publicRepositoryNames.sort().forEach((name) => {
    md.tableBodyLine(repositoryResultCells(name));
  });

  md.h(2, 'Private Repositories');
  md.tableHead(resultHeaderCells);
  privateRepositoryNames.sort().forEach((name) => {
    md.tableBodyLine(repositoryResultCells(name));
  });

  md.h(2, 'Checks');
  checkCodes.forEach((code) => {
    md.h(3, `Check: ${code}`);
    md.line(checkDescriptions[code]);
  });

  await md.end();
}
