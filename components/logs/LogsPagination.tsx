import React from 'react';

interface LogsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalLogs: number;
  limitPerPage: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

const LogsPagination: React.FC<LogsPaginationProps> = ({
  currentPage,
  totalPages,
  totalLogs,
  limitPerPage,
  loading,
  onPageChange
}) => {
  if (totalLogs === 0 || totalPages <= 1) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const startRecord = ((currentPage - 1) * limitPerPage) + 1;
  const endRecord = Math.min(currentPage * limitPerPage, totalLogs);

  return (
    <div className="py-5 flex flex-col xs:flex-row items-center xs:justify-between">
      <div className="text-xs xs:text-sm text-gray-600">
        Showing {startRecord} to {endRecord} of {totalLogs} Logs
      </div>
      <div className="inline-flex mt-2 xs:mt-0">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1 || loading}
          className="text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-l disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || loading}
          className="text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-r disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default LogsPagination;
