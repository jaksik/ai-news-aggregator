import React, { useState } from 'react';
// We'll need the OverallFetchRunResult interface to type the API response
import { OverallFetchRunResult } from '../../lib/services/fetcher';
import Link from 'next/link';

const FetchAllSourcesControl: React.FC = () => {
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastRunSummary, setLastRunSummary] = useState<OverallFetchRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchAll = async () => {
    setIsFetching(true);
    setStatusMessage('Initiating fetch for all enabled sources...');
    setLastRunSummary(null);
    setError(null);

    try {
      const response = await fetch('/api/sources/fetch', {
        method: 'POST',
        // No body needed for this request
      });

      const resultData: OverallFetchRunResult | { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error((resultData as { error?: string }).error || `Failed to fetch all sources (status: ${response.status})`);
      }
      
      const summary = resultData as OverallFetchRunResult;
      setLastRunSummary(summary);
      setStatusMessage(
        `Fetch run ${summary.status}! Added ${summary.totalNewArticlesAddedAcrossAllSources} new articles from ${summary.totalSourcesSuccessfullyProcessed}/${summary.totalSourcesAttempted} sources. Log ID: ${summary.logId}`
      );
      if(summary.orchestrationErrors && summary.orchestrationErrors.length > 0) {
        setError(`Run completed with orchestration errors: ${summary.orchestrationErrors.join(', ')}`);
      }
      if(summary.totalSourcesFailedWithError > 0) {
        setError((prevError) => (prevError ? prevError + '; ' : '') + `${summary.totalSourcesFailedWithError} source(s) failed during fetch.`);
      }


    } catch (err: unknown) {
      console.error('Fetch all sources error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setStatusMessage(null); // Clear status message on error
    } finally {
      setIsFetching(false);
    }
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white p-6 shadow-lg rounded-lg">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Global Fetch Control</h2>
      <button
        onClick={handleFetchAll}
        disabled={isFetching}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-colors duration-150 ease-in-out w-full sm:w-auto"
      >
        {isFetching ? 'Fetching All Sources...' : 'Fetch All Enabled Sources Now'}
      </button>

      {statusMessage && !error && ( // Show status message only if no overriding error
        <p className={`mt-4 text-sm ${error ? 'text-red-600' : 'text-green-600'}`}>{statusMessage}</p>
      )}
      {error && (
         <p className="mt-4 text-sm text-red-600">Error: {error}</p>
      )}

      {lastRunSummary && (
        <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50 text-sm">
          <h3 className="font-semibold text-gray-700 mb-2">Last Run Triggered by this Control:</h3>
          <p><strong>Status:</strong> {lastRunSummary.status.replace('_', ' ')}</p>
          <p><strong>Time:</strong> {formatDate(lastRunSummary.startTime)} - {formatDate(lastRunSummary.endTime)}</p>
          <p><strong>Sources Attempted:</strong> {lastRunSummary.totalSourcesAttempted}</p>
          <p><strong>Sources Successful:</strong> {lastRunSummary.totalSourcesSuccessfullyProcessed}</p>
          <p><strong>Sources Failed (Fetch):</strong> {lastRunSummary.totalSourcesFailedWithError}</p>
          <p><strong>New Articles Added:</strong> {lastRunSummary.totalNewArticlesAddedAcrossAllSources}</p>
          {lastRunSummary.logId && (
            <p><strong>Log ID:</strong> 
              <Link href={`/dashboard/logs/${lastRunSummary.logId}`} legacyBehavior>
                <a className="text-indigo-600 hover:underline ml-1">{lastRunSummary.logId}</a>
              </Link>
            </p>
          )}
          {lastRunSummary.orchestrationErrors && lastRunSummary.orchestrationErrors.length > 0 && (
            <div className="mt-2">
              <strong className="text-red-600">Orchestration Errors:</strong>
              <ul className="list-disc list-inside text-red-600 text-xs">
                {lastRunSummary.orchestrationErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FetchAllSourcesControl;