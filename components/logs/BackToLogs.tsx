import React from 'react';
import Link from 'next/link';

interface BackToLogsProps {
  className?: string;
}

const BackToLogs: React.FC<BackToLogsProps> = ({ className = "mb-6" }) => {
  return (
    <div className={className}>
      <Link href="/dashboard/articles/fetcher-logs" legacyBehavior>
        <a className="inline-flex items-center text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-1" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
          Back to All Logs
        </a>
      </Link>
    </div>
  );
};

export default BackToLogs;
