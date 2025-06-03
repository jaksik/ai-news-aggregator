import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import AuthWrapper from '../../components/auth/AuthWrapper';
import { ISource } from '../../lib/types';

interface DashboardStats {
  totalSources: number;
  totalArticles: number;
  recentFetches: number;
  enabledSources: number;
  recentArticles: number;
}

const DashboardIndex: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSources: 0,
    totalArticles: 0,
    recentFetches: 0,
    enabledSources: 0,
    recentArticles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch sources count
        const sourcesResponse = await fetch('/api/sources');
        const sourcesData = await sourcesResponse.json();
        const sources = sourcesData.data || [];

        // Fetch total articles count
        const articlesResponse = await fetch('/api/articles?limit=1');
        const articlesData = await articlesResponse.json();
        const totalArticles = articlesData.meta?.pagination?.total || 0;

        // Fetch recent fetch logs from past 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const startDate = yesterday.toISOString();

        const logsResponse = await fetch(`/api/logs?startDate=${startDate}&limit=100`);
        const logsData = await logsResponse.json();
        const recentFetches = logsData.data?.logs?.length || 0;

        // Fetch articles created in past 24 hours
        const recentArticlesResponse = await fetch(`/api/articles?startDate=${startDate}&limit=1000`);
        const recentArticlesData = await recentArticlesResponse.json();
        const recentArticles = recentArticlesData.data?.length || 0;

        setStats({
          totalSources: sources.length,
          totalArticles,
          recentFetches,
          enabledSources: sources.filter((source: ISource) => source.isEnabled).length,
          recentArticles,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Dashboard - AI News Aggregator">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-4 lg:mb-0">
                  <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                    News Dashboard
                  </h1>
                  <p className="text-lg text-slate-600 mt-2 font-medium">
                    Your AI-powered news aggregation control center
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
                  <div className="flex items-center space-x-2 text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-mono text-lg font-semibold">
                      {formatTime(currentTime)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-slate-600">System Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {/* Total Sources */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Sources</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">
                      {loading ? (
                        <div className="animate-pulse bg-slate-200 h-8 w-16 rounded"></div>
                      ) : (
                        stats.totalSources
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">News feeds configured</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Active Sources */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Active Sources</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">
                      {loading ? (
                        <div className="animate-pulse bg-slate-200 h-8 w-16 rounded"></div>
                      ) : (
                        stats.enabledSources
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Currently enabled</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Articles */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Articles</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">
                      {loading ? (
                        <div className="animate-pulse bg-slate-200 h-8 w-20 rounded"></div>
                      ) : (
                        stats.totalArticles.toLocaleString()
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Articles collected</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Recent Fetches */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Recent Fetches</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">
                      {loading ? (
                        <div className="animate-pulse bg-slate-200 h-8 w-12 rounded"></div>
                      ) : (
                        stats.recentFetches
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Past 24 hours</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Recent Articles */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Recent Articles</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">
                      {loading ? (
                        <div className="animate-pulse bg-slate-200 h-8 w-12 rounded"></div>
                      ) : (
                        stats.recentArticles
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Past 24 hours</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default DashboardIndex;