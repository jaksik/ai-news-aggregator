// News category definitions
export const NEWS_CATEGORIES = [
  'Top Story Candidate',
  'Solid News',
  'Interesting but Lower Priority',
  'Likely Noise or Opinion'
] as const;

export type NewsCategory = typeof NEWS_CATEGORIES[number];

export const getNewsCategoryColor = (category: NewsCategory): string => {
  const colorMap: Record<NewsCategory, string> = {
    'Top Story Candidate': 'bg-red-100 text-red-800 border-red-200',
    'Solid News': 'bg-green-100 text-green-800 border-green-200',
    'Interesting but Lower Priority': 'bg-pink-100 text-pink-800 border-pink-200',
    'Likely Noise or Opinion': 'bg-purple-100 text-purple-800 border-purple-200'
  };
  
  return colorMap[category] || 'bg-gray-100 text-gray-800 border-gray-200';
};
