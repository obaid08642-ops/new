'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MagnifyingGlass, X, Loader2, ChevronDown, Barcode, Mic2 } from 'lucide-react';
import styles from './search-bar.module.css';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'trending' | 'category' | 'did-you-mean' | 'pharmacist';
  category?: string;
}

interface SearchBarProps {
  placeholder?: string;
  locale?: string;
  onSearch?: (query: string) => void;
  recentSearches?: string[];
  trendingSearches?: string[];
  categories?: string[];
}

export function SearchBar({
  placeholder,
  locale = 'ar',
  onSearch,
  recentSearches = [],
  trendingSearches = [],
  categories = [],
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Generate suggestions based on input
  const updateSuggestions = useCallback((input: string) => {
    if (!input.trim()) {
      // Show recent and trending when empty
      const recent = recentSearches.slice(0, 3).map((text, i) => ({
        id: `recent-${i}`,
        text,
        type: 'recent' as const,
      }));
      const trending = trendingSearches.slice(0, 3).map((text, i) => ({
        id: `trending-${i}`,
        text,
        type: 'trending' as const,
      }));
      const cats = categories.slice(0, 3).map((text, i) => ({
        id: `category-${i}`,
        text,
        type: 'category' as const,
        category: text,
      }));
      setSuggestions([...recent, ...trending, ...cats]);
      return;
    }

    // Simulate API call for suggestions
    setIsLoading(true);
    setTimeout(() => {
      const lower = input.toLowerCase();
      const matched = [
        ...recentSearches.filter(s => s.toLowerCase().includes(lower)).slice(0, 2),
        ...trendingSearches.filter(s => s.toLowerCase().includes(lower)).slice(0, 2),
        ...categories.filter(s => s.toLowerCase().includes(lower)).slice(0, 2),
      ].map((text, i) => ({
        id: `match-${i}`,
        text,
        type: 'recent' as const,
      }));

      // Add "did you mean" if no exact matches
      const didYouMean = matched.length === 0 ? [{
        id: 'did-you-mean',
        text: `هل تقصد "${input}"؟`,
        type: 'did-you-mean' as const,
      }] : [];

      // Add "ask pharmacist" option
      const askPharmacist = [{
        id: 'ask-pharmacist',
        text: 'اسأل صيدلياً',
        type: 'pharmacist' as const,
      }];

      setSuggestions([...matched, ...didYouMean, ...askPharmacist]);
      setIsLoading(false);
    }, 300);
  }, [recentSearches, trendingSearches, categories]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    updateSuggestions(value);
    setShowSuggestions(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query.trim());
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'pharmacist') {
      // Navigate to pharmacist chat
      window.location.href = `/${locale}/chat?type=pharmacist`;
    } else {
      onSearch?.(suggestion.text);
      setQuery(suggestion.text);
    }
    setShowSuggestions(false);
  };

  const clearQuery = () => {
    setQuery('');
    setShowSuggestions(true);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isRTL = locale === 'ar' || locale === 'ur' || locale === 'fa';

  return (
    <form onSubmit={handleSubmit} className={styles.container} role="search">
      <div className={styles.inputWrapper}>
        <label htmlFor="search-input" className={styles.srOnly}>
          {locale === 'ar' ? 'ابحث في الموقع' : 'Search site'}
        </label>
        <input
          ref={inputRef}
          id="search-input"
          type="search"
          autoComplete="off"
          value={query}
          onChange={handleChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder || (locale === 'ar' ? 'ابحث عن أدوية، أطباء، خدمات...' : 'Search medications, doctors, services...')}
          className={`${styles.input} ${query ? styles.hasValue : ''}`}
          dir={isRTL ? 'rtl' : 'ltr'}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={showSuggestions && suggestions.length > 0}
        />
        {query && (
          <button
            type="button"
            onClick={clearQuery}
            className={styles.clearBtn}
            aria-label={locale === 'ar' ? 'مسح البحث' : 'Clear search'}
          >
            <X size={18} />
          </button>
        )}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!query.trim() || isLoading}
          aria-label={locale === 'ar' ? 'بحث' : 'Search'}
        >
          {isLoading ? (
            <Loader2 size={18} className={styles.spinner} />
          ) : (
            <MagnifyingGlass size={18} />
          )}
        </button>
      </div>

      {/* Voice search button */}
      <button
        type="button"
        className={styles.voiceBtn}
        aria-label={locale === 'ar' ? 'بحث صوتي' : 'Voice search'}
      >
        <Mic2 size={20} />
      </button>

      {/* Barcode scan button */}
      <button
        type="button"
        className={styles.barcodeBtn}
        aria-label={locale === 'ar' ? 'مسح الباركود' : 'Scan barcode'}
      >
        <Barcode size={20} />
      </button>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          id="search-suggestions"
          className={styles.suggestions}
          role="listbox"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`${styles.suggestion} ${styles[suggestion.type]}`}
              role="option"
            >
              <span className={styles.suggestionText}>{suggestion.text}</span>
              {suggestion.type === 'recent' && (
                <span className={styles.badge}>{locale === 'ar' ? 'مؤخراً' : 'Recent'}</span>
              )}
              {suggestion.type === 'trending' && (
                <span className={styles.badge}>{locale === 'ar' ? 'رائج' : 'Trending'}</span>
              )}
              {suggestion.type === 'category' && (
                <span className={styles.badge}>{suggestion.category}</span>
              )}
              {suggestion.type === 'did-you-mean' && (
                <ChevronDown size={16} className={styles.didYouMeanIcon} />
              )}
              {suggestion.type === 'pharmacist' && (
                <span className={styles.pharmacistIcon}>💊</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results helper */}
      {showSuggestions && suggestions.length === 0 && query && (
        <div className={styles.noResults}>
          <p>{locale === 'ar' ? 'لا توجد نتائج لـ' : 'No results for'} <strong>"{query}"</strong></p>
          <button
            type="button"
            className={styles.askPharmacistBtn}
            onClick={() => window.location.href = `/${locale}/chat?type=pharmacist`}
          >
            {locale === 'ar' ? 'اسأل صيدلياً' : 'Ask a pharmacist'}
          </button>
        </div>
      )}
    </form>
  );
}

export default SearchBar;
