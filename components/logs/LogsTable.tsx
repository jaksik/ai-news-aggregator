import React from 'react';
import Link from 'next/link';
import { IFetchRunLog } from '../../models/FetchRunLog';
import LogStatusBadge from './LogStatusBadge';
import { formatLogDate, calculateDuration } from './logUtils';

interface LogsTableProps {
  logs: IFetchRunLog[];
}

const LogsTable: React.FC<LogsTableProps> = ({ logs }) => {
  return (
    <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
      <table className="min-w-full leading-normal">
        <thead>
          <tr className="bg-gray-200 text-left text-gray-600 uppercase text-sm tracking-wider">
            <th className="px-5 py-3 border-b-2 border-gray-300">Start Time</th>
            <th className="px-5 py-3 border-b-2 border-gray-300">Duration</th>
            <th className="px-5 py-3 border-b-2 border-gray-300">Status</th>
            <th className="px-5 py-3 border-b-2 border-gray-300 text-center">Sources</th>
            <th className="px-5 py-3 border-b-2 border-gray-300 text-center">New Articles</th>
            <th className="px-5 py-3 border-b-2 border-gray-300">Errors</th>
            <th className="px-5 py-3 border-b-2 border-gray-300">Details</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {logs.map((log) => {
            const duration = calculateDuration(log.startTime, log.endTime);
            return (
              <tr 
                key={log._id?.toString()} 
                className="border-b border-gray-200 hover:bg-gray-100 transition-colors duration-150"
              >
                <td className="px-5 py-4 text-sm whitespace-nowrap">
                  {formatLogDate(log.startTime)}
                </td>
                <td className="px-5 py-4 text-sm whitespace-nowrap">
                  {duration}
                </td>
                <td className="px-5 py-4 text-sm">
                  <LogStatusBadge status={log.status} />
                </td>
                <td className="px-5 py-4 text-sm text-center">
                  {log.totalSourcesAttempted}
                </td>
                <td className="px-5 py-4 text-sm text-center">
                  {log.totalNewArticlesAddedAcrossAllSources}
                </td>
                <td className="px-5 py-4 text-sm">
                  {log.orchestrationErrors && log.orchestrationErrors.length > 0 
                    ? log.orchestrationErrors.join('; ') 
                    : (log.totalSourcesFailedWithError > 0 
                        ? `${log.totalSourcesFailedWithError} source(s) had fetch errors` 
                        : 'None'
                      )
                  }
                </td>
                <td className="px-5 py-4 text-sm">
                  <Link href={`/dashboard/logs/${log._id?.toString()}`} legacyBehavior>
                    <a className="text-indigo-600 hover:text-indigo-800 hover:underline">
                      View Details
                    </a>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LogsTable;
