// File: pages/dashboard/index.tsx
import React, { useEffect, useState } from 'react';
// No need for Head from 'next/head' here if DashboardLayout handles the main title
import DashboardLayout from '../../components/dashboard/DashboardLayout'; // Adjust path if necessary
import ArticleList from '../../components/dashboard/ArticleList';   // Adjust path if necessary
import { IArticle } from '../../models/Article';                   // Adjust path if necessary

// Interface for the API response from /api/articles
interface FetchArticlesApiResponse {
  articles?: IArticle[];
  error?: string;
  message?: string;
}

const MainDashboardPage: React.FC = () => { // Renamed to MainDashboardPage for clarity, can be DashboardPage
  const [articles, setArticles] = useState<IArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/articles');
        if (!response.ok) {
          const errorData: FetchArticlesApiResponse = await response.json();
          throw new Error(errorData.error || errorData.message || `Failed to fetch articles: ${response.status}`);
        }
        const data: FetchArticlesApiResponse = await response.json();
        setArticles(data.articles || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error("Failed to fetch articles for dashboard:", err);
        setArticles([]); // Clear articles on error
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []); // Empty dependency array means this runs once on mount

  return (
    <DashboardLayout pageTitle="Article Feed - My Aggregator">
      {/* The <Head> component for the title is now handled by DashboardLayout.
        The main container div with padding is also handled by DashboardLayout's <main> tag.
        So, we start directly with the content specific to this page.
      */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Aggregated News Feed</h1>
        <p className="text-md md:text-lg text-gray-600">Your latest articles from various sources.</p>
      </header>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <p className="text-xl text-gray-500">Loading articles...</p>
          {/* You could add a spinner SVG here */}
        </div>
      )}

      {error && !loading && ( // Show error only if not loading
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error Loading Articles</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <div className="text-center py-10 bg-white shadow-md rounded-lg p-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No articles found</h3>
            <p className="mt-1 text-sm text-gray-500">Try fetching some sources or check back later.</p>
        </div>
      )}

      {!loading && !error && articles.length > 0 && (
        <ArticleList articles={articles} />
      )}
    </DashboardLayout>
  );
};

export default MainDashboardPage; // Or DashboardPage if you prefer