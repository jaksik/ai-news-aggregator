import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import AuthWrapper from '../../../components/auth/AuthWrapper';
import NewsletterGenerator from '../../../components/newsletter/NewsletterGenerator';
import NewsletterPreview from '../../../components/newsletter/NewsletterPreview';
import { INewsletter } from '../../../models/Newsletter';

const NewsletterPage: React.FC = () => {
  const [newsletters, setNewsletters] = useState<INewsletter[]>([]);
  const [currentNewsletter, setCurrentNewsletter] = useState<INewsletter | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch existing newsletters
  const fetchNewsletters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/newsletter?limit=5');
      if (!response.ok) {
        throw new Error('Failed to fetch newsletters');
      }
      const data = await response.json();
      setNewsletters(data.data?.newsletters || []);
    } catch (err) {
      console.error('Failed to fetch newsletters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsletters();
  }, []);

  const handleNewsletterGenerated = (newsletter: INewsletter) => {
    setCurrentNewsletter(newsletter);
    // Add to the list
    setNewsletters(prev => [newsletter, ...prev]);
  };

  const handleViewNewsletter = (newsletter: INewsletter) => {
    setCurrentNewsletter(newsletter);
  };

  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Newsletter Generator - My Aggregator">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Newsletter Generator</h1>
          <p className="text-md md:text-lg text-gray-600">
            Create AI-powered newsletter drafts from your recent articles.
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Generator */}
          <div className="xl:col-span-1">
            <NewsletterGenerator onNewsletterGenerated={handleNewsletterGenerated} />
            
            {/* Recent Newsletters */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Newsletters</h3>
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : newsletters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No newsletters yet.</p>
                  <p className="text-sm mt-1">Generate your first newsletter to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {newsletters.map((newsletter) => (
                    <div
                      key={newsletter._id?.toString()}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        currentNewsletter?._id?.toString() === newsletter._id?.toString()
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleViewNewsletter(newsletter)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800 text-sm">
                            {new Date(newsletter.date).toLocaleDateString()}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {newsletter.articlesProcessed} articles • {newsletter.status}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(newsletter.generatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="xl:col-span-2">
            {currentNewsletter ? (
              <NewsletterPreview newsletter={currentNewsletter} />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No Newsletter Selected</h3>
                <p className="text-gray-600">
                  Generate a new newsletter or select an existing one from the list to preview it here.
                </p>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default NewsletterPage;
