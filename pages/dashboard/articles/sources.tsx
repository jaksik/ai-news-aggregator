import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import AuthWrapper from '../../../components/auth/AuthWrapper';
import { ISource } from '../../../models/Source';
import AddSourceModal from '../../../components/sources/AddSourceModal';
import EditSourceModal from '../../../components/sources/EditSourceModal';

const SourcesPage: React.FC = () => {
  const [sources, setSources] = useState<ISource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [sourceToEdit, setSourceToEdit] = useState<ISource | null>(null);

  // Bulk selection state
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const response = await fetch('/api/sources');
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Failed to fetch sources');
      }
      const data = await response.json();
      setSources(data.data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Filter sources based on search and status
  const filteredSources = sources.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      source.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'enabled' && source.isEnabled) ||
      (filterStatus === 'disabled' && !source.isEnabled);
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(dateString);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedSources.size === filteredSources.length) {
      setSelectedSources(new Set());
    } else {
      setSelectedSources(new Set(filteredSources.map(s => s._id!.toString())));
    }
  };

  const handleSelectSource = (sourceId: string) => {
    const newSelected = new Set(selectedSources);
    if (newSelected.has(sourceId)) {
      newSelected.delete(sourceId);
    } else {
      newSelected.add(sourceId);
    }
    setSelectedSources(newSelected);
  };

  const handleBulkOperation = async (operation: 'enable' | 'disable') => {
    if (selectedSources.size === 0) return;

    setIsBulkOperating(true);
    setActionError(null);

    try {
      const response = await fetch('/api/sources/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          sourceIds: Array.from(selectedSources)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Batch operation failed');
      }

      await fetchSources();
      setSelectedSources(new Set());
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setActionError(`Bulk ${operation} failed: ${errorMessage}`);
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Individual source actions
  const handleAddSourceClick = () => setIsAddModalOpen(true);
  const handleAddModalClose = () => setIsAddModalOpen(false);
  const handleSourceAdded = () => fetchSources();

  const handleEditModalOpen = (source: ISource) => {
    setSourceToEdit(source);
    setIsEditModalOpen(true);
  };
  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSourceToEdit(null);
  };
  const handleSourceUpdated = () => fetchSources();

  const handleDelete = async (sourceId: string, sourceName: string) => {
    if (!window.confirm(`Delete "${sourceName}"? This action cannot be undone.`)) return;

    setIsSubmittingAction(sourceId);
    setActionError(null);

    try {
      const response = await fetch(`/api/sources/${sourceId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete source');

      await fetchSources();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setActionError(`Delete failed: ${errorMessage}`);
    } finally {
      setIsSubmittingAction(null);
    }
  };

  const handleToggleEnable = async (sourceId: string, currentIsEnabled: boolean) => {
    setIsSubmittingAction(sourceId);
    setActionError(null);

    try {
      const response = await fetch(`/api/sources/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !currentIsEnabled })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to toggle source');

      await fetchSources();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setActionError(`Toggle failed: ${errorMessage}`);
    } finally {
      setIsSubmittingAction(null);
    }
  };

  const handleScrapeNow = async (sourceId: string, sourceName: string) => {
    setIsSubmittingAction(sourceId);
    setActionError(null);

    try {
      const response = await fetch(`/api/sources/${sourceId}/scrape`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to scrape source');

      const result = data.data || data; // Handle both new and old response formats
      
      // Use comprehensive processing statistics from ProcessingSummary
      const articlesFound = result.itemsFound || 0;
      const articlesProcessed = result.itemsProcessed || 0;
      const newArticlesAdded = result.newItemsAdded || 0;
      const articlesSkipped = result.itemsSkipped || 0;
      const hasErrors = result.errors && result.errors.length > 0;
      
      const successMessage = `Scrape completed for "${sourceName}"!\n` +
                           `• Articles found: ${articlesFound}\n` +
                           `• Articles processed: ${articlesProcessed}\n` +
                           `• New articles saved: ${newArticlesAdded}\n` +
                           `• Articles skipped: ${articlesSkipped}` +
                           (hasErrors ? `\n• Errors: ${result.errors.length}` : '') +
                           `\n• Duration: ${result.duration ? Math.round(result.duration) + 'ms' : 'Unknown'}` +
                           (result.logId ? `\n• Log ID: ${result.logId}` : '');
      
      alert(successMessage);
      await fetchSources();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setActionError(`Scrape failed: ${errorMessage}`);
    } finally {
      setIsSubmittingAction(null);
    }
  };

  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Sources - AI News Aggregator">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">News Sources</h1>
                <p className="mt-2 text-sm text-gray-700">
                  Manage your RSS feeds and news sources
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <button
                  onClick={handleAddSourceClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Source
                </button>
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {actionError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading sources...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading sources</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <div className="mt-6">
                <button
                  onClick={() => fetchSources()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!loading && !error && (
            <>
              {/* Search and Filters */}
              <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <svg className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search sources..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'enabled' | 'disabled')}
                    className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Sources</option>
                    <option value="enabled">Enabled Only</option>
                    <option value="disabled">Disabled Only</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedSources.size > 0 && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm text-blue-700">
                        {selectedSources.size} source{selectedSources.size !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBulkOperation('enable')}
                        disabled={isBulkOperating}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50"
                      >
                        Enable All
                      </button>
                      <button
                        onClick={() => handleBulkOperation('disable')}
                        disabled={isBulkOperating}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50"
                      >
                        Disable All
                      </button>
                      <button
                        onClick={() => setSelectedSources(new Set())}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sources Grid */}
              {filteredSources.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {searchTerm || filterStatus !== 'all' ? 'No sources found' : 'No sources configured'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Get started by adding your first news source.'
                    }
                  </p>
                  {!searchTerm && filterStatus === 'all' && (
                    <div className="mt-6">
                      <button
                        onClick={handleAddSourceClick}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Your First Source
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Table Header */}
                  <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 rounded-t-lg">
                    <div className="flex items-center">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedSources.size === filteredSources.length && filteredSources.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-3 text-sm font-medium text-gray-700">
                          Select All
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Sources List */}
                  <div className="bg-white border border-gray-200 rounded-b-lg divide-y divide-gray-200">
                    {filteredSources.map((source) => (
                      <div
                        key={source._id?.toString()}
                        className={`px-6 py-4 hover:bg-gray-50 transition-colors ${isSubmittingAction === source._id?.toString() ? 'opacity-50' : ''
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedSources.has(source._id!.toString())}
                              onChange={() => handleSelectSource(source._id!.toString())}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3">
                                <h3 className="text-md font-medium text-gray-900 truncate">
                                  {source.name}
                                </h3>
                              </div>
                              <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-600 truncate max-w-md"
                                  title={source.url}
                                >
                                  {source.url}
                                </a>
                              </div>
                            </div>
                          </div>

                          <div className="px-5">
                            {source.lastError && (
                              <>
                                <span className="text-red-600 truncate text-xs" title={source.lastError}>
                                  {source.lastError}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">

                            {/* rss or html */}
                            <div className="flex items-center text-sm text-gray-600">
                              <span>{formatDate(source.lastFetchedAt)}</span>
                            </div>

                            {/* rss or html */}
                            <div className="flex items-center min-w-15">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${source.type === 'rss' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                {source.type.toUpperCase()}
                              </span>
                            </div>

                            {/* Quick Toggle */}
                            <div className="flex items-center min-w-20">
                              <button
                                onClick={() => handleToggleEnable(source._id!.toString(), source.isEnabled)}
                                disabled={isSubmittingAction === source._id?.toString()}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors ${source.isEnabled
                                  ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                                  } ${isSubmittingAction === source._id?.toString() ? 'cursor-not-allowed' : ''}`}
                              >
                                {isSubmittingAction === source._id?.toString() ? '...' : (source.isEnabled ? 'Enabled' : 'Disabled')}
                              </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleScrapeNow(source._id!.toString(), source.name)}
                                disabled={!source.isEnabled || isSubmittingAction === source._id?.toString()}
                                className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Scrape now"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEditModalOpen(source)}
                                disabled={isSubmittingAction === source._id?.toString()}
                                className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Edit source"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(source._id!.toString(), source.name)}
                                disabled={isSubmittingAction === source._id?.toString()}
                                className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete source"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modals */}
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
    </AuthWrapper>
  );
};

export default SourcesPage;