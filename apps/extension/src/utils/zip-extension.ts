import * as path from 'path';
import child_process from 'child_process';

const WORKING_DIR = process.cwd(); // Should be run at root dir of repo
const DIST_PROD_PATH = path.join(WORKING_DIR, 'apps/extension/dist');
const DIST_BETA_PATH = path.join(WORKING_DIR, 'apps/extension/beta-dist');
const PROD_ZIP_PATH = path.join(WORKING_DIR, 'prod.zip');
const BETA_ZIP_PATH = path.join(WORKING_DIR, 'beta.zip');

const zipDirectory = (path: string, dist: string) => {
  child_process.execSync(`zip -r ${path} .`, { cwd: dist, stdio: 'inherit' });
};

const main = () => {
  zipDirectory(PROD_ZIP_PATH, DIST_PROD_PATH);
  zipDirectory(BETA_ZIP_PATH, DIST_BETA_PATH);
};

main();
