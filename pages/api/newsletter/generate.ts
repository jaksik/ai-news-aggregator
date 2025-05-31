import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Article, { IArticle } from '../../../models/Article';
import { INewsletter, INewsletterItem, NEWSLETTER_COLLECTION } from '../../../models/Newsletter';
import mongoose from 'mongoose';
import OpenAI from 'openai';

interface GenerateNewsletterRequest {
  daysBack?: number;
  forceRegenerate?: boolean;
}

interface GenerateNewsletterResponse {
  newsletter?: INewsletter;
  articlesProcessed?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateNewsletterResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { daysBack = 2, forceRegenerate = false }: GenerateNewsletterRequest = req.body;

    await dbConnect();

    // Calculate date range - get articles from last N days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Fetch recent articles that aren't hidden
    const articles = await Article.find({
      publishedDate: { $gte: cutoffDate },
      $or: [
        { isHidden: { $exists: false } },
        { isHidden: false }
      ]
    })
      .sort({ publishedDate: -1 })
      .limit(50) // Process max 50 articles
      .lean() as IArticle[];

    console.log(`Found ${articles.length} articles to process from last ${daysBack} days`);

    if (articles.length === 0) {
      return res.status(400).json({ error: 'No articles found in the specified date range' });
    }

    // Process articles with AI
    const newsletterItems = await processArticlesWithAI(articles);

    // Apply smart selection algorithms (Phase 3)
    const selectedItems = applySmartSelection(newsletterItems);

    // Create the newsletter object
    const newsletter: INewsletter = {
      date: new Date(),
      status: 'draft',
      title: `AI Newsletter - ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      intro: "Keeping you ahead of the curve in the rapidly evolving world of AI. Here's what mattered this week:",
      sections: {
        topHeadlines: selectedItems.filter(item => item.category === 'headline').slice(0, 3),
        productUpdates: selectedItems.filter(item => item.category === 'product').slice(0, 4),
        research: selectedItems.filter(item => item.category === 'research').slice(0, 3)
      },
      generatedAt: new Date(),
      lastModified: new Date(),
      articleIds: articles.map(a => a._id?.toString() || ''),
      aiPromptUsed: 'Phase 3: OpenAI GPT-4 + Smart Selection (Deduplication & Source Diversity)',
      articlesProcessed: articles.length
    };

    // Save to database - for Phase 1, we'll use a simple collection insert
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    const result = await db.collection(NEWSLETTER_COLLECTION).insertOne(newsletter);
    newsletter._id = result.insertedId;

    res.status(200).json({
      newsletter,
      articlesProcessed: articles.length
    });

  } catch (error) {
    console.error('Newsletter generation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate newsletter' 
    });
  }
}

async function processArticlesWithAI(articles: IArticle[]): Promise<INewsletterItem[]> {
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not found, falling back to basic processing');
    return processArticlesBasic(articles);
  }

  const newsletterItems: INewsletterItem[] = [];
  const batchSize = 5; // Process articles in batches to avoid rate limits

  console.log(`Processing ${articles.length} articles with OpenAI AI in batches of ${batchSize}`);

  // Process articles in batches
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)}`);

    try {
      const batchResults = await processArticleBatch(openai, batch);
      newsletterItems.push(...batchResults);
    } catch (error) {
      console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
      // Fall back to basic processing for this batch
      const fallbackResults = processArticlesBasic(batch);
      newsletterItems.push(...fallbackResults);
    }

    // Add delay between batches to respect rate limits
    if (i + batchSize < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  // Sort by AI score (highest first)
  return newsletterItems.sort((a, b) => b.aiScore - a.aiScore);
}

async function processArticleBatch(openai: OpenAI, articles: IArticle[]): Promise<INewsletterItem[]> {
  const articlesData = articles.map(article => ({
    id: article._id?.toString() || '',
    title: article.title,
    description: article.descriptionSnippet || '',
    source: article.sourceName || 'Unknown',
    link: article.link
  }));

  const prompt = `You are an AI newsletter curator specializing in artificial intelligence news. Analyze these articles and provide categorization, scoring, and summarization.

For each article, return JSON with:
- category: "headline" (major AI news/announcements), "product" (new AI tools/platforms/updates), or "research" (papers/studies/academic work)
- score: 1-10 rating based on impact, novelty, and relevance to AI newsletter audience
- generatedHeadline: Engaging, concise headline (max 100 chars) in newsletter style
- summary: 2-3 sentence summary highlighting key points and significance (max 200 chars)

Articles to analyze:
${articlesData.map((article, idx) => `
${idx + 1}. Title: "${article.title}"
   Source: ${article.source}
   Description: "${article.description}"
`).join('')}

Return a JSON array with objects for each article in the same order. Focus on:
- Headlines: Major industry impact, breaking news, significant announcements
- Products: New releases, major updates, platform launches
- Research: Academic papers, studies, breakthrough research
- Scoring: Consider recency, source credibility, potential impact, and audience relevance`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Using mini for faster and cheaper processing
    messages: [
      {
        role: "system", 
        content: "You are an expert AI newsletter curator. Return only valid JSON array, no other text."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3, // Lower temperature for more consistent categorization
    max_tokens: 2000
  });

  const aiResponse = completion.choices[0]?.message?.content;
  if (!aiResponse) {
    throw new Error('No response from OpenAI');
  }

  let aiResults;
  try {
    aiResults = JSON.parse(aiResponse);
  } catch (parseError) {
    console.error('Failed to parse AI response:', aiResponse);
    throw new Error('Invalid JSON response from AI');
  }

  // Convert AI results to newsletter items
  const newsletterItems: INewsletterItem[] = [];
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const aiResult = aiResults[i];

    if (!aiResult) {
      console.warn(`No AI result for article ${i}, using fallback`);
      continue;
    }

    const newsletterItem: INewsletterItem = {
      articleId: article._id?.toString() || '',
      originalTitle: article.title,
      generatedHeadline: aiResult.generatedHeadline || article.title,
      summary: aiResult.summary || article.descriptionSnippet?.substring(0, 200) + '...' || 'No summary available',
      source: article.sourceName || 'Unknown',
      category: aiResult.category || 'headline',
      aiScore: aiResult.score || 5,
      includeInNewsletter: true
    };

    newsletterItems.push(newsletterItem);
  }

