import { useState } from 'react';

interface AiCategorizationControlProps {
  className?: string;
}

interface BatchResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export default function AiCategorizationControl({ className = '' }: AiCategorizationControlProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  const handleCategorizeBatch = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/articles/categorize-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to categorize articles');
      }

      setResult(data.details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">AI Article Categorization</h3>
      </div>
      
      <p className="text-gray-600 mb-4">
        Use AI to automatically categorize uncategorized articles based on their content.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-1">
            Number of articles to process
          </label>
          <input
            id="limit"
            type="number"
            min="1"
            max="100"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-xs text-gray-500 ml-2">Max: 100</span>
        </div>

        <button
          onClick={handleCategorizeBatch}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Articles...
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Categorize Articles
            </>
          )}
        </button>

        {/* Results Display */}
        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-800">Categorization Complete</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <div>Processed: {result.processed} articles</div>
              <div>Successful: {result.successful} articles</div>
              {result.failed > 0 && <div>Failed: {result.failed} articles</div>}
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
