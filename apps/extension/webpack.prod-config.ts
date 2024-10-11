/**
 * This config overrides the env file for the extension and changes the output directory
 */

import dotenv from 'dotenv';
import path from 'node:path';
import config from './webpack.config.js';

dotenv.config({ path: '.env', override: true });

const __dirname = new URL('.', import.meta.url).pathname;

export default ({ WEBPACK_WATCH = false }: { ['WEBPACK_WATCH']?: boolean }) => {
  const appliedConfig = config({ WEBPACK_WATCH });
  appliedConfig.output!.path = path.join(__dirname, 'dist');
  return appliedConfig;
};
