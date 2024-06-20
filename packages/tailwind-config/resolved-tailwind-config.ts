import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from './index';

export const RESOLVED_TAILWIND_CONFIG = resolveConfig(tailwindConfig);
