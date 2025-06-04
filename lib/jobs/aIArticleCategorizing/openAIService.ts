// OpenAI service for article categorization
import OpenAI from 'openai';
import { buildCategorizationPrompt } from './corePrompt';
import type { 
  ArticleForCategorization, 
  CategorizedArticleResponse, 
  OpenAICategorizationResponse
} from './types';

export class OpenAICategorizationService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required for categorization service');
    }
    
    this.openai = new OpenAI({ 
      apiKey: apiKey 
    });
  }

  /**
   * Categorize articles using OpenAI with usage tracking
   */
  async categorizeArticles(articles: ArticleForCategorization[]): Promise<{
    categorizedArticles: CategorizedArticleResponse[];
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      modelUsed: string;
    };
  }> {
    if (!articles || articles.length === 0) {
      throw new Error('No articles provided for categorization');
    }

    try {
      console.log(`🤖 Starting OpenAI categorization for ${articles.length} articles...`);
      
      console.log('📝 Building categorization prompt...');
      const prompt = buildCategorizationPrompt(articles);
      console.log(`🔍 Prompt length: ${prompt.length} characters`);
      
      console.log('🚀 Sending request to OpenAI...');
      const model = "gpt-4o-mini";
      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 4000,
      });

      console.log('✅ Received response from OpenAI');
      console.log('📊 Usage:', completion.usage);

      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('Empty response from OpenAI API');
      }

      console.log('🔍 Parsing OpenAI response...');
      const categorizedArticles = this.parseOpenAIResponse(responseContent);
      
      console.log(`✅ Successfully categorized ${categorizedArticles.length} articles`);
      
      // Extract usage information
      const usage = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
        modelUsed: model
      };
      
      return {
        categorizedArticles,
        usage
      };

    } catch (error) {
      console.error('❌ OpenAI categorization failed:', error);
      
      if (error instanceof Error) {
        // Handle specific OpenAI errors
        if (error.message.includes('rate limit')) {
          throw new Error('OpenAI rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('quota')) {
          throw new Error('OpenAI quota exceeded. Please check your account.');
        }
        if (error.message.includes('API key')) {
          throw new Error('Invalid OpenAI API key configuration.');
        }
      }
      
      throw new Error(`Failed to categorize articles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse OpenAI response and extract categorized articles
   */
  private parseOpenAIResponse(responseContent: string): CategorizedArticleResponse[] {
    console.log('🔍 Raw OpenAI response:', responseContent);
    
    try {
      const parsedResponse: OpenAICategorizationResponse = JSON.parse(responseContent);
      
      console.log('✅ Successfully parsed JSON response');
      console.log('📊 Response analysis:', {
        type: typeof parsedResponse,
        isArray: Array.isArray(parsedResponse),
        keys: typeof parsedResponse === 'object' && !Array.isArray(parsedResponse) ? Object.keys(parsedResponse) : 'N/A'
      });
      
      let articlesArray: CategorizedArticleResponse[] | null = null;
      
      // Check if it's a direct array (unlikely with json_object format)
      if (Array.isArray(parsedResponse)) {
        console.log('📋 Found direct array response');
        articlesArray = parsedResponse;
      } else if (typeof parsedResponse === 'object' && parsedResponse !== null) {
        // Look for common array keys
        const possibleKeys = ['articles', 'categorized_articles', 'data', 'results'];
        
        console.log('🔍 Searching for articles array in response object...');
        for (const key of possibleKeys) {
          if (Array.isArray(parsedResponse[key])) {
            articlesArray = parsedResponse[key];
            console.log(`📋 Found articles array under key: ${key}`);
            break;
          }
        }
        
        // If no standard key found, look for any array in the object
        if (!articlesArray) {
          console.log('🔍 No standard key found, searching all object properties...');
          for (const [key, value] of Object.entries(parsedResponse)) {
            if (Array.isArray(value)) {
              console.log(`📋 Found articles array under key: ${key}`);
              articlesArray = value;
              break;
            }
          }
        }
      }
      
      if (!articlesArray) {
        console.error('❌ No articles array found in OpenAI response');
        console.error('🔍 Full response structure:', parsedResponse);
        throw new Error('No articles array found in OpenAI response');
      }
      
      console.log(`🔍 Found articles array with ${articlesArray.length} items`);
      
      // Validate each article in the response
      console.log('✅ Validating article structure...');
      const validatedArticles = articlesArray.map((article, index) => {
        if (!article.objectId || !article.original_title || !article.newsCategory || !article.techCategory) {
          console.warn(`⚠️ Article at index ${index} missing required fields:`, article);
          throw new Error(`Invalid article structure at index ${index}: missing required fields (objectId, original_title, newsCategory, techCategory)`);
        }
        
        // Validate news category
        const validNewsCategories = [
          'Top Story Candidate',
          'Solid News', 
          'Interesting but Lower Priority',
          'Likely Noise or Opinion'
        ];
        
        if (!validNewsCategories.includes(article.newsCategory)) {
          console.warn(`⚠️ Invalid news category "${article.newsCategory}" for article:`, article.original_title);
          // Default to a valid category
          article.newsCategory = 'Likely Noise or Opinion';
        }
        
        // Validate tech category
        const validTechCategories = [
          'Products and Updates',
          'Developer Tools',
          'Research and Innovation',
          'Industry Trends',
          'Startups and Funding',
          'Not Relevant'
        ];
        
        if (!validTechCategories.includes(article.techCategory)) {
          console.warn(`⚠️ Invalid tech category "${article.techCategory}" for article:`, article.original_title);
          // Default to a valid category
          article.techCategory = 'Not Relevant';
        }
        
        return article as CategorizedArticleResponse;
      });
      
      console.log(`✅ Successfully validated ${validatedArticles.length} articles`);
      return validatedArticles;
      
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError);
      console.error('🔍 Raw response content:', responseContent);
      throw new Error(`Failed to parse OpenAI response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
    }
  }
}
