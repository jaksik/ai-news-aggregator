import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import AuthWrapper from '../../components/auth/AuthWrapper';
import FetchAllSourcesControl from '../../components/sources/FetchAllSourcesControl';
import { ISource } from '../../models/Source';

interface DashboardStats {
  totalSources: number;
  totalArticles: number;
  recentFetches: number;
  enabledSources: number;
}

const DashboardIndex: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSources: 0,
    totalArticles: 0,
    recentFetches: 0,
    enabledSources: 0,
  });
  const [loading, setLoading] = useState(true);
  const [categorizing, setCategorizing] = useState(false);
  const [categorizationResult, setCategorizationResult] = useState<string | null>(null);

useEffect(() => {
  const fetchStats = async () => {
    try {
      // Fetch sources count
      const sourcesResponse = await fetch('/api/sources');
      const sourcesData = await sourcesResponse.json();
      const sources = sourcesData.data || [];
      
      // Fetch articles count - articles API returns paginated response
      const articlesResponse = await fetch('/api/articles?limit=1');
      const articlesData = await articlesResponse.json();
      const totalArticles = articlesData.data ? 
        (articlesData.meta?.pagination?.total || 0) : 0;
      
      // Fetch recent fetch logs - logs API returns nested structure
      const logsResponse = await fetch('/api/logs?limit=5');
      const logsData = await logsResponse.json();
      const recentFetches = logsData.data ? 
        (logsData.data.logs ? logsData.data.logs.length : 0) : 0;
      
      setStats({
        totalSources: sources.length,
        totalArticles,
        recentFetches,
        enabledSources: sources.filter((source: ISource) => source.isEnabled).length,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchStats();
}, []);

const handleAICategorization = async () => {
  setCategorizing(true);
  setCategorizationResult(null);
  
  try {
    const response = await fetch('/api/ai/categorize', {
      method: 'POST',
    });
    const data = await response.json();
    
    if (data.success) {
      setCategorizationResult(`Successfully categorized ${data.categorized} articles`);
    } else {
      setCategorizationResult(`Error: ${data.error}`);
    }
  } catch (error) {
    setCategorizationResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setCategorizing(false);
  }
};

  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Dashboard - News Aggregator">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-md md:text-lg text-gray-600 mt-2">
              Welcome to your News Aggregator Dashboard
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Sources</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {loading ? '...' : stats.totalSources}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="text-3xl">📰</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Active Sources</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {loading ? '...' : stats.enabledSources}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="text-3xl">✅</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Articles</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {loading ? '...' : stats.totalArticles.toLocaleString()}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="text-3xl">📄</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
              <div className="flex items-center">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Recent Fetches</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {loading ? '...' : stats.recentFetches}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="text-3xl">🔄</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/dashboard/articles"
                className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 border border-blue-200"
              >
                <span className="text-2xl mr-3">📰</span>
                <div>
                  <h3 className="font-medium text-gray-800">View Articles</h3>
                  <p className="text-sm text-gray-600">Browse your news feed</p>
                </div>
              </Link>

              <Link
                href="/dashboard/sources"
                className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200 border border-green-200"
              >
                <span className="text-2xl mr-3">⚙️</span>
                <div>
                  <h3 className="font-medium text-gray-800">Manage Sources</h3>
                  <p className="text-sm text-gray-600">Add or edit news sources</p>
                </div>
              </Link>

              <button
                onClick={handleAICategorization}
                disabled={categorizing}
                className="flex items-center p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors duration-200 border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl mr-3">🤖</span>
                <div>
                  <h3 className="font-medium text-gray-800">
                    {categorizing ? 'Categorizing...' : 'AI Categorize'}
                  </h3>
                  <p className="text-sm text-gray-600">Auto-categorize pending articles</p>
                </div>
              </button>

              <Link
                href="/dashboard/controls"
                className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200 border border-purple-200"
              >
                <span className="text-2xl mr-3">🕹️</span>
                <div>
                  <h3 className="font-medium text-gray-800">Control Center</h3>
                  <p className="text-sm text-gray-600">Fetch and manage data</p>
                </div>
              </Link>

              <Link
                href="/dashboard/logs"
                className="flex items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors duration-200 border border-orange-200"
              >
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <h3 className="font-medium text-gray-800">View Logs</h3>
                  <p className="text-sm text-gray-600">Check fetch history</p>
                </div>
              </Link>
            </div>

            {/* AI Categorization Result */}
            {categorizationResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                categorizationResult.includes('Error') 
                  ? 'bg-red-50 border border-red-200 text-red-700' 
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}>
                <p className="text-sm font-medium">{categorizationResult}</p>
              </div>
            )}
          </div>

          {/* Fetch Control */}
          <FetchAllSourcesControl />

          {/* System Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">System Overview</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">●</span>
                  <span className="font-medium text-gray-700">News Aggregation Service</span>
                </div>
                <span className="text-sm text-green-600 font-medium">Active</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">●</span>
                  <span className="font-medium text-gray-700">Database Connection</span>
                </div>
                <span className="text-sm text-green-600 font-medium">Connected</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-blue-500 mr-2">●</span>
                  <span className="font-medium text-gray-700">Scheduled Fetches</span>
                </div>
                <span className="text-sm text-blue-600 font-medium">Running</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default DashboardIndex;