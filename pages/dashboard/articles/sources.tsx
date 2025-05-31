// File: pages/dashboard/sources.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react'; // Added useRef
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import AuthWrapper from '../../../components/auth/AuthWrapper';
import { ISource } from '../../../models/Source';
import AddSourceModal from '../../../components/dashboard/AddSourceModal';
import EditSourceModal from '../../../components/dashboard/EditSourceModal';

const SourcesPage: React.FC = () => {
  const [sources, setSources] = useState<ISource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [sourceToEdit, setSourceToEdit] = useState<ISource | null>(null);

  // --- NEW: State for managing which dropdown is open ---
  const [openDropdownSourceId, setOpenDropdownSourceId] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});


  const fetchSources = useCallback(async () => { /* ... same ... */
    setLoading(true); setError(null); setActionError(null);
    try {
      const response = await fetch('/api/sources');
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed'); }
      const data = await response.json(); setSources(data.sources || []);
    } catch (error: unknown) { 
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage); 
      setSources([]); 
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  // --- NEW: Click outside to close dropdown ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownSourceId) {
        const currentDropdownRef = dropdownRefs.current[openDropdownSourceId];
        // Check if the click is outside the currently open dropdown and its trigger
        // This simple check assumes trigger is part of the same cell, might need refinement
        // For more robust solution, each trigger button would also need a ref.
        if (currentDropdownRef && !currentDropdownRef.contains(event.target as Node)) {
          // A more specific check would be to see if the target is also not the trigger button itself.
          // For now, this closes if you click anywhere else.
          let isTriggerButton = false;
          const triggerButton = document.getElementById(`action-button-${openDropdownSourceId}`);
          if (triggerButton && triggerButton.contains(event.target as Node)) {
            isTriggerButton = true;
          }
          if (!isTriggerButton) {
            setOpenDropdownSourceId(null);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownSourceId]);


  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    try { 
      return new Date(dateString).toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }); 
    }
    catch {
      return String(dateString);
    }
  };
  const handleAddSourceClick = () => setIsAddModalOpen(true);
  const handleAddModalClose = () => setIsAddModalOpen(false);
  const handleSourceAdded = () => { fetchSources(); setOpenDropdownSourceId(null); };
  const handleEditModalOpen = (source: ISource) => { setSourceToEdit(source); setIsEditModalOpen(true); setOpenDropdownSourceId(null); };
  const handleEditModalClose = () => { setIsEditModalOpen(false); setSourceToEdit(null); };
  const handleSourceUpdated = () => { fetchSources(); setOpenDropdownSourceId(null); };

  const handleDelete = async (sourceId: string, sourceName: string) => {
    setOpenDropdownSourceId(null); // Close dropdown first
    if (!window.confirm(`Delete "${sourceName}"?`)) return;
    setIsSubmittingAction(sourceId); setActionError(null);
    try { /* ... same delete logic ... */
      const res = await fetch(`/api/sources/${sourceId}`, { method: 'DELETE' });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed');
      fetchSources();
    } catch (error: unknown) { 
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setActionError(`Deleting "${sourceName}": ${errorMessage}`); 
    }
    finally { setIsSubmittingAction(null); }
  };

  const handleToggleEnable = async (sourceId: string, currentIsEnabled: boolean, sourceName: string) => {
    setOpenDropdownSourceId(null); // Close dropdown first
    setIsSubmittingAction(sourceId); setActionError(null);
    try { /* ... same toggle logic ... */
      const res = await fetch(`/api/sources/${sourceId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isEnabled: !currentIsEnabled }) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed');
      fetchSources();
    } catch (error: unknown) { 
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setActionError(`Toggling "${sourceName}": ${errorMessage}`); 
    }
    finally { setIsSubmittingAction(null); }
  };

  const handleFetchNow = async (sourceId: string, sourceName: string) => {
    setOpenDropdownSourceId(null); // Close dropdown first
    setIsSubmittingAction(sourceId); setActionError(null);
    try { /* ... same fetch now logic ... */
      const res = await fetch(`/api/sources/${sourceId}/fetch`, { method: 'POST' });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed');
      const logMessage = d.logId ? 
        `Fetch for "${sourceName}" done. Status: ${d.status}, New: ${d.newItemsAdded}. Log ID: ${d.logId}` :
        `Fetch for "${sourceName}" done. Status: ${d.status}, New: ${d.newItemsAdded}`;
      alert(logMessage);
      fetchSources();
    } catch (error: unknown) { 
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setActionError(`Fetching "${sourceName}": ${errorMessage}`); 
    }
    finally { setIsSubmittingAction(null); }
  };

  // --- NEW: Handler for dropdown toggle ---
  const toggleDropdown = (sourceId: string) => {
    setOpenDropdownSourceId(prevId => (prevId === sourceId ? null : sourceId));
  };


  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Manage Sources - My Aggregator">
        {/* ... (Header as before) ... */}
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-4 sm:mb-0 text-center sm:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">News Sources</h1>
            <p className="text-md md:text-lg text-gray-600">Configure your RSS news sources.</p>
          </div>
          <button
            onClick={handleAddSourceClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out"
          >
            + Add New Source
          </button>
        </header>


        {/* ... (Loading, Error, Empty State JSX as before) ... */}
        {loading && (<div className="flex justify-center items-center h-64"><p className="text-xl text-gray-500">Loading sources...</p></div>)}
        {error && !loading && (<div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert"><p className="font-bold">Error Loading Sources</p><p>{error}</p></div>)}
        {actionError && (<div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert"><p className="font-bold">Action Error</p><p>{actionError}</p></div>)}

        {!loading && !error && (
          <>
            {sources.length === 0 ? (
              <div className="text-center py-10 bg-white shadow-md rounded-lg">
                {/* ... Empty state ... */}
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
                    {/* ... Table Headers ... */}
                    <tr className="bg-gray-200 text-left text-gray-600 uppercase text-xs tracking-wider">
                      <th className="px-5 py-3 border-b-2 border-gray-300">Name & URL</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300 text-center">Type</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300 text-center">Enabled</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300">Last Fetched</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300 max-w-xs">Last Status/Message</th>
                      <th className="px-5 py-3 border-b-2 border-gray-300 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 text-sm">
                    {sources.map((source) => (
                      <tr key={source._id?.toString()}
                        className={`border-b border-gray-200 hover:bg-gray-100 transition-colors duration-150 ${isSubmittingAction === source._id?.toString() ? 'opacity-50' : ''}`}
                      >
                        {/* ... Name, URL, Type, Enabled, Last Fetched, Last Status cells ... */}
                        <td className="px-5 py-4 font-medium" title={source.name}>
                          <div className="font-semibold text-gray-900 text-md">{source.name}</div>
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block" title={source.url}>
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

                        {/* --- UPDATED Actions Column --- */}
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <div className="relative inline-block text-left" ref={el => {
                            if (el) {
                              dropdownRefs.current[source._id!.toString()] = el;
                            }
                          }}>
                            <button
                            id={`action-button-${source._id!.toString()}`}
                            onClick={() => toggleDropdown(source._id!.toString())}
                            disabled={isSubmittingAction === source._id?.toString()}
                            type="button"
                            className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>

                          {openDropdownSourceId === source._id?.toString() && (
                            <div
                              className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                              role="menu"
                              aria-orientation="vertical"
                              aria-labelledby={`action-button-${source._id!.toString()}`}
                            >
                              <div className="py-1" role="none">
                                <button
                                  onClick={() => handleEditModalOpen(source)}
                                  className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 block w-full text-left px-4 py-2 text-sm"
                                  role="menuitem"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleFetchNow(source._id!.toString(), source.name)}
                                  className="text-teal-600 hover:bg-gray-100 hover:text-teal-800 block w-full text-left px-4 py-2 text-sm"
                                  role="menuitem"
                                >
                                  Fetch Now
                                </button>
                                <button
                                  onClick={() => handleDelete(source._id!.toString(), source.name)}
                                  className="text-red-600 hover:bg-gray-100 hover:text-red-800 block w-full text-left px-4 py-2 text-sm"
                                  role="menuitem"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modals as before */}
      <AddSourceModal isOpen={isAddModalOpen} onClose={handleAddModalClose} onSourceAdded={handleSourceAdded} />
      <EditSourceModal isOpen={isEditModalOpen} onClose={handleEditModalClose} onSourceUpdated={handleSourceUpdated} sourceToEdit={sourceToEdit} />
    </DashboardLayout>
    </AuthWrapper>
  );
};

export default SourcesPage;