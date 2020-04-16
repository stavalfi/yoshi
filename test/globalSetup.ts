import path from 'path';
import execa from 'execa';
import fs from 'fs-extra';
import tempy from 'tempy';
// @ts-ignore wrong types
import { setup as setupPuppeteer } from 'jest-environment-puppeteer';
import isCi from 'is-ci';
import {
  publishMonorepo,
  authenticateToRegistry,
} from '../scripts/utils/publishMonorepo';
import { tmpDirectory } from './utils';

export default async (globalConfig: any) => {
  // Empty the folder
  fs.emptyDirSync(tmpDirectory);

  await setupPuppeteer(globalConfig);
  const isPublish = !!process.env.WITH_PUBLISH;

  if (isPublish && !isCi && !process.env.forcePublish) {
    console.log();
    console.log('------------------------------------');
    console.log();
    console.log(`
      Hey!
      You are trying to run integration tests locally in a slow way,
      using Verdaccio, which will publish the monorepo locally to your file system.
      A better way is to use one of the 'fast' commands, from your package.json,
      or just run 'npx jest' with filters as you want (recommended).
      If you still want to run those tests locally with the publish option,
      please add the 'forcePublish' environment variable to the command.
      Please notice that this will change some files on your file system
      and add untracked files. Make sure you do not push those changes.
      Good luck!
      `);
    console.log();
    console.log('------------------------------------');

    process.exit(1);
  }

  if (isPublish) {
    console.log('Starting monorepo publish');
    global.teardown = publishMonorepo();
    global.yoshiPublishDir = tempy.directory();

    await fs.copy(
      path.join(__dirname, 'yoshi-publish'),
      global.yoshiPublishDir,
    );

    console.log('Authenticating to registry');
    authenticateToRegistry(global.yoshiPublishDir);

    console.log('Running yarn install');
    await execa('yarn install --no-lockfile', {
      cwd: global.yoshiPublishDir,
      shell: true,
      stdio: !process.env.DEBUG ? 'pipe' : 'inherit',
      extendEnv: false,
      env: {
        PATH: process.env.PATH,
      },
    });
  }
};
