import dotenv from 'dotenv';
import path from 'node:path';
import CopyPlugin from 'copy-webpack-plugin';

import config from './webpack.config.js';

dotenv.config({ path: '.env.beta', override: true });

const __dirname = new URL('.', import.meta.url).pathname;

// Copies the beta manifest file after the build to replace the default manifest
const BetaManifestReplacerPlugin = new CopyPlugin({
  patterns: [
    {
      from: path.resolve(__dirname, 'public/beta-manifest.json'),
      to: path.resolve(__dirname, 'beta-dist/manifest.json'),
      force: true,
    },
  ],
});

/**
 * This config overrides the env file for the extension, changes the output directory,
 * and modifies the `manifest.json` file to use the beta extension ID
 */
export default ({ WEBPACK_WATCH = false }: { ['WEBPACK_WATCH']?: boolean }) => {
  const appliedConfig = config({ WEBPACK_WATCH });

  appliedConfig.output!.path = path.join(__dirname, 'beta-dist');
  appliedConfig.plugins!.push(BetaManifestReplacerPlugin);

  return appliedConfig;
};
