// API endpoint for categorization analytics and stats
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/db';
import CategorizationRunLog from '../../../models/CategorizationRunLog';
import { createMethodHandler } from '../../../lib/api/routeHandlerFactory';

async function getCategorizationStats(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { 
    timeframe = '7d' // 7d, 30d, 90d, all
  } = req.query;

  try {
    // Calculate date range
    let startDate: Date | undefined;
    if (timeframe !== 'all') {
      const days = parseInt(timeframe.toString().replace('d', ''));
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    const dateFilter = startDate ? { startTime: { $gte: startDate } } : {};

    // Get overview stats
    const [
      totalRuns,
      successfulRuns,
      totalArticlesProcessed,
      totalCost,
      recentRuns,
      categoryTrends
    ] = await Promise.all([
      CategorizationRunLog.countDocuments(dateFilter),
      CategorizationRunLog.countDocuments({ 
        ...dateFilter, 
        status: { $in: ['completed', 'completed_with_errors'] } 
      }),
      CategorizationRunLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: '$totalArticlesSuccessful' } } }
      ]),
      CategorizationRunLog.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: '$openaiUsage.estimatedCostUSD' } } }
      ]),
      CategorizationRunLog.find(dateFilter)
        .sort({ startTime: -1 })
        .limit(5)
        .select('_id startTime status totalArticlesSuccessful totalArticlesFailed processingTimeMs')
        .lean(),
      CategorizationRunLog.aggregate([
        { $match: { ...dateFilter, status: { $in: ['completed', 'completed_with_errors'] } } },
        { $group: {
          _id: null,
          avgNewsTopStory: { $avg: '$newsCategoryDistribution.Top Story Candidate' },
          avgNewsSolid: { $avg: '$newsCategoryDistribution.Solid News' },
          avgNewsLower: { $avg: '$newsCategoryDistribution.Interesting but Lower Priority' },
          avgNewsNoise: { $avg: '$newsCategoryDistribution.Likely Noise or Opinion' },
          avgTechProducts: { $avg: '$techCategoryDistribution.Products and Updates' },
          avgTechDevTools: { $avg: '$techCategoryDistribution.Developer Tools' },
          avgTechResearch: { $avg: '$techCategoryDistribution.Research and Innovation' },
          avgTechTrends: { $avg: '$techCategoryDistribution.Industry Trends' },
          avgTechStartups: { $avg: '$techCategoryDistribution.Startups and Funding' },
          avgTechNotRelevant: { $avg: '$techCategoryDistribution.Not Relevant' }
        }}
      ])
    ]);

    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
    const articlesProcessed = totalArticlesProcessed[0]?.total || 0;
    const estimatedCost = totalCost[0]?.total || 0;
    const avgCategoryDistribution = categoryTrends[0] || null;

    // Calculate daily trends for the chart
    const dailyTrends = await CategorizationRunLog.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$startTime' },
            month: { $month: '$startTime' },
            day: { $dayOfMonth: '$startTime' }
          },
          runsCount: { $sum: 1 },
          articlesProcessed: { $sum: '$totalArticlesSuccessful' },
          successfulRuns: {
            $sum: {
              $cond: [
                { $in: ['$status', ['completed', 'completed_with_errors']] },
                1,
                0
              ]
            }
          },
          totalCost: { $sum: '$openaiUsage.estimatedCostUSD' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalRuns,
          successRate: Math.round(successRate * 100) / 100,
          articlesProcessed,
          estimatedCost: Math.round(estimatedCost * 10000) / 10000
        },
        recentRuns,
        dailyTrends,
        categoryDistribution: avgCategoryDistribution
      }
    });
  } catch (error) {
    console.error('Failed to fetch categorization stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categorization stats'
    });
  }
}

export default createMethodHandler({
  GET: getCategorizationStats
});
