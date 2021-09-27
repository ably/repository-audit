const fs = require('fs').promises;
const { createAppAuth } = require('@octokit/auth-app');

require('dotenv').config();

const githubAppId = process.env.GITHUB_APP_ID;
const githubAppClientId = process.env.GITHUB_APP_CLIENT_ID;
const githubAppClientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
const githubAppInstallationId = process.env.GITHUB_APP_INSTALLATION_ID;

(async () => {
  const privatePem = await fs.readFile('github-app-private-key.pem', 'ascii');

  // https://github.com/octokit/auth-app.js/#authenticate-as-installation
  // https://docs.github.com/en/rest/reference/apps#create-an-installation-access-token-for-an-app
  const auth = createAppAuth({
    appId: githubAppId,
    privateKey: privatePem,
    clientId: githubAppClientId,
    clientSecret: githubAppClientSecret,
  });

  // Retrieve installation access token
  const installationAuthentication = await auth({
    type: 'installation',
    installationId: githubAppInstallationId,
  });

  console.log(`Auth:\n${installationAuthentication}`);
})();
