/**
 * SearchBar Component
 *
 * A comprehensive search bar component supporting basic search, search history,
 * search suggestions, and advanced search functionality.
 *
 * Features:
 * - Real-time search with debouncing
 * - Search history management
 * - Search suggestions and autocomplete
 * - Advanced search with filters
 * - Keyboard navigation support
 * - Responsive design
 * - Full accessibility support
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */

import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Types
export interface SearchFilter {
  value: string;
  label: string;
}

export interface AdvancedSearchFilters {
  query: string;
  filters?: {
    field?: string;
    dateRange?: {
      from: Date;
      to: Date;
    };
    tags?: string[];
  };
}

export interface SearchBarProps {
  className?: string;
  placeholder?: string;
  value?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  searchHistory?: string[];
  onHistoryAdd?: (query: string) => void;
  onHistoryClear?: () => void;
  onSuggestionsFetch?: (query: string) => Promise<string[]>;
  filters?: SearchFilter[];
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  showAdvancedSearch?: boolean;
  onAdvancedSearch?: (filters: AdvancedSearchFilters) => void;
  debounceMs?: number;
  loading?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  className,
  placeholder = 'Search...',
  value = '',
  onSearch,
  onClear,
  searchHistory = [],
  onHistoryAdd,
  onHistoryClear,
  onSuggestionsFetch,
  filters = [],
  activeFilter = 'all',
  onFilterChange,
  showAdvancedSearch = false,
  onAdvancedSearch,
  debounceMs = 300,
  loading = false,
  disabled = false,
  autoFocus = false
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAdvancedDialog, setShowAdvancedDialog] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debounced search
  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (query.trim()) {
          setIsSearching(true);
          onSearch?.(query);
          onHistoryAdd?.(query);
        }
        setIsSearching(false);
      }, debounceMs);
    },
    [onSearch, onHistoryAdd, debounceMs]
  );

  // Fetch suggestions
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (onSuggestionsFetch && query.trim()) {
        try {
          const results = await onSuggestionsFetch(query);
          setSuggestions(results);
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    },
    [onSuggestionsFetch]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);

      if (onSearch) {
        debouncedSearch(query);
      }

      fetchSuggestions(query);
      setShowDropdown(true);
    },
    [debouncedSearch, fetchSuggestions, onSearch]
  );

  // Handle search submit
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();

      if (searchQuery.trim()) {
        setIsSearching(true);
        onSearch?.(searchQuery);
        onHistoryAdd?.(searchQuery);
        setShowDropdown(false);

        setTimeout(() => {
          setIsSearching(false);
        }, 1000);
      }
    },
    [searchQuery, onSearch, onHistoryAdd]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onClear?.();
    onSearch?.('');
    inputRef.current?.focus();
  }, [onClear, onSearch]);

  // Handle history item click
  const handleHistoryItemClick = useCallback(
    (query: string) => {
      setSearchQuery(query);
      onSearch?.(query);
      onHistoryAdd?.(query);
      setShowDropdown(false);
    },
    [onSearch, onHistoryAdd]
  );

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setSearchQuery(suggestion);
      onSearch?.(suggestion);
      onHistoryAdd?.(suggestion);
      setShowDropdown(false);
    },
    [onSearch, onHistoryAdd]
  );

  // Handle advanced search
  const handleAdvancedSearch = useCallback(
    (filters: AdvancedSearchFilters) => {
      onAdvancedSearch?.(filters);
      setShowAdvancedDialog(false);
    },
    [onAdvancedSearch]
  );

  // Focus and blur handlers
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowDropdown(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Delay hiding dropdown to allow clicking on suggestions
    setTimeout(() => setShowDropdown(false), 200);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          setShowDropdown(false);
          inputRef.current?.blur();
          break;
        case 'ArrowDown':
          e.preventDefault();
          // Focus first suggestion
          const firstSuggestion = document.querySelector('[data-suggestion-index="0"]');
          if (firstSuggestion) {
            (firstSuggestion as HTMLElement).focus();
          }
          break;
      }
    },
    []
  );

  // Filter selected items for dropdown
  const dropdownItems = React.useMemo(() => {
    const items: Array<{ type: 'history' | 'suggestion'; text: string; index: number }> = [];

    // Add history items
    if (searchHistory.length > 0 && searchQuery.length === 0) {
      searchHistory.slice(0, 5).forEach((item, index) => {
        items.push({ type: 'history', text: item, index });
      });
    }

    // Add suggestions
    if (suggestions.length > 0) {
      suggestions.slice(0, 8).forEach((item, index) => {
        items.push({ type: 'suggestion', text: item, index });
      });
    }

    return items;
  }, [searchHistory, suggestions, searchQuery]);

  return (
    <div
      data-testid="search-bar"
      className={cn(
        'relative w-full max-w-2xl',
        isMobile && 'mobile-layout',
        className
      )}
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          {/* Search input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              autoFocus={autoFocus}
              className={cn(
                'w-full px-4 py-2 pr-10 border rounded-lg bg-background',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isMobile && 'mobile-input text-sm',
                className
              )}
              role="searchbox"
              aria-label={placeholder}
              aria-expanded={showDropdown}
              aria-haspopup="listbox"
            />

            {/* Clear button */}
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                aria-label="Clear search"
                data-testid="clear-button"
              >
                ✕
              </Button>
            )}
          </div>

          {/* Search button */}
          <Button
            type="submit"
            disabled={disabled || isSearching || !searchQuery.trim()}
            loading={isSearching}
            className={cn('ml-2', isMobile && 'h-8 px-3')}
            aria-label={isSearching ? 'Searching...' : 'Search'}
            data-testid="search-button"
          >
            {isSearching ? '🔍' : 'Search'}
          </Button>
        </div>

        {/* Filter dropdown */}
        {filters.length > 0 && (
          <div className="mt-2">
            <select
              value={activeFilter}
              onChange={(e) => onFilterChange?.(e.target.value)}
              className="px-2 py-1 text-sm border rounded-md bg-background"
              aria-label="Filter search by"
            >
              {filters.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Advanced search button */}
        {showAdvancedSearch && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedDialog(true)}
            className="mt-2"
          >
            Advanced Search
          </Button>
        )}
      </form>

      {/* Dropdown with history and suggestions */}
      {showDropdown && dropdownItems.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-64 overflow-y-auto"
          role="listbox"
          aria-label="Search suggestions and history"
        >
          {/* History section */}
          {searchHistory.length > 0 && searchQuery.length === 0 && (
            <div className="p-2 border-b">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Recent Searches
                </h3>
                {onHistoryClear && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onHistoryClear}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                {searchHistory.slice(0, 5).map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    data-suggestion-index={index}
                    onClick={() => handleHistoryItemClick(item)}
                    className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded transition-colors"
                  >
                    🕐 {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions section */}
          {suggestions.length > 0 && (
            <div className="p-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Suggestions
              </h3>
              <div className="space-y-1">
                {suggestions.slice(0, 8).map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    data-suggestion-index={searchHistory.length > 0 ? index + 5 : index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-2 py-1 text-sm hover:bg-muted rounded transition-colors"
                  >
                    💡 {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced search dialog */}
      {showAdvancedDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Advanced Search</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Search Query</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter search terms..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Search In</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option value="all">All Fields</option>
                  <option value="title">Title</option>
                  <option value="content">Content</option>
                  <option value="tags">Tags</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAdvancedSearch({
                    query: searchQuery,
                    filters: { field: 'all' }
                  })}
                >
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {isSearching && `Searching for "${searchQuery}"`}
        {searchQuery && !isSearching && `Found results for "${searchQuery}"`}
      </div>
    </div>
  );
};

SearchBar.displayName = 'SearchBar';

export { SearchBar };