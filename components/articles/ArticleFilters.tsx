import React, { useState, useEffect, useRef } from 'react';

export interface FilterOptions {
  source: string;
  startDate: string;
  endDate: string;
  limit: number;
  sortBy: 'publishedDate' | 'title' | 'sourceName' | 'fetchedAt';
  sortOrder: 'asc' | 'desc';
  includeHidden: boolean;
  search?: string;
}

interface ArticleFiltersProps {
  onApplyFilters: (filters: FilterOptions) => void;
  onResetFilters: () => void;
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
  search: '',
};

const SORT_OPTIONS = [
  { value: 'publishedDate', label: 'Date' },
  { value: 'title', label: 'Title' },
  { value: 'sourceName', label: 'Source' },
  { value: 'fetchedAt', label: 'Fetched' },
];

const LIMIT_PRESETS = [25, 50, 100, 200, 500];

const ArticleFilters: React.FC<ArticleFiltersProps> = ({
  onApplyFilters,
  onResetFilters,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<FilterOptions>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [sources, setSources] = useState<string[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const sourcesRef = useRef<HTMLDivElement>(null);

  // Fetch available sources
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetch('/api/articles/sources');
        const data = await response.json();
        
        if (data.success && data.data?.sources) {
          setSources(data.data.sources);
        } else {
          console.error('Failed to fetch sources:', data.message);
        }
      } catch (error) {
        console.error('Failed to fetch sources:', error);
      } finally {
        setLoadingSources(false);
      }
    };

    fetchSources();
  }, []);

  // Handle click outside to close sources panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sourcesRef.current && !sourcesRef.current.contains(event.target as Node)) {
        setShowSourcesPanel(false);
      }
    };

    if (showSourcesPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSourcesPanel]);

  const handleFilterChange = (key: keyof FilterOptions, value: string | number | boolean) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Auto-apply for most changes except search
    if (key !== 'search') {
      onApplyFilters(newFilters);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleSearchSubmit = () => {
    onApplyFilters(filters);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchInput('');
    onResetFilters();
  };

  const toggleSource = (sourceName: string) => {
    const newSource = filters.source === sourceName ? '' : sourceName;
    handleFilterChange('source', newSource);
  };

  const clearDateRange = () => {
    const newFilters = { ...filters, startDate: '', endDate: '' };
    setFilters(newFilters);
    onApplyFilters(newFilters);
  };

  const setQuickDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const newFilters = {
      ...filters,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
    setFilters(newFilters);
    onApplyFilters(newFilters);
  };

  // Check if any non-default filters are applied
  const hasActiveFilters = 
    filters.source !== DEFAULT_FILTERS.source ||
    filters.startDate !== DEFAULT_FILTERS.startDate ||
    filters.endDate !== DEFAULT_FILTERS.endDate ||
    filters.limit !== DEFAULT_FILTERS.limit ||
    filters.sortBy !== DEFAULT_FILTERS.sortBy ||
    filters.sortOrder !== DEFAULT_FILTERS.sortOrder ||
    filters.includeHidden !== DEFAULT_FILTERS.includeHidden ||
    (filters.search && filters.search.trim() !== '');

  const activeFiltersCount = [
    filters.source,
    filters.startDate || filters.endDate,
    filters.includeHidden,
    filters.search?.trim(),
  ].filter(Boolean).length;

  return (
    <div className="border-b border-gray-100 bg-gray-50/50 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-gray-700">Filters</h2>
        <div className="flex items-center space-x-2">
          {activeFiltersCount > 0 && (
            <span className="bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
              {activeFiltersCount}
            </span>
          )}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
            className="w-full px-2 py-1 pr-6 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-400"
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-1 top-1 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
        
        {/* Sort */}
        <div>
          <div className="text-gray-600 mb-1">Sort</div>
          <div className="grid grid-cols-2 gap-0.5 mb-1">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('sortBy', option.value)}
                className={`px-2 py-1 rounded text-xs ${
                  filters.sortBy === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            <button
              onClick={() => handleFilterChange('sortOrder', 'desc')}
              className={`px-2 py-1 rounded text-xs ${
                filters.sortOrder === 'desc'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              ↓
            </button>
            <button
              onClick={() => handleFilterChange('sortOrder', 'asc')}
              className={`px-2 py-1 rounded text-xs ${
                filters.sortOrder === 'asc'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              ↑
            </button>
          </div>
        </div>

        {/* Source */}
        <div>
          <div className="text-gray-600 mb-1">Source</div>
          <div className="relative" ref={sourcesRef}>
            <button
              onClick={() => setShowSourcesPanel(!showSourcesPanel)}
              className="w-full px-2 py-1 bg-white border border-gray-200 rounded text-left hover:bg-gray-50 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{filters.source || 'All'}</span>
                <span className="text-gray-400">▼</span>
              </div>
            </button>
            
            {showSourcesPanel && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-32 overflow-y-auto">
                {loadingSources ? (
                  <div className="p-2 text-center text-gray-500 text-xs">Loading...</div>
                ) : (
                  <div>
                    <button
                      onClick={() => {
                        handleFilterChange('source', '');
                        setShowSourcesPanel(false);
                      }}
                      className={`w-full px-2 py-1 text-left text-xs hover:bg-gray-50 ${
                        !filters.source ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      All
                    </button>
                    {sources.map((source) => (
                      <button
                        key={source}
                        onClick={() => {
                          toggleSource(source);
                          setShowSourcesPanel(false);
                        }}
                        className={`w-full px-2 py-1 text-left text-xs hover:bg-gray-50 truncate ${
                          filters.source === source ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        {source}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-600">Date</span>
            {(filters.startDate || filters.endDate) && (
              <button onClick={clearDateRange} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-0.5 mb-1">
            {[
              { days: 1, label: '1d' },
              { days: 7, label: '7d' },
              { days: 30, label: '30d' },
            ].map((preset) => (
              <button
                key={preset.days}
                onClick={() => setQuickDateRange(preset.days)}
                className="px-1 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-xs"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="px-1 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="px-1 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Limit & Options */}
        <div>
          <div className="text-gray-600 mb-1">Limit</div>
          <div className="grid grid-cols-3 gap-0.5 mb-1">
            {LIMIT_PRESETS.slice(0, 3).map((limit) => (
              <button
                key={limit}
                onClick={() => handleFilterChange('limit', limit)}
                className={`px-1 py-1 rounded text-xs ${
                  filters.limit === limit
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {limit}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-0.5 mb-1">
            {LIMIT_PRESETS.slice(3).map((limit) => (
              <button
                key={limit}
                onClick={() => handleFilterChange('limit', limit)}
                className={`px-1 py-1 rounded text-xs ${
                  filters.limit === limit
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {limit}
              </button>
            ))}
            <button
              onClick={() => handleFilterChange('limit', 0)}
              className={`px-1 py-1 rounded text-xs ${
                filters.limit === 0
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All
            </button>
          </div>
          
          {/* Hidden Toggle */}
          <button
            onClick={() => handleFilterChange('includeHidden', !filters.includeHidden)}
            className={`w-full py-1 rounded text-xs ${
              filters.includeHidden
                ? 'bg-blue-500 text-white'
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {filters.includeHidden ? 'Show Hidden' : 'Hide Hidden'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticleFilters;
