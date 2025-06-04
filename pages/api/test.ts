import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/db';
import Article from '../../models/Article';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Connect to MongoDB
        await dbConnect();

        // Find articles with newsCategory attribute (not null/undefined)
        const articles = await Article.find({
            newsCategory: { $exists: true, $nin: [null, ''] }
        })
            .limit(30)
            .sort({ categorizedAt: -1, createdAt: -1 })
            .select('title sourceName newsCategory techCategory descriptionSnippet')
            .lean();

        // Count by news category
        const newsCategoryCounts: Record<string, number> = {};
        articles.forEach(article => {
            if (article.newsCategory) {
                newsCategoryCounts[article.newsCategory] = (newsCategoryCounts[article.newsCategory] || 0) + 1;
            }
        });

        // Count by categorization status
        const statusCounts: Record<string, number> = {};
        articles.forEach(article => {
            if (article.categorizationStatus) {
                statusCounts[article.categorizationStatus] = (statusCounts[article.categorizationStatus] || 0) + 1;
            }
        });

        // Return structured response
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                totalFound: articles.length,
                query: 'Articles with newsCategory field populated',
                limit: 30
            },
            statistics: {
                newsCategoryCounts,
                statusCounts
            },
            articles: articles.map((article, index) => ({
                index: index + 1,
                title: article.title,
                description: article.descriptionSnippet || '',
                newsCategory: article.newsCategory,
                techCategory: article.techCategory || null,
            }))
        };

        res.status(200).json(response);

    } catch (error) {
        console.error('Test API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch articles',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
}