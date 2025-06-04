// Reusable components for categorization logs
import React from 'react';

// Status badge component
interface CategorizationStatusBadgeProps {
  status: 'in-progress' | 'completed' | 'completed_with_errors' | 'failed';
  className?: string;
}

export const CategorizationStatusBadge: React.FC<CategorizationStatusBadgeProps> = ({ 
  status, 
  className = '' 
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-100 text-green-800', icon: '✅', label: 'Completed' };
      case 'completed_with_errors':
        return { color: 'bg-yellow-100 text-yellow-800', icon: '⚠️', label: 'Partial Success' };
      case 'failed':
        return { color: 'bg-red-100 text-red-800', icon: '❌', label: 'Failed' };
      case 'in-progress':
        return { color: 'bg-blue-100 text-blue-800', icon: '🔄', label: 'In Progress' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: '❓', label: 'Unknown' };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${className}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

// Triggered by badge
interface TriggeredByBadgeProps {
  triggeredBy: 'manual' | 'scheduled' | 'api';
  className?: string;
}

export const TriggeredByBadge: React.FC<TriggeredByBadgeProps> = ({ 
  triggeredBy, 
  className = '' 
}) => {
  const getConfig = (type: string) => {
    switch (type) {
      case 'manual':
        return { color: 'bg-blue-100 text-blue-800', icon: '👤', label: 'Manual' };
      case 'scheduled':
        return { color: 'bg-purple-100 text-purple-800', icon: '⏰', label: 'Scheduled' };
      case 'api':
        return { color: 'bg-green-100 text-green-800', icon: '🔌', label: 'API' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: '❓', label: 'Unknown' };
    }
  };

  const config = getConfig(triggeredBy);
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${className}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

// Metrics card component
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-2xl">{icon}</div>
        )}
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center">
          <span
            className={`text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? '↗️' : '↘️'} {Math.abs(trend.value)}%
          </span>
          <span className="text-sm text-gray-500 ml-1">from last period</span>
        </div>
      )}
    </div>
  );
};

// Loading spinner component
export const LoadingSpinner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
};

// Empty state component
interface EmptyStateProps {
  title: string;
  description: string;
  actionButton?: React.ReactNode;
  icon?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionButton,
  icon = '📋'
}) => {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
      {actionButton}
    </div>
  );
};

// Format helpers
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

export const formatCost = (cost: number): string => {
  return `$${cost.toFixed(4)}`;
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return past.toLocaleDateString();
};
