import { ObjectId } from 'mongodb';

export interface INewsletterItem {
  articleId: string;
  originalTitle: string;
  generatedHeadline: string;
  summary: string;
  source: string;
  category: 'headline' | 'product' | 'research';
  aiScore: number;
  includeInNewsletter: boolean;
}

export interface INewsletter {
  _id?: ObjectId;
  date: Date;
  status: 'draft' | 'reviewed' | 'published';
  title: string;
  intro?: string;
  sections: {
    topHeadlines: INewsletterItem[];
    productUpdates: INewsletterItem[];
    research: INewsletterItem[];
  };
  generatedAt: Date;
  lastModified: Date;
  articleIds: string[]; // Track source articles
  aiPromptUsed: string; // For debugging/iteration
  articlesProcessed: number; // How many articles were considered
}

// Export the collection name for consistency
export const NEWSLETTER_COLLECTION = 'newsletters';
