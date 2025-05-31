import React from 'react';
import { IProcessingSummarySubdoc } from '../../models/FetchRunLog';
import LogStatusBadge from './LogStatusBadge';

interface SourceSummaryCardProps {
  summary: IProcessingSummarySubdoc;
}

const SourceSummaryCard: React.FC<SourceSummaryCardProps> = ({ summary }) => {
  const getBorderColor = (status: IProcessingSummarySubdoc['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-500';
      case 'partial_success':
        return 'border-yellow-500';
      case 'failed':
        return 'border-red-500';
      default:
        return 'border-gray-500';
    }
  };

  return (
    <div 
      className={`bg-white shadow-lg rounded-lg p-6 border-l-4 ${getBorderColor(summary.status)}`}
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        <a 
          href={summary.sourceUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-indigo-600 hover:underline"
        >
          {summary.sourceName}
        </a> 
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        Type: {summary.type.toUpperCase()} | URL: {summary.sourceUrl}
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm mb-3">
        <div>
          <strong className="text-gray-600">Status:</strong> 
          <LogStatusBadge status={summary.status} size="md" />
        </div>
        <div>
          <strong className="text-gray-600">Items Found:</strong> 
          <span className="text-gray-800">{summary.itemsFound}</span>
        </div>
        <div>
          <strong className="text-gray-600">Items Processed:</strong> 
          <span className="text-gray-800">{summary.itemsProcessed}</span>
        </div>
        <div>
          <strong className="text-gray-600">New Articles Added:</strong> 
          <span className="font-bold text-green-700">{summary.newItemsAdded}</span>
        </div>
        <div>
          <strong className="text-gray-600">Items Skipped:</strong> 
          <span className="text-gray-800">{summary.itemsSkipped}</span>
        </div>
      </div>
      
      <p className="text-sm text-gray-700 mb-2">
        <strong className="text-gray-600">Message:</strong> 
        {summary.message || (
          <span className="italic text-gray-500">No specific message.</span>
        )}
      </p>
      
      {summary.fetchError && (
        <p className="text-sm">
          <strong className="text-red-600">Fetch Error:</strong> 
          <span className="text-red-700">{summary.fetchError}</span>
        </p>
      )}
    </div>
  );
};

export default SourceSummaryCard;
