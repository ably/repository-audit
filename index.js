const { SignJWT } = require('jose/jwt/sign');
const fs = require('fs').promises;
const crypto = require('crypto');

require('dotenv').config();

const githubAppId = process.env.GITHUB_APP_ID;

(async () => {
  const jwt = await generateGitHubAppJWT(githubAppId, 'github-app-private-key.pem');

  console.log(`JWT:\n${jwt}`);
})();

async function generateGitHubAppJWT(appId, pemFilePath) {
  const privatePem = await fs.readFile(pemFilePath);
  const privateKey = crypto.createPrivateKey({
    key: privatePem,
  });

  /*
    Based on this Ruby example from here:
    https://docs.github.com/en/developers/apps/building-github-apps/authenticating-with-github-apps#authenticating-as-a-github-app

    ```ruby
    require 'openssl'
    require 'jwt'  # https://rubygems.org/gems/jwt

    # Private key contents
    private_pem = File.read("YOUR_PATH_TO_PEM")
    private_key = OpenSSL::PKey::RSA.new(private_pem)

    # Generate the JWT
    payload = {
      # issued at time, 60 seconds in the past to allow for clock drift
      iat: Time.now.to_i - 60,
      # JWT expiration time (10 minute maximum)
      exp: Time.now.to_i + (10 * 60),
      # GitHub App's identifier
      iss: "YOUR_APP_ID"
    }

    jwt = JWT.encode(payload, private_key, "RS256")
    puts jwt
    ```

    Though we're not implementing the optional `iat` claim - there's a chance this is a premature optimisation.
  */
  return new SignJWT({ })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(githubAppId)
    .setExpirationTime('10m')
    .sign(privateKey);
}
