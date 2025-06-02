// File: pages/api/articles/sources.ts
// Purpose: API endpoint for getting unique source names from articles

import { NextApiRequest, NextApiResponse } from 'next';
import { getSourceNames } from '../../../lib/api/controllers/articlesController';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  return getSourceNames(req, res);
}
