// File: lib/utils/sortUtils.ts
import { IArticle } from '../../models/Article';
import { SortField, SortDirection } from '../../components/articles/SortControls';

export const sortArticles = (
  articles: IArticle[], 
  field: SortField, 
  direction: SortDirection
): IArticle[] => {
  return [...articles].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (field) {
      case 'publishedDate':
        aValue = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        bValue = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        break;
      case 'title':
        aValue = a.title?.toLowerCase() || '';
        bValue = b.title?.toLowerCase() || '';
        break;
      case 'sourceName':
        aValue = a.sourceName?.toLowerCase() || '';
        bValue = b.sourceName?.toLowerCase() || '';
        break;
      case 'fetchedAt':
        aValue = a.fetchedAt ? new Date(a.fetchedAt).getTime() : 0;
        bValue = b.fetchedAt ? new Date(b.fetchedAt).getTime() : 0;
        break;
      default:
        return 0;
    }

    // Handle comparison
    let comparison = 0;
    if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    }

    // Apply sort direction
    return direction === 'desc' ? -comparison : comparison;
  });
};
