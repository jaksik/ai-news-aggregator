// File: components/dashboard/ArticleList.tsx
import React from 'react';
// Update the import path below to the correct location of your IArticle type.
// For example, if the model is in 'types/Article.ts', use:
import { IArticle } from '../../models/Article'; // Adjust the path as needed
import ArticleCard from '../ui/ArticleCard'; // We'll create this next

interface ArticleListProps {
  articles: IArticle[];
}

const ArticleList: React.FC<ArticleListProps> = ({ articles }) => {
  if (!articles || articles.length === 0) {
    return <p className="text-center text-gray-500">No articles to display.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <ArticleCard key={article._id?.toString() || article.link} article={article} />
      ))}
    </div>
  );
};

export default ArticleList;