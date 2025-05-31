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
    return (
        <div className="group relative bg-white rounded-xl border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-gray-300/60 transition-all duration-300 overflow-hidden">
            {/* Header Section */}
            <div className="p-6 pb-4">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-200/50">
                            <Image
                                src={tool.logoUrl}
                                alt={`${tool.name} logo`}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iOCIgZmlsbD0iI0Y5RkFGQiIvPgo8cGF0aCBkPSJNMjggMzdDMzIuNDE4MyAzNyAzNiAzMy40MTgzIDM2IDI5QzM2IDI0LjU4MTcgMzIuNDE4MyAyMSAyOCAyMUMyMy41ODE3IDIxIDIwIDI0LjU4MTcgMjAgMjlDMjAgMzMuNDE4MyAyMy41ODE3IDM3IDI4IDM3WiIgZmlsbD0iI0Q1RDlEZCIvPgo8L3N2Zz4K';
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                            {tool.name}
                        </h3>
                        <div className="inline-flex items-center px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200/50">
                            {tool.category}
                        </div>
                    </div>
                </div>
            </div>

            {/* Description Section */}
            <div className="px-6 pb-6">
                <p className="text-gray-600 text-base leading-relaxed line-clamp-3">
                    {tool.description}
                </p>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                <div className="flex items-center gap-1">
                    <a
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200 border border-transparent hover:border-blue-200"
                        title="Visit Tool"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                    <button
                        onClick={() => onEdit(tool)}
                        className="inline-flex items-center justify-center w-9 h-9 text-green-500 hover:text-green-700 hover:bg-white rounded-lg transition-colors duration-200 border border-transparent hover:border-gray-200"
                        title="Edit Tool"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDelete(tool._id, tool.name)}
                        className="inline-flex items-center justify-center w-9 h-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 border border-transparent hover:border-red-200"
                        title="Delete Tool"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ToolCard;
