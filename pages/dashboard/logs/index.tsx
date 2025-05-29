// File: pages/dashboard/logs/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
// Remove Head from 'next/head' if DashboardLayout handles the main title
import Link from 'next/link';
import DashboardLayout from '../../../components/dashboard/DashboardLayout'; // Adjusted path
import AuthWrapper from '../../../components/auth/AuthWrapper';
import { IFetchRunLog } from '../../../models/FetchRunLog'; // Adjusted path

interface FetchLogsApiResponse {
  logs?: IFetchRunLog[];
  totalLogs?: number;
  page?: number;
  limit?: number;
  error?: string;
  message?: string;
}

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<IFetchRunLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [limitPerPage] = useState<number>(10);

  const fetchLogs = useCallback(async (page: number) => {
    // ... (fetchLogs function remains the same as your current working version)
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/fetch-logs?page=${page}&limit=${limitPerPage}`);
      if (!response.ok) {
        const errorData: FetchLogsApiResponse = await response.json();
        throw new Error(errorData.error || errorData.message || `Failed to fetch logs: ${response.status}`);
      }
      const data: FetchLogsApiResponse = await response.json();
      setLogs(data.logs || []);
      setTotalLogs(data.totalLogs || 0);
      if (data.totalLogs && data.limit) {
        setTotalPages(Math.ceil(data.totalLogs / data.limit));
      } else {
        setTotalPages(1);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error("Failed to fetch logs:", err);
      setLogs([]); 
      setTotalPages(1);
      setTotalLogs(0);
    } finally {
      setLoading(false);
    }
  }, [limitPerPage]);

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage, fetchLogs]);

  const formatDate = (dateString?: string | Date) => {
    // ... (formatDate function remains the same)
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      });
    } catch {
      return String(dateString);
    }
  };

  const getStatusColor = (status: IFetchRunLog['status']) => {
    // ... (getStatusColor function remains the same)
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'completed_with_errors': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Fetch Run Logs - My Aggregator">
        {/* The outer container and Head for title are now handled by DashboardLayout */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Fetch Run Log</h1>
          <p className="text-md md:text-lg text-gray-600">History of the news aggregation process.</p>
        </header>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <p className="text-xl text-gray-500">Loading logs...</p>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {logs.length === 0 ? (
              <p className="text-center text-xl text-gray-500 py-10">No fetch logs found.</p>
            ) : (
              <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
                <table className="min-w-full leading-normal">
                  {/* ... (thead and tbody structure remains the same as your working version) ... */}
                  <thead>
                      <tr className="bg-gray-200 text-left text-gray-600 uppercase text-sm tracking-wider">
                        <th className="px-5 py-3 border-b-2 border-gray-300">Start Time</th>
                        <th className="px-5 py-3 border-b-2 border-gray-300">Duration</th>
                        <th className="px-5 py-3 border-b-2 border-gray-300">Status</th>
                        <th className="px-5 py-3 border-b-2 border-gray-300 text-center">Sources</th>
                        <th className="px-5 py-3 border-b-2 border-gray-300 text-center">New Articles</th>
                        <th className="px-5 py-3 border-b-2 border-gray-300">Errors</th>
                        <th className="px-5 py-3 border-b-2 border-gray-300">Details</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {logs.map((log) => {
                        const duration = log.endTime && log.startTime 
                          ? ((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000).toFixed(1) + 's' 
                          : 'N/A';
                        return (
                          <tr key={log._id?.toString()} className="border-b border-gray-200 hover:bg-gray-100 transition-colors duration-150">
                            <td className="px-5 py-4 text-sm whitespace-nowrap">{formatDate(log.startTime)}</td>
                            <td className="px-5 py-4 text-sm whitespace-nowrap">{duration}</td>
                            <td className="px-5 py-4 text-sm">
                              <span className={`px-3 py-1 font-semibold leading-tight rounded-full text-xs ${getStatusColor(log.status)}`}>
                                {log.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-center">{log.totalSourcesAttempted}</td>
                            <td className="px-5 py-4 text-sm text-center">{log.totalNewArticlesAddedAcrossAllSources}</td>
                            <td className="px-5 py-4 text-sm">
                              {log.orchestrationErrors && log.orchestrationErrors.length > 0 
                                ? log.orchestrationErrors.join('; ') 
                                : (log.totalSourcesFailedWithError > 0 ? `${log.totalSourcesFailedWithError} source(s) had fetch errors` : 'None')}
                            </td>
                            <td className="px-5 py-4 text-sm">
                              <Link href={`/dashboard/logs/${log._id?.toString()}`} legacyBehavior>
                                <a className="text-indigo-600 hover:text-indigo-800 hover:underline">View Details</a>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalLogs > 0 && totalPages > 1 && (
              // ... (pagination controls remain the same) ...
              <div className="py-5 flex flex-col xs:flex-row items-center xs:justify-between">
                  <div className="text-xs xs:text-sm text-gray-600">
                    Showing {((currentPage - 1) * limitPerPage) + 1} to {Math.min(currentPage * limitPerPage, totalLogs)} of {totalLogs} Logs
                  </div>
                  <div className="inline-flex mt-2 xs:mt-0">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                      className="text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-l disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || loading}
                      className="text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-r disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
            )}
          </>
        )}
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default LogsPage;