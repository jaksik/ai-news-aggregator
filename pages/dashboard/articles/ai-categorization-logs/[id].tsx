// Individual categorization run details page
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import {
  CategorizationStatusBadge,
  TriggeredByBadge,
  MetricCard,
  LoadingSpinner,
  formatDuration,
  formatCost,
  formatPercentage
} from '../../../../components/categorization/CategorizationComponents';

interface ArticleSummary {
  articleId: string;
  title: string;
  newsCategory: string;
  techCategory: string;
  aiRationale: string;
  status: 'success' | 'failed';
  errorMessage?: string;
}

interface CategorizationRunDetails {
  _id: string;
  startTime: string;
  endTime?: string;
  status: 'in-progress' | 'completed' | 'completed_with_errors' | 'failed';
  processingTimeMs?: number;
  totalArticlesAttempted: number;
  totalArticlesSuccessful: number;
  totalArticlesFailed: number;
  newsCategoryDistribution: {
    'Top Story Candidate': number;
    'Solid News': number;
    'Interesting but Lower Priority': number;
    'Likely Noise or Opinion': number;
  };
  techCategoryDistribution: {
    'Products and Updates': number;
    'Developer Tools': number;
    'Research and Innovation': number;
    'Industry Trends': number;
    'Startups and Funding': number;
    'Not Relevant': number;
  };
  openaiUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUSD: number;
    modelUsed: string;
  };
  articleSummaries: ArticleSummary[];
  orchestrationErrors: string[];
  articleLimit: number;
  openaiModel: string;
  triggeredBy: 'manual' | 'scheduled' | 'api';
}

const CategorizationRunDetailsPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [run, setRun] = useState<CategorizationRunDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchRunDetails = async () => {
      try {
        const response = await fetch(`/api/categorization/runs/${id}`);
        const data = await response.json();

        if (data.success) {
          setRun(data.data);
        } else {
          setError(data.error);
        }
      } catch {
        setError('Failed to fetch run details');
      } finally {
        setLoading(false);
      }
    };

    fetchRunDetails();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <LoadingSpinner className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !run) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Run not found'}</p>
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

  const categoryColors = {
    'Top Story Candidate': 'bg-red-100 text-red-800',
    'Solid News': 'bg-green-100 text-green-800',
    'Interesting but Lower Priority': 'bg-yellow-100 text-yellow-800',
    'Likely Noise or Opinion': 'bg-gray-100 text-gray-800',
    'Products and Updates': 'bg-blue-100 text-blue-800',
    'Developer Tools': 'bg-purple-100 text-purple-800',
    'Research and Innovation': 'bg-pink-100 text-pink-800',
    'Industry Trends': 'bg-indigo-100 text-indigo-800',
    'Startups and Funding': 'bg-green-100 text-green-800',
    'Not Relevant': 'bg-gray-100 text-gray-800'
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
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
              Run #{run._id.slice(-8)}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <CategorizationStatusBadge status={run.status} />
              <TriggeredByBadge triggeredBy={run.triggeredBy} />
              <span className="text-sm text-gray-500">
                Started {new Date(run.startTime).toLocaleString()}
              </span>
              {run.endTime && (
                <span className="text-sm text-gray-500">
                  • Completed {new Date(run.endTime).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Articles Processed"
            value={`${run.totalArticlesSuccessful}/${run.totalArticlesAttempted}`}
            subtitle={`${formatPercentage(run.totalArticlesSuccessful, run.totalArticlesAttempted)} success rate`}
            icon="📝"
          />
          <MetricCard
            title="Processing Time"
            value={run.processingTimeMs ? formatDuration(run.processingTimeMs) : 'N/A'}
            subtitle="Total runtime"
            icon="⏱️"
          />
          <MetricCard
            title="OpenAI Cost"
            value={formatCost(run.openaiUsage.estimatedCostUSD)}
            subtitle={`${run.openaiUsage.totalTokens} tokens`}
            icon="💰"
          />
          <MetricCard
            title="Model Used"
            value={run.openaiModel}
            subtitle={`Limit: ${run.articleLimit} articles`}
            icon="🤖"
          />
        </div>

        {/* Errors */}
        {run.orchestrationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-800 mb-2">Orchestration Errors</h3>
            <ul className="space-y-1">
              {run.orchestrationErrors.map((error, index) => (
                <li key={index} className="text-red-700 text-sm">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Category Distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* News Categories */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              📰 News Categories
            </h3>
            <div className="space-y-3">
              {Object.entries(run.newsCategoryDistribution).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      categoryColors[category as keyof typeof categoryColors]
                    }`}>
                      {formatPercentage(count, run.totalArticlesSuccessful)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Categories */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              🔧 Tech Categories
            </h3>
            <div className="space-y-3">
              {Object.entries(run.techCategoryDistribution).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      categoryColors[category as keyof typeof categoryColors]
                    }`}>
                      {formatPercentage(count, run.totalArticlesSuccessful)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* OpenAI Usage Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            🤖 OpenAI Usage Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Prompt Tokens</p>
              <p className="text-lg font-semibold">{run.openaiUsage.promptTokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completion Tokens</p>
              <p className="text-lg font-semibold">{run.openaiUsage.completionTokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Tokens</p>
              <p className="text-lg font-semibold">{run.openaiUsage.totalTokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estimated Cost</p>
              <p className="text-lg font-semibold">{formatCost(run.openaiUsage.estimatedCostUSD)}</p>
            </div>
          </div>
        </div>

        {/* Article Details */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Article Processing Details ({run.articleSummaries.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {run.articleSummaries.map((article) => (
              <div key={article.articleId} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        article.status === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {article.status === 'success' ? '✅' : '❌'} {article.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        ID: {article.articleId}
                      </span>
                    </div>
                    
                    <h4 className="text-base font-medium text-gray-900 mb-2">
                      {article.title}
                    </h4>
                    
                    {article.status === 'success' && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          categoryColors[article.newsCategory as keyof typeof categoryColors]
                        }`}>
                          📰 {article.newsCategory}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          categoryColors[article.techCategory as keyof typeof categoryColors]
                        }`}>
                          🔧 {article.techCategory}
                        </span>
                      </div>
                    )}
                    
                    {article.errorMessage && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                        <p className="text-red-800 text-sm">{article.errorMessage}</p>
                      </div>
                    )}
                    
                    {article.aiRationale && (
                      <div>
                        <button
                          onClick={() => setExpandedArticle(
                            expandedArticle === article.articleId ? null : article.articleId
                          )}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {expandedArticle === article.articleId ? 'Hide' : 'Show'} AI Rationale
                        </button>
                        
                        {expandedArticle === article.articleId && (
                          <div className="mt-2 p-3 bg-gray-50 rounded">
                            <p className="text-sm text-gray-700">{article.aiRationale}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CategorizationRunDetailsPage;
