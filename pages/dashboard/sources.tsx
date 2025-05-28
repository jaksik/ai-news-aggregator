// File: pages/dashboard/sources.tsx
import React, { useEffect, useState, useCallback } from 'react';
// Remove Head from here if DashboardLayout handles the main title
import DashboardLayout from '../../components/dashboard/DashboardLayout'; // Adjust path
import { ISource } from '../../models/Source';
import AddSourceModal from '../../components/dashboard/AddSourceModal';
import EditSourceModal from '../../components/dashboard/EditSourceModal';

// ... (FetchSourcesApiResponse interface and rest of your component logic: useState, fetchSources, handlers, etc.)

const SourcesPage: React.FC = () => {
  // ... all your existing state and functions for SourcesPage ...
  const [sources, setSources] = useState<ISource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [sourceToEdit, setSourceToEdit] = useState<ISource | null>(null);

  const fetchSources = useCallback(async () => { /* ... your existing fetchSources ... */ 
    setLoading(true); setError(null); setActionError(null);
    try {
      const response = await fetch('/api/sources');
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed'); }
      const data = await response.json(); setSources(data.sources || []);
    } catch (e:any) { setError(e.message); setSources([]); } 
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSources(); }, [fetchSources]);
  const formatDate = (dateString?: string | Date) => { /* ... */ 
    if (!dateString) return 'N/A';
    try { return new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } 
    catch (e) { return String(dateString); }
  };
  const handleAddSourceClick = () => setIsAddModalOpen(true);
  const handleAddModalClose = () => setIsAddModalOpen(false);
  const handleSourceAdded = () => { fetchSources(); };
  const handleEditModalOpen = (source: ISource) => { setSourceToEdit(source); setIsEditModalOpen(true); };
  const handleEditModalClose = () => { setIsEditModalOpen(false); setSourceToEdit(null); };
  const handleSourceUpdated = () => { fetchSources(); };
  const handleDelete = async (sourceId: string, sourceName: string) => { /* ... */ 
    if (!window.confirm(`Delete "${sourceName}"?`)) return;
    setIsSubmittingAction(sourceId); setActionError(null);
    try {
      const res = await fetch(`/api/${sourceId}`, { method: 'DELETE' });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed');
      fetchSources();
    } catch (e:any) { setActionError(`Deleting "${sourceName}": ${e.message}`); }
    finally { setIsSubmittingAction(null); }
  };
  const handleToggleEnable = async (sourceId: string, currentIsEnabled: boolean, sourceName: string) => { /* ... */ 
    setIsSubmittingAction(sourceId); setActionError(null);
    try {
      const res = await fetch(`/api/${sourceId}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({isEnabled: !currentIsEnabled})});
      const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed');
      fetchSources();
    } catch (e:any) { setActionError(`Toggling "${sourceName}": ${e.message}`); }
    finally { setIsSubmittingAction(null); }
  };
  const handleFetchNow = async (sourceId: string, sourceName: string) => { /* ... */ 
    setIsSubmittingAction(sourceId); setActionError(null);
    try {
      const res = await fetch(`/api/sources/${sourceId}/fetch-now`, { method: 'POST' });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed');
      alert(`Fetch for "${sourceName}" done. Status: ${d.status}, New: ${d.newItemsAdded}`);
      fetchSources();
    } catch (e:any) { setActionError(`Fetching "${sourceName}": ${e.message}`); }
    finally { setIsSubmittingAction(null); }
  };


  return (
    <DashboardLayout pageTitle="Manage Sources - My Aggregator">
      {/* No need for <Head> here as DashboardLayout handles it.
        The container, mx-auto, p-4 etc. are now handled by DashboardLayout's <main> tag.
        So you start directly with your page-specific content.
      */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-center">
        {/* ... your header content for this page (title, Add New Source button) ... */}
        <div className="mb-4 sm:mb-0 text-center sm:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Manage News Sources</h1>
            <p className="text-md md:text-lg text-gray-600">Configure your RSS feeds and websites.</p>
          </div>
          <button
            onClick={handleAddSourceClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out"
          >
            + Add New Source
          </button>
      </header>

      {/* Loading, Error, Table, and Modals JSX as you had it before */}
      {loading && ( /* ... Loading UI ... */ 
          <div className="flex justify-center items-center h-64">
            <p className="text-xl text-gray-500">Loading sources...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Error Loading Sources</p>
            <p>{error}</p>
          </div>
        )}

        {actionError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Action Error</p>
            <p>{actionError}</p>
          </div>
        )}


        {!loading && !error && (
          <>
            {sources.length === 0 ? (
              <div className="text-center py-10 bg-white shadow-md rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No sources configured</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding a new news source.</p>
                <div className="mt-6">
                  <button
                    onClick={handleAddSourceClick}
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add New Source
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
                <table className="min-w-full leading-normal">
                  <thead>
                    <tr className="bg-gray-200 text-left text-gray-600 uppercase text-xs tracking-wider">
                      <th className="px-5 py-3 border-b-2 border-gray-300">Name</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300">URL</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300 text-center">Type</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300 text-center">Enabled</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300">Last Fetched</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300 max-w-xs">Last Status/Message</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 text-sm">
                    {sources.map((source) => (
                      <tr key={source._id?.toString()} 
                          className={`border-b border-gray-200 hover:bg-gray-100 transition-colors duration-150 ${isSubmittingAction === source._id?.toString() ? 'opacity-50' : ''}`}
                      >
                        <td className="px-5 py-4 whitespace-nowrap font-medium">{source.name}</td>
                        <td className="px-5 py-4 max-w-xs">
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block" title={source.url}>
                            {source.url}
                          </a>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2 py-1 font-semibold leading-tight rounded-full text-xs
                            ${source.type === 'rss' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-purple-100 text-purple-700 border border-purple-300'}
                          `}>
                            {source.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                           <button 
                              onClick={() => handleToggleEnable(source._id!.toString(), source.isEnabled, source.name)}
                              disabled={isSubmittingAction === source._id?.toString()}
                              title={source.isEnabled ? "Click to Disable" : "Click to Enable"}
                              className={`w-16 text-center px-2 py-1 text-xs font-semibold rounded-full leading-tight border transition-colors
                                ${source.isEnabled 
                                  ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'}
                                ${isSubmittingAction === source._id?.toString() ? 'cursor-not-allowed' : ''}
                              `}
                            >
                              {isSubmittingAction === source._id?.toString() ? '...' : (source.isEnabled ? 'YES' : 'NO')}
                            </button>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">{formatDate(source.lastFetchedAt)}</td>
                        <td className="px-5 py-4 max-w-xs truncate" title={source.lastFetchMessage || source.lastStatus || 'N/A'}>
                          {source.lastFetchMessage || source.lastStatus || 'N/A'}
                          {source.lastError && <span className="block text-red-500 text-xs italic" title={source.lastError}>Error: {source.lastError}</span>}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleEditModalOpen(source)}
                            disabled={isSubmittingAction === source._id?.toString()}
                            className="text-indigo-600 hover:text-indigo-900 mr-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                              Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(source._id!.toString(), source.name)} 
                            disabled={isSubmittingAction === source._id?.toString()}
                            className="text-red-600 hover:text-red-900 mr-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                              Delete
                          </button>
                          <button 
                            onClick={() => handleFetchNow(source._id!.toString(), source.name)}
                            disabled={isSubmittingAction === source._id?.toString()}
                            className="text-teal-500 hover:text-teal-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                              Fetch
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      {/* Render Modals */}
      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSourceAdded={handleSourceAdded}
      />
      <EditSourceModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSourceUpdated={handleSourceUpdated}
        sourceToEdit={sourceToEdit}
      />
    </DashboardLayout>
  );
};

export default SourcesPage;