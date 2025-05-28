import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
// Adjust this import path if your models folder is structured differently
// This assumes models is at the root, and this page is pages/dashboard/logs/[runId].tsx
import { IFetchRunLog, IProcessingSummarySubdoc, IItemErrorSubdoc } from '../../../models/FetchRunLog';

// Type for the API response from /api/fetch-logs/[runId]
interface FetchLogDetailApiResponse {
  log?: IFetchRunLog;
  error?: string;
  message?: string;
}

const LogDetailPage: React.FC = () => {
  const router = useRouter();
  const { runId } = router.query; // Get runId from the URL query parameters

  const [log, setLog] = useState<IFetchRunLog | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof runId === 'string') { // Ensure runId is a string and available
      const fetchLogDetail = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/fetch-logs/${runId}`);
          if (!response.ok) {
            const errorData: FetchLogDetailApiResponse = await response.json();
            throw new Error(errorData.error || errorData.message || `Failed to fetch log details: ${response.status}`);
          }
          const data: FetchLogDetailApiResponse = await response.json();
          setLog(data.log || null);
        } catch (err: any) {
          setError(err.message);
          console.error(`Failed to fetch log details for ${runId}:`, err);
          setLog(null);
        } finally {
          setLoading(false);
        }
      };
      fetchLogDetail();
    } else if (router.isReady && !runId) { // router is ready but runId is still undefined
        setLoading(false);
        setError("Run ID is missing from URL.");
    }
  }, [runId, router.isReady]); // Re-fetch if runId changes or when router is ready

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
    } catch (e) {
        return String(dateString);
    }
  };

  const getStatusBadgeColor = (status: IFetchRunLog['status'] | IProcessingSummarySubdoc['status']) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'completed_with_errors':
      case 'partial_success':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  const renderItemErrors = (errors: IItemErrorSubdoc[] | undefined) => {
    if (!errors || errors.length === 0) return <span className="text-gray-500 italic">None</span>;
    return (
      <ul className="list-disc list-inside pl-5 text-xs text-red-700 space-y-1">
        {errors.map((err, index) => (
          <li key={index}>
            {err.itemTitle && <span className="font-medium">"{err.itemTitle}": </span>}
            {err.message}
            {err.itemLink && <a href={err.itemLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">(link)</a>}
          </li>
        ))}
      </ul>
    );
  };

  if (!router.isReady || loading) { // Wait for router to be ready or if still loading
    return <div className="container mx-auto p-6 text-center text-xl animate-pulse">Loading log details...</div>;
  }
  if (error) {
    return (
        <div className="container mx-auto p-6">
            <Link href="/dashboard/logs" legacyBehavior><a className="text-indigo-600 hover:underline mb-4 inline-block">&larr; Back to All Logs</a></Link>
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                <p className="font-bold">Error Loading Log Details</p>
                <p>{error}</p>
            </div>
        </div>
    );
  }
  if (!log) {
    return (
        <div className="container mx-auto p-6 text-center text-xl">
            <Link href="/dashboard/logs" legacyBehavior><a className="text-indigo-600 hover:underline mb-4 inline-block">&larr; Back to All Logs</a></Link>
            <p>Log not found.</p>
        </div>
    );
  }

  const duration = log.endTime && log.startTime
    ? ((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000).toFixed(1) + 's'
    : 'N/A';

  return (
    <>
      <Head>
        <title>Run Details: {formatDate(log.startTime)} - News Aggregator</title>
      </Head>
      <div className="container mx-auto p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <Link href="/dashboard/logs" legacyBehavior>
            <a className="inline-flex items-center text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Back to All Logs
            </a>
          </Link>
        </div>

        {/* Overall Run Summary Card */}
        <div className="bg-white shadow-xl rounded-lg p-6 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">Fetch Run Details</h1>
          <p className="text-xs text-gray-500 mb-4">ID: {log._id?.toString()}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div><strong className="text-gray-600 block">Status:</strong> <span className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${getStatusBadgeColor(log.status)} border`}>{log.status.replace('_', ' ').toUpperCase()}</span></div>
            <div><strong className="text-gray-600 block">Start Time:</strong> <span className="text-gray-800">{formatDate(log.startTime)}</span></div>
            <div><strong className="text-gray-600 block">End Time:</strong> <span className="text-gray-800">{log.endTime ? formatDate(log.endTime) : 'In Progress'}</span></div>
            <div><strong className="text-gray-600 block">Duration:</strong> <span className="text-gray-800">{duration}</span></div>
            <div><strong className="text-gray-600 block">Sources Attempted:</strong> <span className="text-gray-800">{log.totalSourcesAttempted}</span></div>
            <div><strong className="text-gray-600 block">Sources Successful:</strong> <span className="text-gray-800">{log.totalSourcesSuccessfullyProcessed}</span></div>
            <div><strong className="text-gray-600 block">Sources Failed (Fetch):</strong> <span className="text-gray-800">{log.totalSourcesFailedWithError}</span></div>
            <div><strong className="text-gray-600 block">Total New Articles:</strong> <span className="font-bold text-green-700">{log.totalNewArticlesAddedAcrossAllSources}</span></div>
          </div>

          {log.orchestrationErrors && log.orchestrationErrors.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-md text-red-700 mb-2">Orchestration Errors:</h3>
              <ul className="list-disc list-inside pl-5 text-sm text-red-600 space-y-1">
                {log.orchestrationErrors.map((err, index) => <li key={index}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Processed Source Summaries */}
        <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6">Processed Source Details ({log.sourceSummaries?.length || 0})</h2>
        {log.sourceSummaries && log.sourceSummaries.length > 0 ? (
          <div className="space-y-6">
            {log.sourceSummaries.map((summary, index) => (
              <div key={summary.sourceUrl + index} className="bg-white shadow-lg rounded-lg p-6 border-l-4 ${summary.status === 'success' ? 'border-green-500' : (summary.status === 'partial_success' ? 'border-yellow-500' : 'border-red-500')}">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  <a href={summary.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 hover:underline">{summary.sourceName}</a> 
                </h3>
                <p className="text-xs text-gray-500 mb-3">Type: {summary.type.toUpperCase()} | URL: {summary.sourceUrl}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm mb-3">
                  <div><strong className="text-gray-600">Status:</strong> <span className={`px-2 py-0.5 text-xs font-semibold leading-tight rounded-full ${getStatusBadgeColor(summary.status)} border`}>{summary.status.replace('_', ' ').toUpperCase()}</span></div>
                  <div><strong className="text-gray-600">Items Found:</strong> <span className="text-gray-800">{summary.itemsFound}</span></div>
                  <div><strong className="text-gray-600">Items Processed:</strong> <span className="text-gray-800">{summary.itemsProcessed}</span></div>
                  <div><strong className="text-gray-600">New Articles Added:</strong> <span className="font-bold text-green-700">{summary.newItemsAdded}</span></div>
                  <div><strong className="text-gray-600">Items Skipped:</strong> <span className="text-gray-800">{summary.itemsSkipped}</span></div>
                </div>
                <p className="text-sm text-gray-700 mb-2"><strong className="text-gray-600">Message:</strong> {summary.message || <span className="italic text-gray-500">No specific message.</span>}</p>
                
                {summary.fetchError && (
                  <p className="text-sm"><strong className="text-red-600">Fetch Error:</strong> <span className="text-red-700">{summary.fetchError}</span></p>
                )}
                {summary.errors && summary.errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                     <h4 className="font-medium text-xs text-gray-700 mb-1">Item Processing Errors:</h4>
                     {renderItemErrors(summary.errors)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 italic">No source summaries were recorded for this run (this might happen if the run failed very early or no sources were attempted).</p>
        )}
      </div>
    </>
  );
};

export default LogDetailPage;