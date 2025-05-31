// File: pages/dashboard/index.tsx
import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import ArticleList from '../../../components/dashboard/ArticleList';
import AuthWrapper from '../../../components/auth/AuthWrapper';
import { IArticle } from '../../../models/Article';
import { SortOption } from '../../../components/ui/SortControls';
import { sortArticles } from '../../../lib/utils/sortUtils';

interface FetchArticlesApiResponse {
  articles?: IArticle[];
  error?: string;
  message?: string;
}

const MainDashboardPage: React.FC = () => {
  const [articles, setArticles] = useState<IArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add sorting state
  const [currentSort, setCurrentSort] = useState<SortOption>({
    field: 'publishedDate',
    direction: 'desc',
    label: 'Newest First'
  });

  // Sort articles whenever articles or sort changes
  const sortedArticles = React.useMemo(() => {
    return sortArticles(articles, currentSort.field, currentSort.direction);
  }, [articles, currentSort.field, currentSort.direction]);

  // Handle sort changes
  const handleSortChange = useCallback((newSort: SortOption) => {
    setCurrentSort(newSort);
  }, []);

  // Memoize fetchArticles so it can be a stable dependency
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/articles'); // This API needs to be updated later to filter hidden articles
      if (!response.ok) {
        const errorData: FetchArticlesApiResponse = await response.json();
        throw new Error(errorData.error || errorData.message || `Failed to fetch articles: ${response.status}`);
      }
      const data: FetchArticlesApiResponse = await response.json();
      setArticles(data.articles || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error("Failed to fetch articles for dashboard:", err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array, fetchArticles itself is stable

  // Add a new callback to handle article visibility changes locally
  const handleArticleVisibilityChange = useCallback(async (articleId: string, isHidden: boolean) => {
    try {
      // Update the article visibility on the server
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PUT', // Changed from 'PATCH' to 'PUT'
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
    } catch (err) {
      console.error('Failed to update article visibility:', err);
      // Optionally show an error message to the user
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Article Feed - My Aggregator">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Aggregated News Feed</h1>
          <p className="text-md md:text-lg text-gray-600">Your latest articles from various sources.</p>
        </header>

        {loading && (
          <div className="text-center py-8">
            <p>Loading articles...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="text-center py-8 text-red-600">
            <p>Error: {error}</p>
          </div>
        )}
        
        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-8">
            <p>No articles found.</p>
          </div>
        )}

        {!loading && !error && articles.length > 0 && (
          <ArticleList 
            articles={sortedArticles}
            onArticleVisibilityChange={handleArticleVisibilityChange}
            currentSort={currentSort}
            onSortChange={handleSortChange}
          />
        )}
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default MainDashboardPage;