// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="web-ext.d.ts" />

// eslint-disable-next-line import/no-relative-packages
import rootPackageJson from '../../package.json' with { type: 'json' };

import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { spawn } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';
import { type WebExtRunner, cmd as WebExtCmd } from 'web-ext';
import webpack from 'webpack';
import WatchExternalFilesPlugin from 'webpack-watch-external-files-plugin';

export default ({
  WEBPACK_WATCH = false,
  PRAX_ID,
}: {
  ['WEBPACK_WATCH']?: boolean;
  PRAX_ID: string;
}): webpack.Configuration => {
  const keysPackage = path.dirname(url.fileURLToPath(import.meta.resolve('@penumbra-zone/keys')));

  const localPackages = [
    ...Object.values(rootPackageJson.dependencies),
    ...Object.values(rootPackageJson.devDependencies),

    /* eslint-disable */
    // typescript and eslint will recognize the literal type of local json.
    // this is the simplest way to shut them both up.
    ...Object.values(((rootPackageJson as any).pnpm?.overrides ?? {}) as Record<string, string>),
    /* eslint-enable */
  ]
    .filter(specifier => specifier.endsWith('.tgz'))
    .map(tgzSpecifier =>
      tgzSpecifier.startsWith('file:') ? url.fileURLToPath(tgzSpecifier) : tgzSpecifier,
    );

  const __dirname = new URL('.', import.meta.url).pathname;
  const srcDir = path.join(__dirname, 'src');
  const entryDir = path.join(srcDir, 'entry');
  const injectDir = path.join(srcDir, 'content-scripts');

  const CHROMIUM_PROFILE = process.env['CHROMIUM_PROFILE'];

  const PRAX = JSON.stringify(PRAX_ID);
  const PRAX_ORIGIN = JSON.stringify(`chrome-extension://${PRAX_ID}`);

  /*
   * The DefinePlugin replaces specified tokens with specified values.
   * - These should be declared in `prax.d.ts` for TypeScript awareness.
   * - `process.env.NODE_ENV` and other env vars are implicitly defined.
   * - Replacement is literal, so the values must be stringified.
   */
  const DefinePlugin = new webpack.DefinePlugin({
    PRAX,
    PRAX_ORIGIN,
    'globalThis.__DEV__': JSON.stringify(process.env['NODE_ENV'] !== 'production'),
    'globalThis.__ASSERT_ROOT__': JSON.stringify(false),
  });

  const WebExtReloadPlugin = {
    webExtRun: undefined as WebExtRunner | undefined,
    apply({ hooks }: webpack.Compiler) {
      hooks.afterEmit.tapPromise(
        { name: 'WebExt Reloader' },
        async ({ options }: webpack.Compilation) => {
          await this.webExtRun?.reloadAllExtensions();
          this.webExtRun ??= await WebExtCmd.run({
            target: 'chromium',
            chromiumProfile: CHROMIUM_PROFILE,
            keepProfileChanges: Boolean(CHROMIUM_PROFILE),
            profileCreateIfMissing: Boolean(CHROMIUM_PROFILE),
            sourceDir: options.output.path,
            startUrl: 'http://localhost:5173/',
          });
          this.webExtRun.registerCleanup(() => (this.webExtRun = undefined));
        },
      );
    },
  };

  /**
   * This custom plugin will run `pnpm install` before each watch-mode build. This
   * combined with WatchExternalFilesPlugin will ensure that tarball dependencies
   * are updated when they change.
   */
  const PnpmInstallPlugin = {
    apply: ({ hooks }: webpack.Compiler) =>
      hooks.watchRun.tapPromise(
        { name: 'CustomPnpmInstallPlugin' },
        compiler =>
          new Promise<void>((resolve, reject) => {
            const pnpmInstall = spawn(
              'pnpm',
              // --ignore-scripts because syncpack doesn't like to run under
              // webpack for some reason. watch out for post-install scripts that
              // dependencies might need.
              ['-w', 'install', '--ignore-scripts', '--offline'],
              { stdio: 'inherit' },
            );
            pnpmInstall.on('exit', code => {
              if (code) {
                reject(new Error(`pnpm install failed ${code}`));
              } else {
                // clear webpack's cache to ensure new deps are used
                compiler.purgeInputFileSystem();
                resolve();
              }
            });
          }),
      ),
  };

  return {
    entry: {
      'injected-session': {
        asyncChunks: false,
        chunkLoading: false,
        import: path.join(injectDir, 'injected-session.ts'),
      },
      'injected-penumbra-global': {
        asyncChunks: false,
        chunkLoading: false,
        import: path.join(injectDir, 'injected-penumbra-global.ts'),
      },
      'offscreen-handler': {
        asyncChunks: true,
        chunkLoading: 'import',
        runtime: 'offscreen',
        import: path.join(entryDir, 'offscreen-handler.ts'),
      },
      'page-root': {
        asyncChunks: true,
        chunkLoading: 'import',
        runtime: 'extension-page',
        import: path.join(entryDir, 'page-root.tsx'),
      },
      'popup-root': {
        asyncChunks: true,
        chunkLoading: 'import',
        runtime: 'extension-page',
        import: path.join(entryDir, 'popup-root.tsx'),
      },
      'service-worker': {
        asyncChunks: false,
        chunkLoading: 'import',
        import: path.join(srcDir, 'service-worker.ts'),
      },
      'wasm-build-action': {
        asyncChunks: true,
        chunkLoading: 'import',
        import: path.join(srcDir, 'wasm-build-action.ts'),
      },
    },
    output: {
      module: true,
      path: path.join(__dirname, 'dist'),
      filename: '[name].js',
    },
    optimization: {
      splitChunks: {
        chunks: chunk => {
          const filesNotToChunk = [
            'injected-session',
            'injected-penumbra-global',
            'service-worker',
            'wasm-build-action',
          ];
          return chunk.name ? !filesNotToChunk.includes(chunk.name) : false;
        },
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.m?js/,
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.css$/i,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  ident: 'postcss',
                  plugins: ['tailwindcss', 'autoprefixer'],
                },
              },
            },
          ],
        },
        {
          test: /\.mp4$/,
          type: 'asset/resource',
          generator: {
            filename: 'videos/[hash][ext][query]',
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        '@ui': path.resolve(__dirname, '../../packages/ui'),
      },
    },
    plugins: [
      new webpack.CleanPlugin(),
      new webpack.ProvidePlugin({
        // Required by the `bip39` library
        Buffer: ['buffer', 'Buffer'],
      }),
      new webpack.IgnorePlugin({
        // Not required by the `bip39` library, but very nice
        checkResource(resource) {
          return /.*\/wordlists\/(?!english).*\.json/.test(resource);
        },
      }),
      DefinePlugin,
      new CopyPlugin({
        patterns: [
          'public',
          {
            from: path.join(keysPackage, 'keys', '*_pk.bin'),
            to: 'keys/[name][ext]',
          },
        ],
      }),
      // html entry points
      new HtmlWebpackPlugin({
        scriptLoading: 'module',
        favicon: 'public/favicon/icon128.png',
        title: 'Prax Wallet',
        template: 'react-root.html',
        filename: 'page.html',
        chunks: ['page-root'],
      }),
      new HtmlWebpackPlugin({
        scriptLoading: 'module',
        title: 'Prax Wallet',
        template: 'react-root.html',
        rootId: 'popup-root',
        filename: 'popup.html',
        chunks: ['popup-root'],
      }),
      new HtmlWebpackPlugin({
        scriptLoading: 'module',
        title: 'Penumbra Offscreen',
        filename: 'offscreen.html',
        chunks: ['offscreen-handler'],
      }),
      // watch tarballs for changes
      WEBPACK_WATCH && new WatchExternalFilesPlugin({ files: localPackages }),
      WEBPACK_WATCH && PnpmInstallPlugin,
      WEBPACK_WATCH && CHROMIUM_PROFILE && WebExtReloadPlugin,
    ],
    experiments: {
      outputModule: true,
      asyncWebAssembly: true,
    },
  };
};
