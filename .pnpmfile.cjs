/**
 * Developers may wish to use pnpm.overrides to specify local tarballs or other
 * customization, but pnpm currently does not respect overrides during peer
 * dependency resolution.
 *
 * @see https://github.com/pnpm/pnpm/issues/4214
 *
 * @param pkg manifest of package currently being read
 */
const overridePeerDependencies = (pkg, context) => {
  const overrides = require('./package.json').pnpm?.overrides ?? {};
  for (const dep of Object.keys(pkg.peerDependencies ?? {})) {
    if (dep in overrides) pkg.peerDependencies[dep] = overrides[dep];
  }
  return pkg;
};

module.exports = {
  hooks: {
    readPackage(pkg, context) {
      pkg = overridePeerDependencies(pkg, context);
      return pkg;
    },
  },
};
