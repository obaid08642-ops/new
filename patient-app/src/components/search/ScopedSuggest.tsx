import React from 'react';
import { router, type Href } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { useSearchSuggest } from '../../hooks/useSearchSuggest';
import { suggestionRoute, type SuggestScope } from '../../utils/searchSuggest';
import { reportRankingEvent, verticalOfSuggestion } from '../../utils/rankingEvents';
import { SearchSuggestList } from './SearchSuggestList';

/** The live suggestions of one service under its search field: only that service's items; picking one opens it. */
export function ScopedSuggest({ query, scope }: { query: string; scope: SuggestScope }) {
  const { lang } = useApp();
  const suggest = useSearchSuggest(query, lang, scope);
  if (!suggest.open) return null;
  return (
    <SearchSuggestList
      items={suggest.items}
      query={query}
      onPick={(item) => {
        const route = suggestionRoute(item);
        if (!route) return;
        const vertical = verticalOfSuggestion(item.type);
        if (vertical) reportRankingEvent(vertical, item.id, 'search');
        suggest.close();
        router.push({ pathname: route.pathname, params: route.params } as unknown as Href);
      }}
    />
  );
}
