import { useEffect, useMemo, useState } from 'react';
import { BASE_URL } from '../utils/api';
import { INITIAL_SUGGEST_STATE, SuggestController, type SuggestScope, type SuggestState } from '../utils/searchSuggest';

/**
 * The instant suggestions for a search box: `query` is the field's text, `locale` the app language. Returns the list's
 * state and `close` (call it when a suggestion is opened).
 */
export function useSearchSuggest(query: string, locale: string, scope?: SuggestScope) {
  const [state, setState] = useState<SuggestState>(INITIAL_SUGGEST_STATE);
  const controller = useMemo(
    () => new SuggestController({ baseUrl: BASE_URL, locale, scope, fetcher: (url, init) => fetch(url, init), onChange: setState }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scope is a module constant per screen
    [locale, scope?.section, scope?.types?.join(',')],
  );

  useEffect(() => () => controller.dispose(), [controller]);
  useEffect(() => {
    controller.input(query);
  }, [controller, query]);

  return { ...state, close: () => controller.close() };
}
