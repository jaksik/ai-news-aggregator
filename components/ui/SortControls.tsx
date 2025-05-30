import React from 'react';

export type SortField = 'publishedDate' | 'title' | 'sourceName' | 'fetchedAt';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

interface SortControlsProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  className?: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'publishedDate', direction: 'desc', label: 'Newest First' },
  { field: 'publishedDate', direction: 'asc', label: 'Oldest First' },
  { field: 'title', direction: 'asc', label: 'Title A-Z' },
  { field: 'title', direction: 'desc', label: 'Title Z-A' },
  { field: 'sourceName', direction: 'asc', label: 'Source A-Z' },
  { field: 'sourceName', direction: 'desc', label: 'Source Z-A' },
  { field: 'fetchedAt', direction: 'desc', label: 'Recently Fetched' },
  { field: 'fetchedAt', direction: 'asc', label: 'Oldest Fetched' },
];

const SortControls: React.FC<SortControlsProps> = ({ 
  currentSort, 
  onSortChange, 
  className = '' 
}) => {
  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    const selectedOption = SORT_OPTIONS.find(option => 
      `${option.field}-${option.direction}` === selectedValue
    );
    
    if (selectedOption) {
      onSortChange(selectedOption);
    }
  };

  const currentValue = `${currentSort.field}-${currentSort.direction}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
        Sort by:
      </label>
      <select
        id="sort-select"
        value={currentValue}
        onChange={handleSortChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        {SORT_OPTIONS.map((option) => (
          <option 
            key={`${option.field}-${option.direction}`} 
            value={`${option.field}-${option.direction}`}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SortControls;