  return newsletterItems;
}

// Fallback function for when OpenAI is not available
function processArticlesBasic(articles: IArticle[]): INewsletterItem[] {
  console.log('Using basic processing (no AI)');
  
  const newsletterItems: INewsletterItem[] = [];

  for (const article of articles) {
    // Basic categorization based on keywords in title/content
    let category: 'headline' | 'product' | 'research' = 'headline';
    
    const titleLower = article.title.toLowerCase();
    const contentLower = (article.descriptionSnippet || '').toLowerCase();
    
    // Simple keyword-based categorization
    if (titleLower.includes('research') || titleLower.includes('paper') || 
        titleLower.includes('study') || titleLower.includes('arxiv') ||
        contentLower.includes('research') || contentLower.includes('paper')) {
      category = 'research';
    } else if (titleLower.includes('launches') || titleLower.includes('releases') ||
               titleLower.includes('update') || titleLower.includes('announces') ||
               titleLower.includes('introduces') || titleLower.includes('unveils')) {
      category = 'product';
    }

    // Basic scoring (we'll make this smarter in later phases)
    const aiScore = Math.random() * 10; // Placeholder scoring

    // Create basic summary (first 200 chars for now)
    const summary = article.descriptionSnippet 
      ? article.descriptionSnippet.substring(0, 200) + '...'
      : `${article.title} - Summary to be generated with AI in Phase 2.`;

    const newsletterItem: INewsletterItem = {
      articleId: article._id?.toString() || '',
      originalTitle: article.title,
      generatedHeadline: article.title, // We'll improve this with AI later
      summary,
      source: article.sourceName || 'Unknown',
      category,
      aiScore,
      includeInNewsletter: true
    };

    newsletterItems.push(newsletterItem);
  }

  // Sort by score (highest first)
  return newsletterItems.sort((a, b) => b.aiScore - a.aiScore);
}

// Phase 3: Smart Selection Algorithms
function applySmartSelection(items: INewsletterItem[]): INewsletterItem[] {
  console.log('Applying Phase 3 smart selection algorithms...');
  
  // Step 1: Remove near-duplicates
  const deduplicatedItems = removeDuplicates(items);
  
  // Step 2: Ensure source diversity
  const diverseItems = ensureSourceDiversity(deduplicatedItems);
  
  // Step 3: Sort by AI score within categories
  return diverseItems.sort((a, b) => b.aiScore - a.aiScore);
}

function removeDuplicates(items: INewsletterItem[]): INewsletterItem[] {
  const uniqueItems: INewsletterItem[] = [];
  const seenTitles = new Set<string>();
  
  for (const item of items) {
    // Create a normalized title for comparison
    const normalizedTitle = item.originalTitle.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check for similar titles (simple approach - can be enhanced with more sophisticated similarity)
    let isDuplicate = false;
    for (const seenTitle of seenTitles) {
      if (calculateSimilarity(normalizedTitle, seenTitle) > 0.8) {
        isDuplicate = true;
        console.log(`Removing duplicate: "${item.originalTitle}" (similar to existing item)`);
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueItems.push(item);
      seenTitles.add(normalizedTitle);
    }
  }
  
  console.log(`Duplicate removal: ${items.length} → ${uniqueItems.length} items`);
  return uniqueItems;
}

function ensureSourceDiversity(items: INewsletterItem[]): INewsletterItem[] {
  const sourceCounts = new Map<string, number>();
  const diverseItems: INewsletterItem[] = [];
  const maxPerSource = 2; // Maximum articles per source per category
  
  // Group by category first
  const byCategory = {
    headline: items.filter(item => item.category === 'headline'),
    product: items.filter(item => item.category === 'product'),
    research: items.filter(item => item.category === 'research')
  };
  
  // Apply diversity within each category
  Object.entries(byCategory).forEach(([category, categoryItems]) => {
    const categorySourceCounts = new Map<string, number>();
    
    for (const item of categoryItems) {
      const sourceCount = categorySourceCounts.get(item.source) || 0;
      if (sourceCount < maxPerSource) {
        diverseItems.push(item);
        categorySourceCounts.set(item.source, sourceCount + 1);
      } else {
        console.log(`Source diversity: Skipping "${item.originalTitle}" (too many from ${item.source} in ${category})`);
      }
    }
  });
  
  console.log(`Source diversity: ${items.length} → ${diverseItems.length} items`);
  return diverseItems;
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple Jaccard similarity using word sets
  const words1 = new Set(str1.split(' '));
  const words2 = new Set(str2.split(' '));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}
