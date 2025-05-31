import React from 'react';
import { IFetchRunLog, IProcessingSummarySubdoc } from '../../models/FetchRunLog';

interface LogStatusBadgeProps {
  status: IFetchRunLog['status'] | IProcessingSummarySubdoc['status'];
  size?: 'sm' | 'md';
}

const LogStatusBadge: React.FC<LogStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const getStatusBadgeColor = (status: IFetchRunLog['status'] | IProcessingSummarySubdoc['status']) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'partial_success':
      case 'completed_with_errors':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const sizeClasses = size === 'md' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-xs';

  return (
    <span 
      className={`${sizeClasses} font-semibold leading-tight rounded-full border ${getStatusBadgeColor(status)}`}
    >
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

export default LogStatusBadge;
