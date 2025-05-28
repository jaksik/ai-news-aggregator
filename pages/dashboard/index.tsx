// File: pages/dashboard.tsx
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import ArticleList from '../../components/dashboard/ArticleList'; // Adjust the import path as needed
import { IArticle } from '../../models/Article'; // Assuming IArticle is also suitable for frontend use

// Define a simpler type for frontend if IArticle has Mongoose specific Document parts you don't need
// For now, we'll use IArticle and assume it's okay.
// export interface FrontendArticle {
//   _id: string;
//   title: string;
//   link: string;
//   sourceName: string;
//   publishedDate?: string; // Dates will be strings after JSON stringify/parse
//   descriptionSnippet?: string;
//   fetchedAt: string;
//   isRead: boolean;
//   isStarred: boolean;
//   // Add other fields as needed
// }

const DashboardPage: React.FC = () => {
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
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch articles: ${response.status}`);
        }
        const data = await response.json();
        setArticles(data.articles || []); // Assuming the API returns { articles: [...] }
      } catch (err: any) {
        setError(err.message);
        console.error("Failed to fetch articles for dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []); // Empty dependency array means this runs once on mount

  return (
    <>
      <Head>
        <title>News Aggregator Dashboard</title>
      </Head>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Aggregated News Dashboard</h1>
          <p className="text-lg text-gray-600">Your curated feed from various sources.</p>
        </header>

        {loading && (
          <div className="text-center py-10">
            <p className="text-xl text-gray-500">Loading articles...</p>
            {/* You can add a spinner component here */}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="text-center py-10">
            <p className="text-xl text-gray-500">No articles found. Try fetching some sources!</p>
          </div>
        )}

        {!loading && !error && articles.length > 0 && (
          <ArticleList articles={articles} />
        )}
      </div>
    </>
  );
};

export default DashboardPage;