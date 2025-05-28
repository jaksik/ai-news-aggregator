// File: components/ui/ArticleCard.tsx
import React from 'react';
import { IArticle } from '../../models/Article'; // Or your FrontendArticle type

interface ArticleCardProps {
  article: IArticle;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
      {/* You could add an image here if you store one: <img src={article.imageUrl} alt={article.title} className="w-full h-48 object-cover" /> */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-semibold text-gray-800 mb-2 hover:text-blue-600 transition-colors duration-200">
          <a href={article.link} target="_blank" rel="noopener noreferrer">
            {article.title || 'Untitled Article'}
          </a>
        </h3>
        <p className="text-sm text-gray-500 mb-1">
          <strong>Source:</strong> {article.sourceName}
        </p>
        <p className="text-sm text-gray-500 mb-3">
          <strong>Published:</strong> {formatDate(article.publishedDate)}
        </p>
        <p className="text-gray-700 text-sm mb-4 flex-grow">
          {article.descriptionSnippet || 'No description available.'}
        </p>
        <div className="mt-auto">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            Read More
          </a>
          {/* Future actions: Mark as read, Star, etc. */}
          {/* <p className="text-xs text-gray-400 mt-2">Fetched: {formatDate(article.fetchedAt)}</p> */}
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;