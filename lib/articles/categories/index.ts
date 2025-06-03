// Main export file for article categories
export { NEWS_CATEGORIES, type NewsCategory, getNewsCategoryColor } from './news';
export { TECH_CATEGORIES, type TechCategory, getTechCategoryColor } from './tech';

// Import for internal use
import { NEWS_CATEGORIES, type NewsCategory } from './news';
import { TECH_CATEGORIES, type TechCategory } from './tech';

// Combined types for easier imports
export type CategoryType = 'news' | 'tech';

export interface CategoryUpdate {
  articleId: string;
  newsCategory?: string;
  techCategory?: string;
}

// Helper function to get all categories
export const getAllCategories = () => ({
  news: NEWS_CATEGORIES,
  tech: TECH_CATEGORIES
});

// Helper function to validate category
export const isValidNewsCategory = (category: string): category is NewsCategory => {
  return NEWS_CATEGORIES.includes(category as NewsCategory);
};

export const isValidTechCategory = (category: string): category is TechCategory => {
  return TECH_CATEGORIES.includes(category as TechCategory);
};
