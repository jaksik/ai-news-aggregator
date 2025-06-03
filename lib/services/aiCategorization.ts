import OpenAI from 'openai';
import Article, { IArticle } from '../../models/Article';
import connectMongo from '../mongodb';
import { generateCategorizationPrompt, ArticleForAI } from '../prompts/categorization';

export class AICategorizationService {
    private static openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    static async categorizePendingArticles(limit: number = 5): Promise<number> {
        console.log(`\n=== AI CATEGORIZATION START (limit: ${limit}) ===`);

        // Ensure database connection
        try {
            await connectMongo();
            console.log('✓ Database connection successful');
        } catch (error) {
            console.error('✗ Database connection failed:', error);
            throw error;
        }

        // Get pending articles
        console.log('Searching for pending articles...');
        const pendingArticles = await Article.find({
            categorizationStatus: 'pending'
        })
            .sort({ fetchedAt: -1 })
            .limit(limit);

        console.log(`Found ${pendingArticles.length} pending articles`);
        if (pendingArticles.length > 0) {
            console.log('Article with pending status:', pendingArticles.slice(0, 5).map(a => a._id?.toString()));
        }

        if (pendingArticles.length === 0) {
            console.log('No pending articles to categorize');
            return 0;
        }

        // Mark as processing
        console.log('Marking articles as processing...');
        const updateResult = await Article.updateMany(
            { _id: { $in: pendingArticles.map(a => a._id) } },
            { categorizationStatus: 'processing' }
        );
        console.log(`Updated ${updateResult.modifiedCount} articles to processing status`);

        try {
            const categorizedCount = await this.sendToOpenAI(pendingArticles);
            console.log(`✓ Categorization completed: ${categorizedCount} articles processed`);
            return categorizedCount;
        } catch (error) {
            console.error('✗ Categorization failed, resetting articles to pending...');
            // Reset to pending on failure
            await Article.updateMany(
                { _id: { $in: pendingArticles.map(a => a._id) } },
                { categorizationStatus: 'pending' }
            );
            throw error;
        }
    }

    private static async sendToOpenAI(articles: IArticle[]): Promise<number> {
        console.log(`\n=== STARTING OPENAI CATEGORIZATION FOR ${articles.length} ARTICLES ===`);

        // Prepare articles for OpenAI
        const articlesForAI: ArticleForAI[] = articles.map(article => ({
            id: article._id?.toString() || '',
            title: article.title,
            meta_description: article.descriptionSnippet || ''
        }));

        console.log('Articles prepared for OpenAI:', articlesForAI.map(a => `${a.id}: ${a.title.substring(0, 50)}...`));

        const fullPromptContent = generateCategorizationPrompt(articlesForAI);

        console.log('Sending request to OpenAI for', articles.length, 'articles');

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: fullPromptContent }],
            temperature: 0.2,
        });


        const response = completion.choices[0].message.content;
        if (!response) throw new Error('No response from OpenAI');

        console.log('Raw OpenAI response:', response);

        // Clean response if it has markdown formatting
        let cleanResponse = response;
        if (response.includes('```json')) {
            cleanResponse = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        }

        console.log('Cleaned response:', cleanResponse);

        const categorizedArticles = JSON.parse(cleanResponse);
        console.log('Parsed categorized articles:', categorizedArticles.length);

        // Update articles with categories
        let updatedCount = 0;
        for (const item of categorizedArticles) {
            console.log(`\n--- Processing article ${item.id} ---`);
            console.log(`Looking for article with ID: ${item.id}`);

            const article = await Article.findById(item.id);
            if (article) {
                console.log(`Found article: ${article.title.substring(0, 50)}...`);
                console.log(`Setting newsCategory: ${item.newsCategory}`);
                console.log(`Setting techCategory: ${item.techCategory}`);

                article.newsCategory = item.newsCategory;
                article.techCategory = item.techCategory;
                article.categorizationStatus = 'completed';
                article.categorizedAt = new Date();

                console.log('About to save article...');
                const saveResult = await article.save();
                console.log('Save result:', saveResult ? 'SUCCESS' : 'FAILED');
                console.log('Article after save - Status:', saveResult.categorizationStatus);
                console.log('Article after save - News:', saveResult.newsCategory);
                console.log('Article after save - Tech:', saveResult.techCategory);

                updatedCount++;
            } else {
                console.log(`Article with ID ${item.id} NOT FOUND in database`);
            }
        }

        console.log(`\n=== CATEGORIZATION COMPLETE: Updated ${updatedCount} articles ===`);
        return updatedCount;
    }
}