import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import AuthWrapper from '../../../components/auth/AuthWrapper';
import EditToolModal from '../../../components/tools/EditToolModal';
import ToolsGrid from '../../../components/tools/ToolsGrid';
import EmptyToolsState from '../../../components/tools/EmptyToolsState';
import Link from 'next/link';

interface Tool {
  _id: string;
  name: string;
  category: string;
  subcategory: string;
  url: string;
  logoUrl: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface ToolsResponse {
  success: boolean;
  data: {
    tools: Tool[];
    total: number;
  };
  error?: string;
}

const ToolsIndexPage: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const fetchTools = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tools');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data: ToolsResponse = await response.json();
      setTools(data.data.tools);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch tools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handleEditTool = (tool: Tool) => {
    setSelectedTool(tool);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedTool(null);
  };

  const handleToolUpdated = (updatedTool: Tool) => {
    setTools(prevTools => 
      prevTools.map(tool => 
        tool._id === updatedTool._id ? updatedTool : tool
      )
    );
  };

  const handleDeleteTool = async (toolId: string, toolName: string) => {
    if (!confirm(`Are you sure you want to delete "${toolName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/tools', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: toolId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Remove the tool from the state
      setTools(prevTools => prevTools.filter(tool => tool._id !== toolId));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error deleting tool:', err);
    }
  };

  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Tools Directory - My Aggregator">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Tools Directory</h1>
              <p className="text-gray-600 mt-2">Manage your software tools directory.</p>
            </div>
            <Link 
              href="/dashboard/tools/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Tool
            </Link>
          </header>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading tools...</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8">
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">Error: {error}</p>
                <button
                  onClick={fetchTools}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && tools && tools.length === 0 && (
            <EmptyToolsState />
          )}

          {!loading && !error && tools && tools.length > 0 && (
            <ToolsGrid 
              tools={tools}
              onEditTool={handleEditTool}
              onDeleteTool={handleDeleteTool}
            />
          )}

          {/* Edit Tool Modal */}
          <EditToolModal
            isOpen={editModalOpen}
            onClose={handleCloseEditModal}
            tool={selectedTool}
            onToolUpdated={handleToolUpdated}
          />
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default ToolsIndexPage;