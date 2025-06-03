import React, { useState } from 'react';
import { 
  NEWS_CATEGORIES, 
  TECH_CATEGORIES, 
  getNewsCategoryColor, 
  getTechCategoryColor,
  type NewsCategory,
  type TechCategory 
} from '../../lib/articles/categories';
import { IArticle } from '../../models/Article';

interface CategoryButtonsProps {
  article: IArticle;
  onCategoryUpdate: (articleId: string, updates: { newsCategory?: string; techCategory?: string }) => Promise<void>;
}

const CategoryButtons: React.FC<CategoryButtonsProps> = ({ article, onCategoryUpdate }) => {
  const [isUpdating, setIsUpdating] = useState<{ news: boolean; tech: boolean }>({
    news: false,
    tech: false
  });

  const handleNewsCategory = async (category: NewsCategory) => {
    setIsUpdating(prev => ({ ...prev, news: true }));
    try {
      const newCategory = article.newsCategory === category ? undefined : category;
      await onCategoryUpdate(article._id!.toString(), { newsCategory: newCategory });
    } catch (error) {
      console.error('Failed to update news category:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, news: false }));
    }
  };

  const handleTechCategory = async (category: TechCategory) => {
    setIsUpdating(prev => ({ ...prev, tech: true }));
    try {
      const newCategory = article.techCategory === category ? undefined : category;
      await onCategoryUpdate(article._id!.toString(), { techCategory: newCategory });
    } catch (error) {
      console.error('Failed to update tech category:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, tech: false }));
    }
  };

  return (
    <div className="border-t border-gray-100 pt-3 mt-3">
      {/* News Categories Row */}
      <div className="mb-3">
        <div className="flex items-center mb-2">
          <span className="text-xs font-medium text-gray-600 mr-2">News:</span>
          {isUpdating.news && (
            <div className="w-3 h-3 border border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {NEWS_CATEGORIES.map((category) => {
            const isSelected = article.newsCategory === category;
            return (
              <button
                key={category}
                onClick={() => handleNewsCategory(category)}
                disabled={isUpdating.news}
                className={`
                  px-2 py-1 text-xs font-medium rounded border transition-all duration-200
                  ${isSelected 
                    ? getNewsCategoryColor(category) + ' ring-2 ring-blue-300' 
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }
                  ${isUpdating.news ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm cursor-pointer'}
                `}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tech Categories Row */}
      <div>
        <div className="flex items-center mb-2">
          <span className="text-xs font-medium text-gray-600 mr-2">Tech:</span>
          {isUpdating.tech && (
            <div className="w-3 h-3 border border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {TECH_CATEGORIES.map((category) => {
            const isSelected = article.techCategory === category;
            return (
              <button
                key={category}
                onClick={() => handleTechCategory(category)}
                disabled={isUpdating.tech}
                className={`
                  px-2 py-1 text-xs font-medium rounded border transition-all duration-200
                  ${isSelected 
                    ? getTechCategoryColor(category) + ' ring-2 ring-blue-300' 
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }
                  ${isUpdating.tech ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm cursor-pointer'}
                `}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoryButtons;
