// File: components/tools/ToolCard.tsx
import React from 'react';
import Image from 'next/image';

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

interface ToolCardProps {
  tool: Tool;
  onEdit: (tool: Tool) => void;
  onDelete: (toolId: string, toolName: string) => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onEdit, onDelete }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <Image
            src={tool.logoUrl}
            alt={`${tool.name} logo`}
            width={48}
            height={48}
            className="w-12 h-12 rounded-lg object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI0Y5RkFGQiIvPgo8cGF0aCBkPSJNMjQgMzJDMjguNDE4MyAzMiAzMiAyOC40MTgzIDMyIDI0QzMyIDE5LjU4MTcgMjguNDE4MyAxNiAyNCAxNkMxOS41ODE3IDE2IDE2IDE5LjU4MTcgMTYgMjRDMTYgMjguNDE4MyAxOS41ODE3IDMyIDI0IDMyWiIgZmlsbD0iI0Q1RDlEZCIvPgo8L3N2Zz4K';
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {tool.name}
          </h3>
          <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
              {tool.category}
            </span>
            <span className="text-gray-400">•</span>
            <span>{tool.subcategory}</span>
          </div>
        </div>
      </div>
      
      <p className="mt-4 text-sm text-gray-600 line-clamp-3">
        {tool.description}
      </p>
      
      <div className="mt-4 flex items-center justify-between">
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Visit Tool
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(tool)}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => onDelete(tool._id, tool.name)}
            className="inline-flex items-center text-sm text-red-600 hover:text-red-800 font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Added {formatDate(tool.createdAt)}
      </div>
    </div>
  );
};

export default ToolCard;
