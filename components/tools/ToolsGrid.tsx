// File: components/tools/ToolsGrid.tsx
import React from 'react';
import ToolCard from './ToolCard';

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

interface ToolsGridProps {
  tools: Tool[];
  onEditTool: (tool: Tool) => void;
  onDeleteTool: (toolId: string, toolName: string) => void;
}

const ToolsGrid: React.FC<ToolsGridProps> = ({ tools, onEditTool, onDeleteTool }) => {
  return (
    <div>
      <div className="mb-4 text-sm text-gray-600">
        Showing {tools.length} tool{tools.length !== 1 ? 's' : ''}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <ToolCard 
            key={tool._id} 
            tool={tool} 
            onEdit={onEditTool}
            onDelete={onDeleteTool}
          />
        ))}
      </div>
    </div>
  );
};

export default ToolsGrid;
