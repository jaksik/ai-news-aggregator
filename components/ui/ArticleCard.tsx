// File: components/ui/ArticleCard.tsx
import React, { useState } from 'react';
import { IArticle } from '../../models/Article'; // Adjust path if needed

interface ArticleCardProps {
  article: IArticle;
  onArticleVisibilityChange: () => void; // Callback to refresh the article list
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onArticleVisibilityChange }) => {
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        // hour: '2-digit', minute: '2-digit', // Simpler date for card view
      });
    } catch {
      return String(dateString);
    }
  };

  const handleToggleHidden = async () => {
    if (!article._id) {
      setActionError("Article ID is missing.");
      return;
    }
    setIsUpdatingVisibility(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/articles/${article._id.toString()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isHidden: !article.isHidden }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to update article visibility');
      }
      onArticleVisibilityChange(); // Trigger refresh in the parent component
      // No need to update local article state if parent re-fetches,
      // but you could if you want an immediate optimistic update.
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setActionError(errorMessage || 'Could not update visibility.');
      console.error("Error toggling article visibility:", errorMessage);
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  return (
    <div className={`bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full transition-opacity duration-300 ${article.isHidden ? 'opacity-50 bg-gray-100' : 'opacity-100'}`}>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className={`text-lg font-semibold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors ${article.isHidden ? 'line-through text-gray-500' : ''}`}>
          <a href={article.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {article.title || 'Untitled Article'}
          </a>
        </h3>
        <p className="text-xs text-gray-500 mb-1">
          <strong>Source:</strong> {article.sourceName}
        </p>
        <p className="text-xs text-gray-500 mb-3">
          <strong>Published:</strong> {formatDate(article.publishedDate)}
        </p>
        <p className={`text-gray-600 text-sm mb-4 flex-grow ${article.isHidden ? 'italic' : ''}`}>
          {article.descriptionSnippet || 'No description available.'}
        </p>
        
        {actionError && <p className="text-xs text-red-500 mb-2">{actionError}</p>}

        <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-200">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
          >
            Read More &rarr;
          </a>
          <button
            onClick={handleToggleHidden}
            disabled={isUpdatingVisibility}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-70
              ${article.isHidden
                ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
          >
            {isUpdatingVisibility ? '...' : (article.isHidden ? 'Unhide' : 'Hide')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;