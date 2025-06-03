import OpenAI from 'openai';
import Article, { IArticle } from '../../models/Article';
import connectMongo from '../mongodb';

export class AICategorizationService {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  static async categorizePendingArticles(limit: number = 5): Promise<number> {
    // Ensure database connection
    await connectMongo();
    
    // Get pending articles
    const pendingArticles = await Article.find({ 
      categorizationStatus: 'pending' 
    })
    .sort({ fetchedAt: -1 })
    .limit(limit);

    if (pendingArticles.length === 0) {
      console.log('No pending articles to categorize');
      return 0;
    }

    // Mark as processing
    await Article.updateMany(
      { _id: { $in: pendingArticles.map(a => a._id) } },
      { categorizationStatus: 'processing' }
    );

    try {
      const categorizedCount = await this.sendToOpenAI(pendingArticles);
      return categorizedCount;
    } catch (error) {
      // Reset to pending on failure
      await Article.updateMany(
        { _id: { $in: pendingArticles.map(a => a._id) } },
        { categorizationStatus: 'pending' }
      );
      throw error;
    }
  }

  private static async sendToOpenAI(articles: IArticle[]): Promise<number> {
    // Prepare articles for OpenAI
    const articlesForAI = articles.map(article => ({
      id: article._id?.toString(),
      title: article.title,
      meta_description: article.descriptionSnippet
    }));

    // Use the existing prompt from prompt-test.js with modifications for ID handling
    const fullPromptContent = `
SYSTEM: You are an expert AI News Curation Assistant. Your primary function is to help curate AI news articles for a newsletter by categorizing them based *only* on their title and meta description. The newsletter aims to provide a general overview of important, factual AI news, filtering out opinion pieces, excessive speculation, or minor updates in favor of more impactful developments.

## YOUR TASK:

For each article I provide (consisting of an id, title and meta description), you will:

1. Analyze the title and meta description against the "Criteria for Categorization" below.

2. Assign ONE "news" category and ONE "tech" category to each article.

3. IMPORTANT: Return the EXACT same "id" field for each article that you received.

4. Format your entire output as a single JSON array, with each object in the array representing an article you've processed.

## CRITERIA FOR NEWS CATEGORIZATION:

1. **TOP_STORY_CANDIDATE:**
   * **Nature:** Major, impactful news. High signal, low noise.
   * **Keywords/Signals:** "New model released," "launches," "unveils," "breakthrough," "major partnership," "acquires," "significant funding ($50M+)," "new GPU/hardware," "foundational model," "open source."
   * **Sources (if discernible & major):** Google, OpenAI, Meta, Anthropic, NVIDIA, AWS, Apple, Microsoft, Hugging Face, leading research institutions (e.g., Stanford, MIT, DeepMind if presented as major).
   * **Content:** Announcements of new AI products, services, significant model versions, major research papers with clear breakthroughs, or high-impact business news (large funding, acquisitions by major players).

2. **SOLID_NEWS:**
   * **Nature:** Important and factual updates, but perhaps not groundbreaking enough for a top headline.
   * **Keywords/Signals:** "Updates," "enhances," "new feature," "integrates," "expands," "study shows," "report finds," "secures funding (under $50M)."
   * **Content:** Significant updates to existing AI tools/platforms, new noteworthy features, interesting case studies with concrete results, well-supported industry reports (not opinions), smaller funding rounds for interesting companies.

3. **INTERESTING_BUT_LOWER_PRIORITY:**
   * **Nature:** Potentially interesting but more niche or less broadly impactful.
   * **Keywords/Signals:** "Tips for," "explores," "discusses," "community project."
   * **Content:** Niche tool releases, specific tutorials (if they highlight a novel application), community news, smaller research findings, or thoughtful perspectives from credible but not top-tier news sources.

4. **LIKELY_NOISE_OR_OPINION:**
   * **Nature:** Content that is not direct news or is overly speculative/opinion-based.
   * **Keywords/Signals:** "Opinion:","Perspective:","How to survive," "The future of X is Y (speculative)", "Is AI X?", "Why I think Y," "AI doom/hype" (generic).
   * **Content:** Clearly labeled opinion pieces, guest posts expressing personal views, highly speculative articles without strong evidence, basic explainers of well-known concepts, marketing content with no new information, fear-mongering, or overly generic "AI trend" pieces.

5. **UNCLEAR_NEEDS_REVIEW:**
   * **Nature:** title and meta description are too vague or ambiguous to confidently categorize.
   * **Content:** Insufficient information in the provided text to determine relevance or importance.

## CRITERIA FOR TECH CATEGORIZATION:

1. **Product:**
   * **Focus:** Specific AI-powered tools, applications, platforms, or services that are available or being launched for users (enterprise or consumer). This includes new products, significant updates to existing products, or new features within a product.
   * **Keywords/Signals:** "Launches platform," "new tool," "software update," "app feature," "integrates with X," "service now available," "enterprise solution," "consumer app."

2. **Research and Innovation:**
   * **Focus:** Advances in AI methodology, new techniques, model architectures, algorithmic breakthroughs, and foundational research. This is about the science and engineering behind AI.
   * **Keywords/Signals:** "Breakthrough," "new model architecture," "algorithm," "study reveals," "research paper," "discovers," "improves accuracy," "novel technique," "proof-of-concept."

3. **AI Agents:**
   * **Focus:** AI systems designed to perform tasks autonomously or semi-autonomously on behalf of a user or another system. This includes discussions of agent capabilities, frameworks, or specific agentic applications.
   * **Keywords/Signals:** "AI agent," "autonomous system," "intelligent agent," "multi-agent system," "agent framework," "automates tasks," "goal-oriented AI."

4. **Startups and Funding:**
   * **Focus:** News related to new AI companies, investment rounds (seed, Series A, B, C, etc.), acquisitions of AI startups, and general venture capital activity in the AI space.
   * **Keywords/Signals:** "Raises $X million," "secures funding," "acquires startup," "new AI company," "venture capital," "investment," "merger," "IPO."

5. **Macro Shifts:**
   * **Focus:** Broader trends, market analyses, regulatory developments, ethical considerations, societal impact, and high-level industry changes related to AI. This is less about specific tech and more about the ecosystem.
   * **Keywords/Signals:** "Industry report," "market trends," "AI regulation," "government policy," "ethical AI," "societal impact," "AI adoption rates," "future of work," "AI skills gap."

6. **None:**
   * **Focus:** The article, despite being AI-related, does not fit clearly into any of the above tech-specific categories. This might be used for very general AI news, human interest stories peripherally involving AI, or if the tech aspect is too vague or secondary to another theme.

## OUTPUT FORMAT (Strict JSON Array):

You MUST provide your response as a single, valid JSON array. Each element in the array should be a JSON object structured as follows:

[
  {
    "id": "EXACT_SAME_ID_AS_PROVIDED",
    "title": "The Article's title As Provided",
    "newsCategory": "ONE_OF_THE_NEWS_CATEGORIES_ABOVE",
    "techCategory": "ONE_OF_THE_TECH_CATEGORIES_ABOVE"
  }
]

## ARTICLES TO CURATE NOW:
${JSON.stringify(articlesForAI, null, 2)}`;

    console.log('Sending request to OpenAI for', articles.length, 'articles');
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: fullPromptContent }],
      temperature: 0.2,
    });

    const response = completion.choices[0].message.content;
    if (!response) throw new Error('No response from OpenAI');

    console.log('Raw OpenAI Response (first 200 chars):');
    console.log(response.substring(0, 200));
    
    // Clean the response - remove markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    console.log('Cleaned response (first 200 chars):');
    console.log(cleanedResponse.substring(0, 200));
    
    let categorizedArticles;
    try {
      categorizedArticles = JSON.parse(cleanedResponse);
    } catch (error: any) {
      console.error('Failed to parse OpenAI response as JSON:', error);
      console.error('Response content (first 500 chars):', cleanedResponse.substring(0, 500));
      throw new Error(`Invalid JSON response from OpenAI: ${error.message}`);
    }
    
    if (!Array.isArray(categorizedArticles)) {
      console.error('OpenAI response is not an array:', categorizedArticles);
      throw new Error('OpenAI response must be an array');
    }
    
    // Update articles with categories
    let updatedCount = 0;
    console.log('Starting to update articles with categories...');
    console.log('Categorized articles from OpenAI:', categorizedArticles.length);
    
    for (const item of categorizedArticles) {
      console.log(`Processing item:`, { id: item.id, newsCategory: item.newsCategory, techCategory: item.techCategory });
      
      if (!item.id || !item.newsCategory || !item.techCategory) {
        console.warn('Skipping invalid item:', item);
        continue;
      }
      
      try {
        const article = await Article.findById(item.id);
        if (article) {
          console.log(`Found article: ${article.title}`);
          console.log(`Current status: ${article.categorizationStatus}`);
          
          article.newsCategory = item.newsCategory;
          article.techCategory = item.techCategory;
          article.categorizationStatus = 'completed';
          article.categorizedAt = new Date();
          
          const saved = await article.save();
          console.log(`Updated article: ${saved.title} - Status: ${saved.categorizationStatus}`);
          updatedCount++;
        } else {
          console.warn(`Article not found for ID: ${item.id}`);
        }
      } catch (error) {
        console.error(`Error updating article ${item.id}:`, error);
      }
    }
    
    console.log(`Successfully updated ${updatedCount} articles`);
    return updatedCount;
  }
}