// File: components/articles/ArticleCard.tsx
import React, { useState } from 'react';
import { IArticle } from '../../models/Article'; // Adjust path if needed

interface ArticleCardProps {
  article: IArticle;
  onArticleVisibilityChange: (articleId: string, isHidden: boolean) => void;
  onArticleDelete: (articleId: string) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onArticleVisibilityChange, onArticleDelete }) => {
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Use UTC methods to avoid timezone conversion
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'UTC'
      }).format(date);
    } catch {
      return String(dateString);
    }
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const handleToggleHidden = async () => {
    if (!article._id) {
      setActionError("Article ID is missing.");
      return;
    }
    setIsUpdatingVisibility(true);
    setActionError(null);
    try {
      // Call the parent's callback function instead of making API call here
      await onArticleVisibilityChange(article._id.toString(), !article.isHidden);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setActionError(errorMessage || 'Could not update visibility.');
      console.error("Error toggling article visibility:", errorMessage);
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleDelete = async () => {
    if (!article._id) {
      setActionError("Article ID is missing.");
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this article?\n\n"${article.title}"\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);
    try {
      await onArticleDelete(article._id.toString());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setActionError(errorMessage || 'Could not delete article.');
      console.error("Error deleting article:", errorMessage);
    } finally {
      setIsDeleting(false);
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
          {truncateText(article.descriptionSnippet || 'No description available.')}
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
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleHidden}
              disabled={isUpdatingVisibility || isDeleting}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-70
                ${article.isHidden
                  ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
            >
              {isUpdatingVisibility ? '...' : (article.isHidden ? 'Unhide' : 'Hide')}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || isUpdatingVisibility}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              title="Delete article"
            >
              {isDeleting ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;