// File: lib/api/controllers/operationsController.ts
// Purpose: Controllers for batch operations on sources

import dbConnect from '../../mongodb';
import Source from '../../../models/Source';
import { createSuccessResponse, createErrorResponse } from '../utils';
import { RequestHandler } from '../types';

/**
 * Batch operations on sources (enable/disable multiple sources)
 */
export const batchOperations: RequestHandler<{ success: boolean; updated: number }> = async (req, res) => {
  await dbConnect();

  const { operation, sourceIds } = req.body;

  if (!operation || !sourceIds || !Array.isArray(sourceIds)) {
    return res.status(400).json(
      createErrorResponse('operation and sourceIds array are required')
    );
  }

  if (sourceIds.length === 0) {
    return res.status(400).json(
      createErrorResponse('sourceIds array cannot be empty')
    );
  }

  try {
    let updateQuery: Record<string, unknown> = {};

    switch (operation) {
      case 'enable':
        updateQuery = { isEnabled: true, updatedAt: new Date() };
        break;
      case 'disable':
        updateQuery = { isEnabled: false, updatedAt: new Date() };
        break;
      default:
        return res.status(400).json(
          createErrorResponse('Invalid operation. Supported operations: enable, disable')
        );
    }

    const result = await Source.updateMany(
      { _id: { $in: sourceIds } },
      updateQuery
    );

    res.status(200).json(
      createSuccessResponse(
        { success: true, updated: result.modifiedCount },
        `Batch ${operation} operation completed`
      )
    );

  } catch (error) {
    console.error('Error in batch operation:', error);
    throw error;
  }
};
