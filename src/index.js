const fs = require('fs');
const path = require('path');
const { createAppAuth } = require('@octokit/auth-app');
const { graphql } = require('@octokit/graphql');
const YAML = require('yaml');
const MarkdownWriter = require('./markdown').Writer;
const RepositoryChecks = require('./checks').Repository;
const {
  PASS,
  WARN,
  FAIL,
  indicationLabel,
} = require('./checks');
const { GitHub } = require('./github');

require('dotenv').config();

const {
  APP_ID,
  APP_CLIENT_ID,
  APP_CLIENT_SECRET,
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
 * Run the audits and generate the reports, for all configured GitHub orgs.
 */
async function audit() {
  const github = new GitHub(process.env);
  const startDate = new Date();

  const repositoriesQuery = await fs.promises.readFile('src/repositories.graphql', 'utf8');

  // Create output directory in standard location within working directory.
  // The expectation is that this tool is run from the root of the repository.
  const outputDirectoryPath = 'output';
  createDirectory(outputDirectoryPath);

  const installationsYaml = await fs.promises.readFile('installations.yml', 'utf8');
  const installations = YAML.parse(installationsYaml);
  if (!installations) {
    throw new Error('Failed to parse installations YAML. Is the file empty?');
  }
  const orgNames = Object.getOwnPropertyNames(installations).sort();
  const orgCount = orgNames.length;
  if (orgCount < 1) {
    throw new Error('No orgs configured. At least one installation id must be supplied.');
  }

  for (let i = 0; i < orgCount; i += 1) {
    const orgName = orgNames[i];
    const installationId = installations[orgName];
    // eslint-disable-next-line no-await-in-loop
    await auditOrg(github, repositoriesQuery, orgName, installationId, outputDirectoryPath);
  }

  const endDate = new Date();
  await writeCommitMessage(github, startDate, endDate, outputDirectoryPath);
}

/**
 * Write a commit message which can be used to represent the changes generated in the report output(s).
 *
 * @param {GitHub} github The GitHub environment.
 * @param {Date} startDate When report generation started.
 * @param {Date} endDate When report generation finished.
 * @param {string} outputDirectoryPath The path to the output folder to write the report to.
 */
async function writeCommitMessage(github, startDate, endDate, outputDirectoryPath) {
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
}

/**
 * Run the audit and generate the report, for a single GitHub org.
 *
 * @param {GitHub} github The GitHub environment.
 * @param {string} repositoriesQuery The GraphQL query to run.
 * @param {string} orgName The GitHub org name.
 * @param {string} installationId The id of the GitHub App installation within this GitHub org.
 * @param {string} outputDirectoryPath The path to the output folder to write the report to.
 */
async function auditOrg(github, repositoriesQuery, orgName, installationId, outputDirectoryPath) {
  console.log(`Audit for '${orgName}' org:`);
  const privatePem = await fs.promises.readFile('app-private-key.pem', 'ascii');

  // https://github.com/octokit/auth-app.js/#authenticate-as-installation
  // https://docs.github.com/en/rest/reference/apps#create-an-installation-access-token-for-an-app
  const auth = createAppAuth({
    appId: APP_ID,
    privateKey: privatePem,
    clientId: APP_CLIENT_ID,
    clientSecret: APP_CLIENT_SECRET,
    installationId,
  });

  const graphqlWithAuth = graphql.defaults({
    request: {
      hook: auth.hook,
    },
  });

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
  let queryCount = 0;
  let needToQuery = true;
  let previousEndCursor = null;
  let repositoryCount = 0;
  while (needToQuery) {
    queryCount += 1;
    console.log(`\tExecuting Query #${queryCount}...`);
    const variables = { orgName, previousEndCursor };
    const { organization } = await graphqlWithAuth(repositoriesQuery, variables); // eslint-disable-line no-await-in-loop

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

  console.log(`\tQueried Repository Count: ${repositoryCount}`);

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

  /**
   * Renders the content for the table row summarising check result totals for a check indication.
   *
   * @param {string} indication The check result indication (PASS, WARN, FAIL).
   * @param {string} repositoryNames The repositories to include in this summary.
   * @returns {string[]} Markdown-formatted content for this cells in this row.
   */
  function summaryCells(indication, repositoryNames) {
    const resultCells = checkCodes.map((code) => {
      let count = 0;
      repositoryNames.forEach((name) => {
        const results = checkResults.get(name);
        const result = results[code];
        if (result.indication === indication) {
          count += 1;
        }
      });
      return `${count}`;
    });
    return [indicationLabel(indication)].concat(resultCells);
  }

  const interactiveCodes = checkCodes.map((code) => `[${code}](#check-${code.toLowerCase()})`);
  const resultHeaderCells = ['Repository'].concat(interactiveCodes);
  const fileName = `${orgName}.md`;
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
    md.tableBodyLine(summaryCells(PASS, repositoryNames));
    md.tableBodyLine(summaryCells(WARN, repositoryNames));
    md.tableBodyLine(summaryCells(FAIL, repositoryNames));

    md.line(`Repository Count: ${repositoryNames.length}`, true);

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
