const fs = require('fs').promises;
const { createAppAuth } = require('@octokit/auth-app');
const { graphql } = require('@octokit/graphql');

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
  const privatePem = await fs.readFile('app-private-key.pem', 'ascii');

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

  let needToQuery = true;
  let previousEndCursor = null;
  let repositoryCount = 0;
  while (needToQuery) {
    const variables = { previousEndCursor };
    const { organization } = await graphqlWithAuth(query, variables); // eslint-disable-line no-await-in-loop

    const repositoryNodes = organization.repositories.nodes;
    repositoryNodes.forEach((repository) => {
      const { visibility, name, defaultBranchRef } = repository;
      // defaultBranchRef will be null here if nothing has been pushed to this repository yet
      console.log(`${visibility} - ${name}: ${defaultBranchRef ? defaultBranchRef.name : '?'}`);
    });
    repositoryCount += repositoryNodes.length;

    const { pageInfo } = organization.repositories;
    previousEndCursor = pageInfo.endCursor;
    needToQuery = pageInfo.hasNextPage;
  }

  console.log(`Repository Count: ${repositoryCount}`);
}
