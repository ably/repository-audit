const fs = require('fs');
const path = require('path');
const { createAppAuth } = require('@octokit/auth-app');
const { graphql } = require('@octokit/graphql');
const MarkdownWriter = require('./markdown').Writer;

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
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }`;

  // Keys define check names and Values define their descriptions.
  const checks = {
    A: 'Validates that there is a default branch and it is called `main`.',
    B: 'Validates that there is a branch protection rule defined for the `main` branch.',
  };
  const checkCodes = Object.getOwnPropertyNames(checks).sort();

  // Create empty arrays and maps for results collection.
  const publicRepositoryNames = [];
  const privateRepositoryNames = [];
  const checkResults = new Map(); // e.g. { 'ably-js': { A: true, B: false } }

  // Run the asynchronous query / queries.
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
      const { visibility, name, defaultBranchRef } = repository;

      (visibility === 'PUBLIC' ? publicRepositoryNames : privateRepositoryNames).push(name);
      checkResults.set(name, {
        A: defaultBranchRef?.name === 'main',
        B: false, // TODO
      });
    });
    repositoryCount += repositoryNodes.length;

    const { pageInfo } = organization.repositories;
    previousEndCursor = pageInfo.endCursor;
    needToQuery = pageInfo.hasNextPage;
  }

  console.log(`Queried Repository Count: ${repositoryCount}`);

  function repositoryResultCells(name) {
    const results = checkResults.get(name);
    const resultCells = checkCodes.map((code) => `:${results[code] ? 'green' : 'red'}_circle:`);
    return [name].concat(resultCells);
  }

  const resultHeaderCells = ['Repository'].concat(checkCodes);

  const directoryName = 'output';
  const fileName = 'ably.md';
  if (!fs.existsSync(directoryName)) {
    fs.mkdirSync(directoryName);
  }
  const md = new MarkdownWriter(fs.createWriteStream(path.join(directoryName, fileName)));

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

  md.end();
}
