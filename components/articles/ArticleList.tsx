// File: components/articles/ArticleList.tsx
import React from 'react';
import { IArticle } from '../../models/Article';
import ArticleCard from './ArticleCard';

interface ArticleListProps {
  articles: IArticle[];
  onArticleVisibilityChange: (articleId: string, isHidden: boolean) => void;
  onArticleDelete: (articleId: string) => void;
  total?: number;
  loading?: boolean;
}

const ArticleList: React.FC<ArticleListProps> = ({ 
  articles, 
  onArticleVisibilityChange,
  onArticleDelete,
  total,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-500">Loading articles...</span>
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No articles found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or check back later for new articles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results summary */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {articles.length} article{articles.length !== 1 ? 's' : ''}
          {total !== undefined && total !== articles.length && (
            <span> of {total} total</span>
          )}
        </div>
      </div>
      
      {/* Articles grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <ArticleCard 
            key={article._id?.toString() || article.link} 
            article={article} 
            onArticleVisibilityChange={onArticleVisibilityChange}
            onArticleDelete={onArticleDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default ArticleList;