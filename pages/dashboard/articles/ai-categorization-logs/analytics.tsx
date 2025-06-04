// Analytics page for categorization logs
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import {
  MetricCard,
  LoadingSpinner,
  formatCost
} from '../../../../components/categorization/CategorizationComponents';

interface DailyTrend {
  _id: {
    year: number;
    month: number;
    day: number;
  };
  runsCount: number;
  articlesProcessed: number;
  successfulRuns: number;
  totalCost: number;
}

interface CategoryDistribution {
  avgNewsTopStory: number;
  avgNewsSolid: number;
  avgNewsLower: number;
  avgNewsNoise: number;
  avgTechProducts: number;
  avgTechDevTools: number;
  avgTechResearch: number;
  avgTechTrends: number;
  avgTechStartups: number;
  avgTechNotRelevant: number;
}

interface AnalyticsData {
  overview: {
    totalRuns: number;
    successRate: number;
    articlesProcessed: number;
    estimatedCost: number;
  };
  dailyTrends: DailyTrend[];
  categoryDistribution: CategoryDistribution | null;
}

const CategorizationAnalyticsPage: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<string>('7d');

  const fetchAnalytics = async (selectedTimeframe: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/categorization/stats?timeframe=${selectedTimeframe}`);
      const data = await response.json();

      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  const formatDateLabel = (dateObj: DailyTrend['_id']) => {
    const date = new Date(dateObj.year, dateObj.month - 1, dateObj.day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  if (error || !analyticsData) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Failed to load analytics'}</p>
            <Link
              href="/dashboard/articles/ai-categorization-logs"
              className="text-red-600 hover:text-red-800 text-sm mt-2 inline-block"
            >
              ← Back to logs
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { overview, dailyTrends, categoryDistribution } = analyticsData;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard/articles/ai-categorization-logs"
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back to logs
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              📊 Categorization Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Insights and trends from AI categorization runs
            </p>
          </div>
          
          {/* Timeframe Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Runs"
            value={overview.totalRuns}
            subtitle={`${timeframe === 'all' ? 'All time' : timeframe.replace('d', ' days')}`}
            icon="🚀"
          />
          <MetricCard
            title="Success Rate"
            value={`${overview.successRate}%`}
            subtitle="Average across all runs"
            icon="✅"
          />
          <MetricCard
            title="Articles Processed"
            value={overview.articlesProcessed}
            subtitle="Successfully categorized"
            icon="📝"
          />
          <MetricCard
            title="Total Cost"
            value={formatCost(overview.estimatedCost)}
            subtitle="OpenAI API usage"
            icon="💰"
          />
        </div>

        {/* Daily Trends Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            📈 Daily Activity Trends
          </h3>
          
          {dailyTrends.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No data available for the selected timeframe
            </div>
          ) : (
            <div className="space-y-4">
              {/* Simple bar chart representation */}
              <div className="grid grid-cols-1 gap-2">
                {dailyTrends.map((trend, index) => {
                  const maxArticles = Math.max(...dailyTrends.map(t => t.articlesProcessed));
                  const width = maxArticles > 0 ? (trend.articlesProcessed / maxArticles) * 100 : 0;
                  const successRate = trend.runsCount > 0 ? (trend.successfulRuns / trend.runsCount) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded">
                      <div className="w-16 text-sm text-gray-600">
                        {formatDateLabel(trend._id)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div 
                            className="bg-blue-500 h-2 rounded"
                            style={{ width: `${width}%`, minWidth: width > 0 ? '8px' : '0' }}
                          ></div>
                          <span className="text-sm text-gray-600">
                            {trend.articlesProcessed} articles
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {trend.runsCount} runs • {successRate.toFixed(0)}% success • {formatCost(trend.totalCost)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Category Distribution Analysis */}
        {categoryDistribution && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* News Categories */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                📰 Average News Category Distribution
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Top Story Candidate</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${(categoryDistribution.avgNewsTopStory || 0) * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(categoryDistribution.avgNewsTopStory || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Solid News</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(categoryDistribution.avgNewsSolid || 0) * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(categoryDistribution.avgNewsSolid || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Lower Priority</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${(categoryDistribution.avgNewsLower || 0) * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(categoryDistribution.avgNewsLower || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Noise/Opinion</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-500 h-2 rounded-full"
                        style={{ width: `${(categoryDistribution.avgNewsNoise || 0) * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(categoryDistribution.avgNewsNoise || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Categories */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                🔧 Average Tech Category Distribution
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Products & Updates</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(categoryDistribution.avgTechProducts || 0) * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(categoryDistribution.avgTechProducts || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Developer Tools</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(categoryDistribution.avgTechDevTools || 0) * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(categoryDistribution.avgTechDevTools || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Research & Innovation</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-pink-500 h-2 rounded-full"
                        style={{ width: `${(categoryDistribution.avgTechResearch || 0) * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(categoryDistribution.avgTechResearch || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Industry Trends</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${(categoryDistribution.avgTechTrends || 0) * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(categoryDistribution.avgTechTrends || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Startups & Funding</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(categoryDistribution.avgTechStartups || 0) * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(categoryDistribution.avgTechStartups || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Not Relevant</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-500 h-2 rounded-full"
                        style={{ width: `${(categoryDistribution.avgTechNotRelevant || 0) * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(categoryDistribution.avgTechNotRelevant || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insights Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            🎯 Key Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Average success rate: {overview.successRate}%</li>
                <li>• Total articles processed: {overview.articlesProcessed}</li>
                <li>• Average cost per article: {
                  overview.articlesProcessed > 0 
                    ? formatCost(overview.estimatedCost / overview.articlesProcessed)
                    : '$0.0000'
                }</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Quality Trends</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Most common news category: {
                  categoryDistribution ? Object.entries({
                    'Top Story': categoryDistribution.avgNewsTopStory || 0,
                    'Solid News': categoryDistribution.avgNewsSolid || 0,
                    'Lower Priority': categoryDistribution.avgNewsLower || 0,
                    'Noise': categoryDistribution.avgNewsNoise || 0
                  }).sort(([,a], [,b]) => b - a)[0][0] : 'N/A'
                }</li>
                <li>• Most common tech category: {
                  categoryDistribution ? Object.entries({
                    'Products': categoryDistribution.avgTechProducts || 0,
                    'Dev Tools': categoryDistribution.avgTechDevTools || 0,
                    'Research': categoryDistribution.avgTechResearch || 0,
                    'Trends': categoryDistribution.avgTechTrends || 0,
                    'Startups': categoryDistribution.avgTechStartups || 0,
                    'Not Relevant': categoryDistribution.avgTechNotRelevant || 0
                  }).sort(([,a], [,b]) => b - a)[0][0] : 'N/A'
                }</li>
                <li>• Total runs completed: {overview.totalRuns}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CategorizationAnalyticsPage;
