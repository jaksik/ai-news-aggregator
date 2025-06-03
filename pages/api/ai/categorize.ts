import { NextApiRequest, NextApiResponse } from 'next';
import { AICategorizationService } from '../../../lib/services/aiCategorization';
import connectMongo from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    
    await connectMongo();
    
    const categorizedCount = await AICategorizationService.categorizePendingArticles();
    
    res.json({ 
      success: true, 
      categorized: categorizedCount,
      message: `Categorized ${categorizedCount} articles`
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}