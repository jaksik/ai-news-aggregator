import React, { useState, useEffect } from 'react';

export interface FilterOptions {
  source: string;
  startDate: string;
  endDate: string;
  limit: number;
  sortBy: 'publishedDate' | 'title' | 'sourceName' | 'fetchedAt';
  sortOrder: 'asc' | 'desc';
  includeHidden: boolean;
}

interface ArticleFiltersProps {
  onApplyFilters: (filters: FilterOptions) => void;
  onResetFilters: () => void;
  loading?: boolean;
  initialFilters?: Partial<FilterOptions>;
}

const DEFAULT_FILTERS: FilterOptions = {
  source: '',
  startDate: '',
  endDate: '',
  limit: 100,
  sortBy: 'publishedDate',
  sortOrder: 'desc',
  includeHidden: false,
};

const LIMIT_OPTIONS = [
  { value: 25, label: '25 articles' },
  { value: 50, label: '50 articles' },
  { value: 100, label: '100 articles' },
  { value: 200, label: '200 articles' },
  { value: 500, label: '500 articles' },
  { value: 0, label: 'All articles' },
];

const SORT_OPTIONS = [
  { value: 'publishedDate-desc', label: 'Newest First', field: 'publishedDate', order: 'desc' },
  { value: 'publishedDate-asc', label: 'Oldest First', field: 'publishedDate', order: 'asc' },
  { value: 'title-asc', label: 'Title A-Z', field: 'title', order: 'asc' },
  { value: 'title-desc', label: 'Title Z-A', field: 'title', order: 'desc' },
  { value: 'sourceName-asc', label: 'Source A-Z', field: 'sourceName', order: 'asc' },
  { value: 'sourceName-desc', label: 'Source Z-A', field: 'sourceName', order: 'desc' },
  { value: 'fetchedAt-desc', label: 'Recently Fetched', field: 'fetchedAt', order: 'desc' },
  { value: 'fetchedAt-asc', label: 'Oldest Fetched', field: 'fetchedAt', order: 'asc' },
];

const ArticleFilters: React.FC<ArticleFiltersProps> = ({
  onApplyFilters,
  onResetFilters,
  loading = false,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<FilterOptions>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [sources, setSources] = useState<string[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch available sources
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetch('/api/sources/list');
        if (response.ok) {
          const data = await response.json();
          setSources(data.sources || []);
        }
      } catch (error) {
        console.error('Failed to fetch sources:', error);
      } finally {
        setLoadingSources(false);
      }
    };

    fetchSources();
  }, []);

  const handleFilterChange = (key: keyof FilterOptions, value: string | number | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find(opt => opt.value === value);
    if (option) {
      setFilters(prev => ({
        ...prev,
        sortBy: option.field as FilterOptions['sortBy'],
        sortOrder: option.order as FilterOptions['sortOrder'],
      }));
    }
  };

  const handleApply = () => {
    onApplyFilters(filters);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    onResetFilters();
  };

  const currentSortValue = `${filters.sortBy}-${filters.sortOrder}`;

  // Check if any non-default filters are applied
  const hasActiveFilters = 
    filters.source !== DEFAULT_FILTERS.source ||
    filters.startDate !== DEFAULT_FILTERS.startDate ||
    filters.endDate !== DEFAULT_FILTERS.endDate ||
    filters.limit !== DEFAULT_FILTERS.limit ||
    filters.sortBy !== DEFAULT_FILTERS.sortBy ||
    filters.sortOrder !== DEFAULT_FILTERS.sortOrder ||
    filters.includeHidden !== DEFAULT_FILTERS.includeHidden;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      {/* Header with expand/collapse toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-800">Filters & Sorting</h3>
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              Filters Active
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <svg
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Quick actions always visible */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            value={currentSortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Limit:</label>
          <select
            value={filters.limit}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {LIMIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Hidden Articles Toggle */}
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <span className="text-sm font-medium text-gray-700">Show hidden</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={filters.includeHidden}
                onChange={(e) => handleFilterChange('includeHidden', e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-8 h-4 rounded-full transition-colors duration-200 ease-in-out ${
                  filters.includeHidden ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    filters.includeHidden ? 'translate-x-4' : 'translate-x-0.5'
                  } mt-0.5`}
                />
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingSources}
              >
                <option value="">All sources</option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              {loadingSources && (
                <p className="text-xs text-gray-500 mt-1">Loading sources...</p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleReset}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleFilters;
