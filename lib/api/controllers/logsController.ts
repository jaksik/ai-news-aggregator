// File: lib/api/controllers/logsController.ts
// Purpose: Controller for fetch logs and analytics

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../db';
import FetchRunLog, { IFetchRunLog } from '../../../models/FetchRunLog';
import { ApiResponse } from '../types';

// Helper functions for response formatting
const createSuccessResponse = <T>(
  data: T,
  message: string,
  meta?: Record<string, unknown>
): ApiResponse<T> => ({
  success: true,
  data,
  message,
  ...meta
});

const createErrorResponse = <T = unknown>(message: string): ApiResponse<T> => ({
  success: false,
  message,
  error: message
});

export interface LogsListQuery {
  page?: string;
  limit?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  source?: string;
}

interface LogsListResponse {
  logs: IFetchRunLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    status?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
  };
}

/**
 * List fetch logs with filtering and pagination
 */
export const listLogs = async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<unknown>>
): Promise<void> => {
  await dbConnect();

  const {
    page = '1',
    limit = '10',
    status,
    startDate,
    endDate,
    source
  } = req.query as LogsListQuery;

  // Build filter query
  const filter: Record<string, unknown> = {};

  if (status && typeof status === 'string') {
    filter.status = status;
  }

  if (source && typeof source === 'string') {
    filter.sourceName = source;
  }

  // Date range filter
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate && typeof startDate === 'string') {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDateObj;
    }
    filter.startTime = dateFilter;
  }

  // Parse pagination
  const limitNum = Math.max(1, parseInt(limit as string) || 10);
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const [logs, total] = await Promise.all([
    FetchRunLog.find(filter)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    FetchRunLog.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  const responseData: LogsListResponse = {
    logs: logs as IFetchRunLog[],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    filters: {
      status,
      source,
      startDate,
      endDate
    }
  };

  const response = createSuccessResponse(
    responseData,
    'Logs retrieved successfully'
  );

  res.status(200).json(response);
};

/**
 * Get a specific fetch run log by ID
 */
export const getLog = async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<unknown>>
): Promise<void> => {
  await dbConnect();

  const { logId } = req.query;

  if (!logId || typeof logId !== 'string') {
    return res.status(400).json(
      createErrorResponse('Log ID is required')
    );
  }

  const log = await FetchRunLog.findById(logId).lean();

  if (!log) {
    return res.status(404).json(
      createErrorResponse('Log not found')
    );
  }

  res.status(200).json(
    createSuccessResponse(log as IFetchRunLog, 'Log retrieved successfully')
  );
};
