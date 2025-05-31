// File: components/dashboard/ArticleList.tsx
import React, { useState, useMemo } from 'react';
import { IArticle } from '../../models/Article'; // Or your FrontendArticle type
import ArticleCard from '../ui/ArticleCard'; 
import SortControls, { SortOption } from '../ui/SortControls';

interface ArticleListProps {
  articles: IArticle[];
  onArticleVisibilityChange: (articleId: string, isHidden: boolean) => void;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  showSortControls?: boolean;
  initialShowHidden?: boolean; // New prop to allow parent to control initial state
}

const ArticleList: React.FC<ArticleListProps> = ({ 
  articles, 
  onArticleVisibilityChange, 
  currentSort, 
  onSortChange, 
  showSortControls = true,
  initialShowHidden = false
}) => {
  const [showHiddenArticles, setShowHiddenArticles] = useState(initialShowHidden);

  // Filter articles based on the toggle state
  const filteredArticles = useMemo(() => {
    if (showHiddenArticles) {
      return articles; // Show all articles
    }
    return articles.filter(article => !article.isHidden); // Show only non-hidden articles
  }, [articles, showHiddenArticles]);

  // Count hidden articles for display
  const hiddenCount = useMemo(() => {
    return articles.filter(article => article.isHidden).length;
  }, [articles]);

  if (!articles || articles.length === 0) {
    return <p className="text-center text-gray-500">No articles to display.</p>;
  }

  return (
    <div className="space-y-6">
      {showSortControls && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {filteredArticles.length} of {articles.length} article{articles.length !== 1 ? 's' : ''}
            {!showHiddenArticles && hiddenCount > 0 && (
              <span className="text-gray-500"> ({hiddenCount} hidden)</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* Hidden Articles Toggle Switch */}
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <span className="text-sm text-gray-600">Show hidden</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showHiddenArticles}
                    onChange={(e) => setShowHiddenArticles(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${
                      showHiddenArticles ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                        showHiddenArticles ? 'translate-x-5' : 'translate-x-0.5'
                      } mt-0.5`}
                    />
                  </div>
                </div>
              </label>
              {hiddenCount > 0 && (
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                  {hiddenCount}
                </span>
              )}
            </div>
            <SortControls 
              currentSort={currentSort} 
              onSortChange={onSortChange} 
            />
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.map((article) => (
          <ArticleCard 
            key={article._id?.toString() || article.link} 
            article={article} 
            onArticleVisibilityChange={onArticleVisibilityChange} // Pass it down
          />
        ))}
      </div>

      {filteredArticles.length === 0 && articles.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No articles to display with current filter settings.</p>
          {!showHiddenArticles && hiddenCount > 0 && (
            <p className="text-sm mt-2">
              All {articles.length} articles are hidden. Toggle &ldquo;Show hidden articles&rdquo; to view them.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ArticleList;