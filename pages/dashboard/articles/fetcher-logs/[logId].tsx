// File: pages/dashboard/articles/fetcher-logs/[logId].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import AuthWrapper from '../../../../components/auth/AuthWrapper';
import { IFetchRunLog } from '../../../../models/FetchRunLog';
import BackToLogs from '../../../../components/logs/BackToLogs';
import LogOverviewCard from '../../../../components/logs/LogOverviewCard';
import SourceSummaryCard from '../../../../components/logs/SourceSummaryCard';
import LoadingSpinner from '../../../../components/logs/LoadingSpinner';
import ErrorDisplay from '../../../../components/logs/ErrorDisplay';
import { formatLogDate } from '../../../../components/logs/logUtils';

interface FetchLogDetailApiResponse {
  success?: boolean;
  data?: IFetchRunLog;
  message?: string;
  error?: string;
}

const LogDetailPage: React.FC = () => {
  const router = useRouter();
  const { logId } = router.query;

  const [log, setLog] = useState<IFetchRunLog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ... (useEffect logic remains the same as your current working version) ...
    if (typeof logId === 'string') { 
      const fetchLogDetail = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/logs/${logId}`);
          if (!response.ok) {
            const errorData: FetchLogDetailApiResponse = await response.json();
            throw new Error(errorData.error || errorData.message || `Failed to fetch log details: ${response.status}`);
          }
          const data: FetchLogDetailApiResponse = await response.json();
          setLog(data.data || null);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          setError(errorMessage);
          console.error(`Failed to fetch log details for ${logId}:`, err);
          setLog(null);
        } finally {
          setLoading(false);
        }
      };
      fetchLogDetail();
    } else if (router.isReady && !logId) {
        setLoading(false);
        setError("Log ID is missing from URL.");
    }
  }, [logId, router.isReady]);

  if (!router.isReady || loading) {
    return (
      <AuthWrapper>
        <DashboardLayout pageTitle="Loading Log Details...">
          <LoadingSpinner message="Loading log details..." />
        </DashboardLayout>
      </AuthWrapper>
    );
  }

  if (error) {
    return (
      <AuthWrapper>
        <DashboardLayout pageTitle="Error Loading Log">
          <BackToLogs />
          <ErrorDisplay title="Error Loading Log Details" message={error} />
        </DashboardLayout>
      </AuthWrapper>
    );
  }

  if (!log) {
    return (
      <AuthWrapper>
        <DashboardLayout pageTitle="Log Not Found">
          <BackToLogs />
          <div className="text-center text-xl">
            <p>Log not found.</p>
          </div>
        </DashboardLayout>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <DashboardLayout pageTitle={`Run Details: ${formatLogDate(log.startTime)}`}>
        <BackToLogs />

        <LogOverviewCard log={log} />

        {/* Processed Source Summaries */}
        <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6">
          Processed Source Details ({log.sourceSummaries?.length || 0})
        </h2>
        
        {log.sourceSummaries && log.sourceSummaries.length > 0 ? (
          <div className="space-y-6">
            {log.sourceSummaries.map((summary, index) => (
              <SourceSummaryCard 
                key={summary.sourceUrl + index} 
                summary={summary} 
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-600 italic">
            No source summaries were recorded for this run.
          </p>
        )}
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default LogDetailPage;