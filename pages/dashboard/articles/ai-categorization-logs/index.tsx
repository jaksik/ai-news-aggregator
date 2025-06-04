// Main categorization logs dashboard page
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import {
  CategorizationStatusBadge,
  TriggeredByBadge,
  MetricCard,
  LoadingSpinner,
  EmptyState,
  formatDuration,
  formatCost,
  formatPercentage,
  formatRelativeTime
} from '../../../../components/categorization/CategorizationComponents';

interface CategorizationRun {
  _id: string;
  startTime: string;
  endTime?: string;
  status: 'in-progress' | 'completed' | 'completed_with_errors' | 'failed';
  totalArticlesAttempted: number;
  totalArticlesSuccessful: number;
  totalArticlesFailed: number;
  processingTimeMs?: number;
  openaiUsage: {
    estimatedCostUSD: number;
    totalTokens: number;
  };
  triggeredBy: 'manual' | 'scheduled' | 'api';
}

interface StatsData {
  overview: {
    totalRuns: number;
    successRate: number;
    articlesProcessed: number;
    estimatedCost: number;
  };
  recentRuns: CategorizationRun[];
}

const CategorizationLogsPage: React.FC = () => {
  const [runs, setRuns] = useState<CategorizationRun[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRuns, setTotalRuns] = useState(0);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triggeredByFilter, setTriggeredByFilter] = useState<string>('all');

  const triggerCategorizationRun = async () => {
    setTriggering(true);
    try {
      const response = await fetch('/api/categorization/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ articleLimit: 20 })
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the runs list by updating currentPage to trigger useEffect
        setCurrentPage(1); // Reset to first page to see the new run
        // Note: useEffect will handle refetching both runs and stats
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to trigger categorization run');
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    const fetchRuns = async (page: number = 1) => {
      try {
        const response = await fetch(
          `/api/categorization/runs?page=${page}&limit=10&status=${statusFilter}&triggeredBy=${triggeredByFilter}`
        );
        const data = await response.json();

        if (data.success) {
          setRuns(data.data.runs || data.data);
          setTotalPages(data.pagination?.totalPages || Math.ceil((data.data.length || 0) / 10));
          setTotalRuns(data.pagination?.total || data.data.length || 0);
        } else {
          setError(data.error);
        }
      } catch {
        setError('Failed to fetch categorization runs');
      }
    };

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/categorization/stats?timeframe=7d');
        const data = await response.json();

        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.error);
        }
      } catch {
        setError('Failed to fetch stats');
      }
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRuns(currentPage), fetchStats()]);
      setLoading(false);
    };

    loadData();
  }, [statusFilter, triggeredByFilter, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <LoadingSpinner className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              AI Categorization Logs
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor and manage AI article categorization runs
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/articles/ai-categorization-logs/analytics"
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              📊 Analytics
            </Link>
            <button
              onClick={triggerCategorizationRun}
              disabled={triggering}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {triggering ? '🔄 Running...' : '🚀 Run Categorization'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 text-sm mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Overview Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Runs (7d)"
              value={stats.overview.totalRuns}
              icon="🚀"
            />
            <MetricCard
              title="Success Rate"
              value={`${stats.overview.successRate}%`}
              icon="✅"
            />
            <MetricCard
              title="Articles Processed"
              value={stats.overview.articlesProcessed}
              icon="📝"
            />
            <MetricCard
              title="Total Cost"
              value={formatCost(stats.overview.estimatedCost)}
              icon="💰"
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="completed_with_errors">Partial Success</option>
              <option value="failed">Failed</option>
              <option value="in-progress">In Progress</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Triggered By
            </label>
            <select
              value={triggeredByFilter}
              onChange={(e) => setTriggeredByFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Sources</option>
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
              <option value="api">API</option>
            </select>
          </div>
        </div>

        {/* Runs Table */}
        {runs.length === 0 ? (
          <EmptyState
            title="No categorization runs found"
            description="Start by running your first AI categorization to see results here."
            actionButton={
              <button
                onClick={triggerCategorizationRun}
                disabled={triggering}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {triggering ? 'Running...' : 'Run First Categorization'}
              </button>
            }
            icon="🤖"
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Recent Runs ({totalRuns} total)
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Run
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Articles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Triggered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {runs.map((run) => (
                    <tr key={run._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{run._id.slice(-8)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatRelativeTime(run.startTime)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <CategorizationStatusBadge status={run.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {run.totalArticlesSuccessful}/{run.totalArticlesAttempted}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPercentage(run.totalArticlesSuccessful, run.totalArticlesAttempted)} success
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {run.processingTimeMs ? formatDuration(run.processingTimeMs) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCost(run.openaiUsage.estimatedCostUSD)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {run.openaiUsage.totalTokens} tokens
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TriggeredByBadge triggeredBy={run.triggeredBy} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/dashboard/articles/ai-categorization-logs/${run._id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CategorizationLogsPage;
