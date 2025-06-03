import { NextApiRequest, NextApiResponse } from 'next';
import { AICategorizationService } from '../../../lib/services/aiCategorization';
import connectMongo from '../../../lib/mongodb';
import Article from '../../../models/Article';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== AI Categorization API Called ===');
    
    await connectMongo();
    console.log('Database connected successfully');
    
    // Test finding pending articles
    const testPending = await Article.find({ categorizationStatus: 'pending' }).limit(2);
    console.log('Found pending articles for test:', testPending.length);
    
    if (testPending.length > 0) {
      console.log('Sample pending article:', {
        id: testPending[0]._id,
        title: testPending[0].title,
        status: testPending[0].categorizationStatus
      });
    }
    
    const categorizedCount = await AICategorizationService.categorizePendingArticles();
    
    // Test finding completed articles after categorization
    const testCompleted = await Article.find({ categorizationStatus: 'completed' }).limit(2);
    console.log('Found completed articles after categorization:', testCompleted.length);
    
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