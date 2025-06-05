// File: components/articles/ArticleCard.tsx
import React, { useState } from 'react';
import { IArticle } from '../../models/Article'; // Adjust path if needed
import CategoryButtons from './CategoryButtons';

interface ArticleCardProps {
  article: IArticle;
  onArticleVisibilityChange: (articleId: string, isHidden: boolean) => void;
  onArticleDelete: (articleId: string) => void;
  categorizationMode?: boolean;
  onCategoryUpdate?: (articleId: string, updates: { newsCategory?: string; techCategory?: string; categoryRationale?: string }) => Promise<void>;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ 
  article, 
  onArticleVisibilityChange, 
  onArticleDelete,
  categorizationMode = false,
  onCategoryUpdate
}) => {
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

        <div className="mt-auto flex justify-end items-center pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              title="Read full article"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </a>
            <button
              onClick={handleToggleHidden}
              disabled={isUpdatingVisibility || isDeleting}
              className={`p-1.5 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed
                ${article.isHidden
                  ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              title={article.isHidden ? 'Show article' : 'Hide article'}
            >
              {isUpdatingVisibility ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : article.isHidden ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              )}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || isUpdatingVisibility}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              title="Delete article"
            >
              {isDeleting ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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

        {/* Category Buttons - Only show in categorization mode */}
        {categorizationMode && onCategoryUpdate && (
          <CategoryButtons 
            article={article}
            onCategoryUpdate={onCategoryUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default ArticleCard;