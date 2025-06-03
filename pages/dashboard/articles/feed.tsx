// File: pages/dashboard/articles/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import ArticleList from '../../../components/articles/ArticleList';
import ArticleFilters, { FilterOptions } from '../../../components/articles/ArticleFilters';
import AuthWrapper from '../../../components/auth/AuthWrapper';
import { IArticle } from '../../../models/Article';

interface FetchArticlesApiResponse {
  success: boolean;
  data?: IArticle[];
  message?: string;
  meta?: {
    pagination?: {
      total?: number;
    };
  };
  error?: string;
}

const MainDashboardPage: React.FC = () => {
  const [articles, setArticles] = useState<IArticle[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categorizationMode, setCategorizationMode] = useState<boolean>(false);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    source: '',
    startDate: '',
    endDate: '',
    limit: 100,
    sortBy: 'publishedDate',
    sortOrder: 'desc',
    includeHidden: false,
    search: '',
  });

  // Build query string from filters
  const buildQueryString = useCallback((filters: FilterOptions): string => {
    const params = new URLSearchParams();
    
    if (filters.source) params.append('source', filters.source);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
    params.append('sortBy', filters.sortBy);
    params.append('sortOrder', filters.sortOrder);
    params.append('includeHidden', filters.includeHidden.toString());
    
    return params.toString();
  }, []);

  // Fetch articles with current filters
  const fetchArticles = useCallback(async (filters: FilterOptions) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = buildQueryString(filters);
      const response = await fetch(`/api/articles?${queryString}`);
      
      if (!response.ok) {
        const errorData: FetchArticlesApiResponse = await response.json();
        throw new Error(errorData.error || errorData.message || `Failed to fetch articles: ${response.status}`);
      }
      
      const data: FetchArticlesApiResponse = await response.json();
      setArticles(data.data || []);
      setTotal(data.meta?.pagination?.total || 0);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error("Failed to fetch articles for dashboard:", err);
      setArticles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  // Handle filter changes
  const handleApplyFilters = useCallback((filters: FilterOptions) => {
    setCurrentFilters(filters);
    fetchArticles(filters);
  }, [fetchArticles]);

  // Handle filter reset
  const handleResetFilters = useCallback(() => {
    const defaultFilters: FilterOptions = {
      source: '',
      startDate: '',
      endDate: '',
      limit: 100,
      sortBy: 'publishedDate',
      sortOrder: 'desc',
      includeHidden: false,
      search: '',
    };
    setCurrentFilters(defaultFilters);
    fetchArticles(defaultFilters);
  }, [fetchArticles]);

  // Handle article visibility changes
  const handleArticleVisibilityChange = useCallback(async (articleId: string, isHidden: boolean) => {
    try {
      // Update the article visibility on the server
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isHidden }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Update the local state immediately without refetching
      setArticles(prevArticles => 
        prevArticles.map(article => 
          article._id === articleId 
            ? { ...article, isHidden } as IArticle
            : article
        )
      );

      // If the current filter excludes hidden articles and we just hid an article,
      // remove it from the current view
      if (!currentFilters.includeHidden && isHidden) {
        setArticles(prevArticles => 
          prevArticles.filter(article => article._id !== articleId)
        );
      }
    } catch (err) {
      console.error('Failed to update article visibility:', err);
      // Optionally show an error message to the user
    }
  }, [currentFilters.includeHidden]);

  // Handle article deletion
  const handleArticleDelete = useCallback(async (articleId: string) => {
    try {
      // Delete the article on the server
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Remove the article from local state immediately
      setArticles(prevArticles => 
        prevArticles.filter(article => article._id !== articleId)
      );

      // Update total count
      setTotal(prevTotal => Math.max(0, prevTotal - 1));

    } catch (err) {
      console.error('Failed to delete article:', err);
      throw err; // Re-throw so the component can handle the error
    }
  }, []);

  // Handle article categorization
  const handleArticleCategorize = useCallback(async (articleId: string, newsCategory?: string, techCategory?: string) => {
    try {
      const response = await fetch(`/api/articles/${articleId}/categorize`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newsCategory, techCategory }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Update the local state immediately
      setArticles(prevArticles => 
        prevArticles.map(article => 
          article._id === articleId 
            ? { ...article, ...result.data } as IArticle
            : article
        )
      );

    } catch (err) {
      console.error('Failed to categorize article:', err);
      throw err; // Re-throw so the component can handle the error
    }
  }, []);

  // Load articles on initial page load
  useEffect(() => {
    const initialFilters: FilterOptions = {
      source: '',
      startDate: '',
      endDate: '',
      limit: 100,
      sortBy: 'publishedDate',
      sortOrder: 'desc',
      includeHidden: false,
    };
    fetchArticles(initialFilters);
  }, [fetchArticles]); // Only depend on fetchArticles which is stable

  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Article Feed - My Aggregator">
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Aggregated News Feed</h1>
              <p className="text-md md:text-lg text-gray-600">Your latest articles from various sources.</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCategorizationMode(!categorizationMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  categorizationMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {categorizationMode ? 'Exit Categorization' : 'Categorize Mode'}
              </button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <ArticleFilters
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          initialFilters={currentFilters}
        />

        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading articles</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Article List */}
        <ArticleList 
          articles={articles}
          total={total}
          loading={loading}
          onArticleVisibilityChange={handleArticleVisibilityChange}
          onArticleDelete={handleArticleDelete}
          categorizationMode={categorizationMode}
          onArticleCategorize={handleArticleCategorize}
        />
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default MainDashboardPage;