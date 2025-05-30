import { Location } from 'react-router-dom';
import { LocationState, SEED_PHRASE_ORIGIN } from './types';
import { PagePath } from '../../paths';
import { usePageNav } from '../../../../utils/navigate';

export const getSeedPhraseOrigin = (location: Location): SEED_PHRASE_ORIGIN => {
  const state = location.state as Partial<LocationState> | undefined;
  if (
    state &&
    typeof state.origin === 'string' &&
    Object.values(SEED_PHRASE_ORIGIN).includes(state.origin)
  ) {
    return state.origin;
  }

  return SEED_PHRASE_ORIGIN.IMPORTED;
};

export const navigateToPasswordPage = (
  nav: ReturnType<typeof usePageNav>,
  origin: SEED_PHRASE_ORIGIN,
) => nav(PagePath.SET_PASSWORD, { state: { origin } });
