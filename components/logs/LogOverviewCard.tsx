import React from 'react';
import { IFetchRunLog } from '../../models/FetchRunLog';
import LogStatusBadge from './LogStatusBadge';
import { formatLogDate, calculateDuration } from './logUtils';

interface LogOverviewCardProps {
  log: IFetchRunLog;
}

const LogOverviewCard: React.FC<LogOverviewCardProps> = ({ log }) => {
  const duration = calculateDuration(log.startTime, log.endTime);

  return (
    <div className="bg-white shadow-xl rounded-lg p-6 mb-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
        Fetch Run Details
      </h1>
      <p className="text-xs text-gray-500 mb-4">ID: {log._id?.toString()}</p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
        <div>
          <strong className="text-gray-600 block">Status:</strong> 
          <LogStatusBadge status={log.status} size="md" />
        </div>
        <div>
          <strong className="text-gray-600 block">Start Time:</strong> 
          <span className="text-gray-800">{formatLogDate(log.startTime)}</span>
        </div>
        <div>
          <strong className="text-gray-600 block">End Time:</strong> 
          <span className="text-gray-800">
            {log.endTime ? formatLogDate(log.endTime) : 'In Progress'}
          </span>
        </div>
        <div>
          <strong className="text-gray-600 block">Duration:</strong> 
          <span className="text-gray-800">{duration}</span>
        </div>
        <div>
          <strong className="text-gray-600 block">Sources Attempted:</strong> 
          <span className="text-gray-800">{log.totalSourcesAttempted}</span>
        </div>
        <div>
          <strong className="text-gray-600 block">Sources Successful:</strong> 
          <span className="text-gray-800">{log.totalSourcesSuccessfullyProcessed}</span>
        </div>
        <div>
          <strong className="text-gray-600 block">Sources Failed (Fetch):</strong> 
          <span className="text-gray-800">{log.totalSourcesFailedWithError}</span>
        </div>
        <div>
          <strong className="text-gray-600 block">Total New Articles:</strong> 
          <span className="font-bold text-green-700">
            {log.totalNewArticlesAddedAcrossAllSources}
          </span>
        </div>
      </div>

      {log.orchestrationErrors && log.orchestrationErrors.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="font-semibold text-md text-red-700 mb-2">
            Orchestration Errors:
          </h3>
          <ul className="list-disc list-inside pl-5 text-sm text-red-600 space-y-1">
            {log.orchestrationErrors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LogOverviewCard;
