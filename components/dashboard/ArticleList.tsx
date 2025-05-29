// File: components/dashboard/ArticleList.tsx
import React from 'react';
import { IArticle } from '../../models/Article'; // Or your FrontendArticle type
import ArticleCard from '../ui/ArticleCard'; 

interface ArticleListProps {
  articles: IArticle[];
  onArticleVisibilityChange: () => void; // Add this prop
}

const ArticleList: React.FC<ArticleListProps> = ({ articles, onArticleVisibilityChange }) => {
  if (!articles || articles.length === 0) {
    return <p className="text-center text-gray-500">No articles to display.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <ArticleCard 
          key={article._id?.toString() || article.link} 
          article={article} 
          onArticleVisibilityChange={onArticleVisibilityChange} // Pass it down
        />
      ))}
    </div>
  );
};

export default ArticleList;