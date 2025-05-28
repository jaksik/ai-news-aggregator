// File: components/dashboard/AddSourceModal.tsx
import React, { useState, FormEvent } from 'react';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceAdded: () => void; // Callback to refresh the sources list
}

const AddSourceModal: React.FC<AddSourceModalProps> = ({ isOpen, onClose, onSourceAdded }) => {
  const [name, setName] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [type, setType] = useState<'rss' | 'html'>('rss');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!name.trim() || !url.trim()) {
      setFormError('Name and URL are required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, url, type, isEnabled: true }), // isEnabled defaults to true
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Failed to add source (status: ${response.status})`);
      }

      // Success
      onSourceAdded(); // Trigger refresh of the source list in the parent
      onClose();       // Close the modal
      // Reset form for next time
      setName('');
      setUrl('');
      setType('rss');

    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
      console.error('Failed to add source:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl w-full max-w-md transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Add New Source</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{formError}</span>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="sourceName" className="block text-sm font-medium text-gray-700 mb-1">
              Source Name
            </label>
            <input
              type="text"
              id="sourceName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., My Favorite Tech Blog"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-1">
              URL (RSS Feed or Webpage)
            </label>
            <input
              type="url"
              id="sourceUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="https://example.com/feed"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="sourceType" className="block text-sm font-medium text-gray-700 mb-1">
              Source Type
            </label>
            <select
              id="sourceType"
              value={type}
              onChange={(e) => setType(e.target.value as 'rss' | 'html')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="rss">RSS Feed</option>
              <option value="html">HTML Webpage (for scraping)</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-indigo-400"
            >
              {isSubmitting ? 'Adding...' : 'Add Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSourceModal;