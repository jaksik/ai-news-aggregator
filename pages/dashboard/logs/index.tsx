// File: pages/dashboard/logs/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import AuthWrapper from '../../../components/auth/AuthWrapper';
import { IFetchRunLog } from '../../../models/FetchRunLog';
import LogsTable from '../../../components/logs/LogsTable';
import LogsPagination from '../../../components/logs/LogsPagination';
import LoadingSpinner from '../../../components/logs/LoadingSpinner';
import ErrorDisplay from '../../../components/logs/ErrorDisplay';
import EmptyLogsState from '../../../components/logs/EmptyLogsState';

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Fetch Run Logs - My Aggregator">
        {/* The outer container and Head for title are now handled by DashboardLayout */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Fetch Run Log</h1>
          <p className="text-md md:text-lg text-gray-600">History of the news aggregation process.</p>
        </header>

        {loading && <LoadingSpinner message="Loading logs..." />}
        
        {error && <ErrorDisplay message={error} />}

        {!loading && !error && (
          <>
            {logs.length === 0 ? (
              <EmptyLogsState />
            ) : (
              <LogsTable logs={logs} />
            )}

            <LogsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalLogs={totalLogs}
              limitPerPage={limitPerPage}
              loading={loading}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default LogsPage;