const fs = require('fs').promises;
const { createAppAuth } = require('@octokit/auth-app');
const { graphql } = require('@octokit/graphql');

require('dotenv').config();

const {
  APP_ID,
  APP_CLIENT_ID,
  APP_CLIENT_SECRET,
  APP_INSTALLATION_ID,
} = process.env;

(async () => {
  const privatePem = await fs.readFile('app-private-key.pem', 'ascii');

  // https://github.com/octokit/auth-app.js/#authenticate-as-installation
  // https://docs.github.com/en/rest/reference/apps#create-an-installation-access-token-for-an-app
  const auth = createAppAuth({
    appId: APP_ID,
    privateKey: privatePem,
    clientId: APP_CLIENT_ID,
    clientSecret: APP_CLIENT_SECRET,
    installationId: APP_INSTALLATION_ID,
  });

  const graphqlWithAuth = graphql.defaults({
    request: {
      hook: auth.hook,
    },
  });

  const query = `{
    organization(login: "ably") {
      repositories(first: 100) {
        nodes {
          name,
          defaultBranchRef {
            name
          },
          visibility
        }
      }
    }
  }`;

  // TODO handle pagination (we're specifying maximum allowed `first: 100` in the query)
  const { organization } = await graphqlWithAuth(query);
  const repositoryNodes = organization.repositories.nodes;
  repositoryNodes.forEach((repository) => {
    // TODO work out why we get this here: TypeError: Cannot read property 'name' of null
    console.log(`${repository.visibility} - ${repository.name}: ${repository.defaultBranchRef.name}`);
  });
})();
