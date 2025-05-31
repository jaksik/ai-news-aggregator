import React from 'react';

interface EmptyLogsStateProps {
  message?: string;
}

const EmptyLogsState: React.FC<EmptyLogsStateProps> = ({ 
  message = "No fetch logs found." 
}) => {
  return (
    <div className="text-center py-10">
      <div className="flex justify-center mb-4">
        <svg 
          className="h-16 w-16 text-gray-400" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
      </div>
      <p className="text-xl text-gray-500">{message}</p>
      <p className="text-sm text-gray-400 mt-2">
        Logs will appear here once you start fetching news articles.
      </p>
    </div>
  );
};

export default EmptyLogsState;
