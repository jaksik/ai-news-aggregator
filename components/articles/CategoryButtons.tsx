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
  onCategoryUpdate: (articleId: string, updates: { newsCategory?: string; techCategory?: string; categoryRationale?: string }) => Promise<void>;
}

const CategoryButtons: React.FC<CategoryButtonsProps> = ({ article, onCategoryUpdate }) => {
  const [isUpdating, setIsUpdating] = useState<{ news: boolean; tech: boolean; rationale: boolean }>({
    news: false,
    tech: false,
    rationale: false
  });
  const [savedIndicator, setSavedIndicator] = useState<{ news: boolean; tech: boolean; rationale: boolean }>({
    news: false,
    tech: false,
    rationale: false
  });
  const [rationale, setRationale] = useState<string>(article.categoryRationale || '');
  const [rationaleTimeout, setRationaleTimeout] = useState<NodeJS.Timeout | null>(null);

  const showSavedIndicator = (type: 'news' | 'tech' | 'rationale') => {
    setSavedIndicator(prev => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setSavedIndicator(prev => ({ ...prev, [type]: false }));
    }, 2000);
  };

  const handleNewsCategory = async (category: NewsCategory) => {
    setIsUpdating(prev => ({ ...prev, news: true }));
    try {
      const newCategory = article.newsCategory === category ? undefined : category;
      await onCategoryUpdate(article._id!.toString(), { newsCategory: newCategory });
      showSavedIndicator('news');
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
      showSavedIndicator('tech');
    } catch (error) {
      console.error('Failed to update tech category:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, tech: false }));
    }
  };

  const handleRationaleChange = (value: string) => {
    setRationale(value);
    
    // Clear existing timeout
    if (rationaleTimeout) {
      clearTimeout(rationaleTimeout);
    }
    
    // Set new timeout to save after 1 second of no typing
    const timeout = setTimeout(async () => {
      if (value !== article.categoryRationale) {
        setIsUpdating(prev => ({ ...prev, rationale: true }));
        try {
          await onCategoryUpdate(article._id!.toString(), { categoryRationale: value });
          showSavedIndicator('rationale');
        } catch (error) {
          console.error('Failed to update category rationale:', error);
        } finally {
          setIsUpdating(prev => ({ ...prev, rationale: false }));
        }
      }
    }, 5000);
    
    setRationaleTimeout(timeout);
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
          {savedIndicator.news && (
            <div className="flex items-center text-green-600 transition-all duration-300 ease-out animate-pulse">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">Saved</span>
            </div>
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
          {savedIndicator.tech && (
            <div className="flex items-center text-green-600 transition-all duration-300 ease-out animate-pulse">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">Saved</span>
            </div>
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

      {/* Rationale Input */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center mb-2">
          <span className="text-xs font-medium text-gray-600 mr-2">Rationale:</span>
          {isUpdating.rationale && (
            <div className="w-3 h-3 border border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          )}
          {savedIndicator.rationale && (
            <div className="flex items-center text-green-600 transition-all duration-300 ease-out animate-pulse">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">Saved</span>
            </div>
          )}
        </div>
        <textarea
          value={rationale}
          onChange={(e) => handleRationaleChange(e.target.value)}
          placeholder="Why did you choose these categories? (auto-saves after 1 second)"
          disabled={isUpdating.rationale}
          className={`
            w-full px-3 py-2 text-sm border border-gray-200 rounded-md resize-none
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${isUpdating.rationale ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'}
          `}
          rows={2}
        />
      </div>
    </div>
  );
};

export default CategoryButtons;
