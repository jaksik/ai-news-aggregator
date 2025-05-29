// File: pages/dashboard/index.tsx
import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import ArticleList from '../../components/dashboard/ArticleList';
import { IArticle } from '../../models/Article';

interface FetchArticlesApiResponse {
  articles?: IArticle[];
  error?: string;
  message?: string;
}

const MainDashboardPage: React.FC = () => {
  const [articles, setArticles] = useState<IArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return (
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
          articles={articles} 
          onArticleVisibilityChange={fetchArticles}
        />
      )}
    </DashboardLayout>
  );
};

export default MainDashboardPage;