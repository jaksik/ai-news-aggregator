// Tech category definitions
export const TECH_CATEGORIES = [
  'Products and Updates',
  'Research and Innovation',
  'AI Agents',
  'Startups and Funding',
  'Industry Trends',
  'Developer Tools',
  'Not Relevant',
] as const;

export type TechCategory = typeof TECH_CATEGORIES[number];

export const getTechCategoryColor = (category: TechCategory): string => {
  const colorMap: Record<TechCategory, string> = {
    'Products and Updates': 'bg-purple-100 text-purple-800 border-purple-200',
    'Research and Innovation': 'bg-blue-100 text-blue-800 border-blue-200',
    'AI Agents': 'bg-gray-100 text-gray-800 border-gray-200',
    'Startups and Funding': 'bg-green-100 text-green-800 border-green-200',
    'Industry Trends': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Developer Tools': 'bg-sky-100 text-sky-800 border-sky-200',
    'Not Relevant': 'bg-red-100 text-red-800 border-red-200'
  };
  
  return colorMap[category] || 'bg-gray-100 text-gray-800 border-gray-200';
};
