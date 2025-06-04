// Types for AI article categorization
export interface UncategorizedArticle {
  _id: string;
  title: string;
  descriptionSnippet?: string;
}

export interface ArticleForCategorization {
  objectId: string;
  title: string;
  meta_description: string;
}

export interface CategorizedArticleResponse {
  objectId: string;
  original_title: string;
  newsCategory: string;
  techCategory: string;
  brief_rationale: string;
}

// Valid news categories based on your existing data
export type NewsCategoryType = 
  | 'Top Story Candidate'
  | 'Solid News'
  | 'Interesting but Lower Priority'
  | 'Likely Noise or Opinion';

// Valid tech categories based on your existing data
export type TechCategoryType = 
  | 'Products and Updates'
  | 'Developer Tools'
  | 'Research and Innovation'
  | 'Industry Trends'
  | 'Startups and Funding'
  | 'Not Relevant';

export interface CategorizationResult {
  success: boolean;
  totalProcessed: number;
  successfulUpdates: number;
  failedUpdates: number;
  errors: string[];
  categorizedArticles: CategorizedArticleResponse[];
  runLogId?: string;
}

export interface OpenAICategorizationResponse {
  categorized_articles?: CategorizedArticleResponse[];
  articles?: CategorizedArticleResponse[];
  data?: CategorizedArticleResponse[];
  // Allow for direct array response or unknown properties
  [key: string]: CategorizedArticleResponse[] | unknown;
}
