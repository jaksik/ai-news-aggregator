// File: components/dashboard/ArticleList.tsx
import React from 'react';
import { IArticle } from '../../models/Article'; // Or your FrontendArticle type
import ArticleCard from '../ui/ArticleCard'; 
import SortControls, { SortOption } from '../ui/SortControls';

interface ArticleListProps {
  articles: IArticle[];
  onArticleVisibilityChange: (articleId: string, isHidden: boolean) => void;
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  showSortControls?: boolean;
}

const ArticleList: React.FC<ArticleListProps> = ({ 
  articles, 
  onArticleVisibilityChange, 
  currentSort, 
  onSortChange, 
  showSortControls = true 
}) => {
  if (!articles || articles.length === 0) {
    return <p className="text-center text-gray-500">No articles to display.</p>;
  }

  return (
    <div className="space-y-6">
      {showSortControls && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {articles.length} article{articles.length !== 1 ? 's' : ''}
          </div>
          <SortControls 
            currentSort={currentSort} 
            onSortChange={onSortChange} 
          />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <ArticleCard 
            key={article._id?.toString() || article.link} 
            article={article} 
            onArticleVisibilityChange={onArticleVisibilityChange} // Pass it down
          />
        ))}
      </div>
    </div>
  );
};

export default ArticleList;