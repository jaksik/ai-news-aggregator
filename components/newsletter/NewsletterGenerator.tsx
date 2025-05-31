import React, { useState } from 'react';
import { INewsletter } from '../../models/Newsletter';

interface NewsletterGeneratorProps {
  onNewsletterGenerated: (newsletter: INewsletter) => void;
}

const NewsletterGenerator: React.FC<NewsletterGeneratorProps> = ({ onNewsletterGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [daysBack, setDaysBack] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/newsletter/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daysBack,
          forceRegenerate: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate newsletter');
      }

      const data = await response.json();
      onNewsletterGenerated(data.newsletter);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Newsletter generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Generate Newsletter</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="daysBack" className="block text-sm font-medium text-gray-700 mb-2">
            Look back how many days?
          </label>
          <select
            id="daysBack"
            value={daysBack}
            onChange={(e) => setDaysBack(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          >
            <option value={1}>1 day</option>
            <option value={2}>2 days</option>
            <option value={3}>3 days (recommended)</option>
            <option value={5}>5 days</option>
            <option value={7}>1 week</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            isGenerating
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Newsletter...
            </span>
          ) : (
            '🚀 Generate Newsletter Draft'
          )}
        </button>

        <div className="text-sm text-gray-500">
          <p>This will analyze the most recent articles using AI and create a newsletter draft with:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>🚀 Top Headlines (biggest impact news)</li>
            <li>💡 Product & Platform Updates</li>
            <li>🔬 Research & Innovation</li>
            <li>🤖 AI-powered scoring, categorization & summarization</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NewsletterGenerator;
