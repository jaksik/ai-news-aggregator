// File: components/sources/EditSourceModal.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { ISource } from '../../lib/types';

interface EditSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceUpdated: () => void; // Callback to refresh the sources list
  sourceToEdit: ISource | null;
}

const EditSourceModal: React.FC<EditSourceModalProps> = ({ isOpen, onClose, onSourceUpdated, sourceToEdit }) => {
  const [name, setName] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [type, setType] = useState<'rss' | 'html'>('rss');
  const [websiteId, setWebsiteId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name);
      setUrl(sourceToEdit.url);
      setType(sourceToEdit.type);
      setWebsiteId(sourceToEdit.websiteId || '');
    } else {
      // Reset form if sourceToEdit becomes null (e.g., modal closed and reopened without a source)
      setName('');
      setUrl('');
      setType('rss');
      setWebsiteId('');
    }
  }, [sourceToEdit]); // Re-populate form when sourceToEdit changes

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sourceToEdit || !sourceToEdit._id) {
      setFormError('No source selected for editing.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (!name.trim() || !url.trim()) {
      setFormError('Name and URL are required.');
      setIsSubmitting(false);
      return;
    }

    if (type === 'html' && !websiteId.trim()) {
      setFormError('Website ID is required for HTML sources.');
      setIsSubmitting(false);
      return;
    }

    try {
      const requestBody: {
        name: string;
        url: string;
        type: string;
        websiteId?: string;
      } = { name, url, type };
      
      // Add websiteId for HTML sources
      if (type === 'html') {
        requestBody.websiteId = websiteId;
      }

      const response = await fetch(`/api/sources/${sourceToEdit._id.toString()}`, { // Using your /api/sources/[sourceId] PUT endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send all editable fields. The backend PUT handler only updates fields that are present.
        body: JSON.stringify(requestBody),
      });

      // Check if response is actually JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text);
        throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
      }

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Failed to update source (status: ${response.status})`);
      }

      onSourceUpdated(); // Trigger refresh of the source list
      onClose();       // Close the modal

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while updating.';
      setFormError(errorMessage);
      console.error('Failed to update source:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !sourceToEdit) { // Don't render if not open or no source to edit
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl w-full max-w-md transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Edit Source</h2>
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
            <label htmlFor="editSourceName" className="block text-sm text-gray-700 mb-1 font-semibold">
              Source Name
            </label>
            <input
              type="text"
              id="editSourceName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="editSourceUrl" className="block text-sm text-gray-700 mb-1 font-semibold">
              URL
            </label>
            <input
              type="url"
              id="editSourceUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="editSourceType" className="block text-sm text-gray-700 mb-1 font-semibold">
              Source Type
            </label>
            <select
              id="editSourceType"
              value={type}
              onChange={(e) => setType(e.target.value as 'rss' | 'html')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            >
              <option value="rss">RSS Feed</option>
              <option value="html">HTML Webpage</option>
            </select>
          </div>

          {type === 'html' && (
            <div className="mb-6">
              <label htmlFor="editWebsiteId" className="block text-sm text-gray-700 mb-1 font-semibold">
                Website Configuration
              </label>
              <select
                id="editWebsiteId"
                value={websiteId}
                onChange={(e) => setWebsiteId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                required
              >
                <option value="">Select a website configuration...</option>
                <option value="anthropic-news">Anthropic News</option>
                <option value="elevenlabs-blog">ElevenLabs Blog</option>
                <option value="scale-blog">Scale AI Blog</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose the pre-configured website scraping settings that match your target site.
              </p>
            </div>
          )}

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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSourceModal;