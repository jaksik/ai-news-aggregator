import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/db';
import Article from '../../models/Article';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Connect to MongoDB
        await dbConnect();

        // Find articles that don't have newsCategory or techCategory
        const articles = await Article.find({
            $and: [
                {
                    $or: [
                        { newsCategory: { $exists: false } },
                        { newsCategory: null },
                        { newsCategory: '' }
                    ]
                },
                {
                    $or: [
                        { techCategory: { $exists: false } },
                        { techCategory: null },
                        { techCategory: '' }
                    ]
                }
            ]
        })
            .limit(20)
            .sort({ createdAt: -1 })
            .select('_id title descriptionSnippet')
            .lean();

        // Return structured response
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                totalFound: articles.length,
                query: 'Articles without newsCategory or techCategory',
                limit: 20
            },
            articles: articles.map((article, index) => ({
                index: index + 1,
                objectId: article._id.toString(),
                title: article.title,
                description: (article.descriptionSnippet || 'No description available').substring(0, 358),
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