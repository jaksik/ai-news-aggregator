import { useState, useEffect } from 'react';
import { ISource } from '../../lib/types';

interface SourceScrapeControlProps {
  className?: string;
}

interface ScrapeResult {
  sourcesProcessed: number;
  totalItemsFound: number;
  totalItemsProcessed: number;
  totalNewItemsAdded: number;
  totalItemsSkipped: number;
  duration: number;
  errors?: string[];
}

interface SourceInfo {
  totalSources: number;
  enabledSources: number;
}

export default function SourceScrapeControl({ className = '' }: SourceScrapeControlProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<SourceInfo>({ totalSources: 0, enabledSources: 0 });

  // Fetch source information on component mount
  useEffect(() => {
    const fetchSourceInfo = async () => {
      try {
        const response = await fetch('/api/sources');
        const data = await response.json();
        const sources = data.data || [];
        setSourceInfo({
          totalSources: sources.length,
          enabledSources: sources.filter((source: ISource) => source.isEnabled).length
        });
      } catch (err) {
        console.error('Failed to fetch source info:', err);
      }
    };

    fetchSourceInfo();
  }, []);

  const handleScrapeAll = async () => {
    if (sourceInfo.enabledSources === 0) {
      setError('No enabled sources available to scrape');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/sources/scrape-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape sources');
      }

      // Handle both data.data and direct data responses
      const resultData = data.data || data;
      setResult({
        sourcesProcessed: resultData.sourcesProcessed || sourceInfo.enabledSources,
        totalItemsFound: resultData.totalItemsFound || 0,
        totalItemsProcessed: resultData.totalItemsProcessed || 0,
        totalNewItemsAdded: resultData.totalNewItemsAdded || 0,
        totalItemsSkipped: resultData.totalItemsSkipped || 0,
        duration: resultData.duration || 0,
        errors: resultData.errors || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">Bulk Source Scraping</h3>
      </div>
      
      <p className="text-gray-600 mb-4">
        Scrape all enabled news sources at once to fetch the latest articles.
      </p>

      <div className="space-y-4">
        {/* Source Info */}
        <div className="bg-gray-50 rounded-md p-3">
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Total Sources:</span>
              <span className="font-medium">{sourceInfo.totalSources}</span>
            </div>
            <div className="flex justify-between">
              <span>Enabled Sources:</span>
              <span className="font-medium text-green-600">{sourceInfo.enabledSources}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleScrapeAll}
          disabled={isLoading || sourceInfo.enabledSources === 0}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Scraping All Sources...
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Scrape All Sources
            </>
          )}
        </button>

        {sourceInfo.enabledSources === 0 && (
          <div className="text-xs text-gray-500 text-center">
            Enable sources in the Sources page to use this feature
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-800">Scraping Complete</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <div className="flex justify-between">
                <span>Sources Processed:</span>
                <span className="font-medium">{result.sourcesProcessed}</span>
              </div>
              <div className="flex justify-between">
                <span>Articles Found:</span>
                <span className="font-medium">{result.totalItemsFound.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>New Articles Added:</span>
                <span className="font-medium text-green-600">{result.totalNewItemsAdded.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Articles Skipped:</span>
                <span className="font-medium">{result.totalItemsSkipped.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">{Math.round(result.duration / 1000)}s</span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <span className="text-yellow-700">Errors: {result.errors.length}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-red-800">Error</span>
            </div>
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
