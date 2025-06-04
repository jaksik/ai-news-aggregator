// Test script that mimics the actual AI categorizer functionality
const OpenAI = require('openai');
require('dotenv').config();

// Core system prompt (from actual implementation)
const SYSTEM_PROMPT = `SYSTEM: You are an expert AI News Curation Assistant. Your primary function is to help curate AI news articles for a newsletter by categorizing them based *only* on their provided title and meta description. The newsletter aims to provide a general overview of important, factual AI news, filtering out opinion pieces, excessive speculation, or minor updates in favor of more impactful developments.

## YOUR TASK:

For each article I provide (consisting of a title and meta description), you will:

1. Analyze the title and meta description against the "Criteria for Categorization" below.

2. Assign ONE category to the article.

3. Provide a brief (1-2 sentence) rationale for your categorization, referencing specific keywords or phrases from the title/meta if they strongly influenced your decision.

4. Format your entire output as a single JSON array, with each object in the array representing an article you've processed.

## CRITERIA FOR CATEGORIZATION:

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

   * **Nature:** Title and meta description are too vague or ambiguous to confidently categorize.

   * **Content:** Insufficient information in the provided text to determine relevance or importance.

## OUTPUT FORMAT (Strict JSON Array):

You MUST provide your response as a single, valid JSON array. Each element in the array should be a JSON object structured as follows:

\`\`\`json
[
  {
    "objectId": "The article's MongoDB ObjectId as provided",
    "original_title": "The Article's Title As Provided",
    "assigned_category": "ONE_OF_THE_CATEGORIES_ABOVE",
    "brief_rationale": "Your 1-2 sentence justification for the category."
  }
]
\`\`\``;

// Example articles for testing (mimicking real data structure)
const testArticles = [
  {
    "objectId": "test123",
    "title": "OpenAI Releases GPT-5 with Unprecedented Capabilities",
    "meta_description": "OpenAI today announced GPT-5, featuring significant improvements in reasoning and multimodal understanding that could revolutionize how we interact with AI systems."
  },
  {
    "objectId": "test456", 
    "title": "My Opinion: Why AI Will Change Everything",
    "meta_description": "In this opinion piece, the author discusses their personal views on artificial intelligence and its future impact on society, economy, and human relationships."
  },
  {
    "objectId": "test789",
    "title": "NVIDIA Unveils Next-Gen H200 GPU for AI Training",
    "meta_description": "NVIDIA has announced its latest H200 GPU designed specifically for large-scale AI model training, promising 2x performance improvements over previous generation."
  }
];

// Build the complete prompt (mimicking buildCategorizationPrompt function)
function buildTestPrompt(articles) {
  const articlesJson = JSON.stringify(articles, null, 2);
  
  return `${SYSTEM_PROMPT}

## ARTICLES TO CURATE NOW:

${articlesJson}`;
}

// Parse OpenAI response (mimicking the actual parseOpenAIResponse function)
function parseOpenAIResponse(responseContent) {
  console.log('🔍 Raw OpenAI response:', responseContent);
  
  try {
    const parsedResponse = JSON.parse(responseContent);
    
    let articlesArray = null;
    
    // Check if it's a direct array
    if (Array.isArray(parsedResponse)) {
      console.log('📋 Found direct array response');
      articlesArray = parsedResponse;
    } else if (typeof parsedResponse === 'object' && parsedResponse !== null) {
      // Look for common array keys
      const possibleKeys = ['articles', 'categorized_articles', 'data', 'results'];
      
      for (const key of possibleKeys) {
        if (Array.isArray(parsedResponse[key])) {
          articlesArray = parsedResponse[key];
          console.log(`📋 Found articles array under key: ${key}`);
          break;
        }
      }
      
      // If no standard key found, look for any array in the object
      if (!articlesArray) {
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
      console.error('🔍 Response structure analysis:', {
        type: typeof parsedResponse,
        keys: typeof parsedResponse === 'object' ? Object.keys(parsedResponse) : 'N/A',
        isArray: Array.isArray(parsedResponse),
        fullResponse: parsedResponse
      });
      throw new Error('No articles array found in OpenAI response');
    }
    
    // Validate each article in the response
    const validCategories = [
      'TOP_STORY_CANDIDATE',
      'SOLID_NEWS', 
      'INTERESTING_BUT_LOWER_PRIORITY',
      'LIKELY_NOISE_OR_OPINION',
      'UNCLEAR_NEEDS_REVIEW'
    ];
    
    const validatedArticles = articlesArray.map((article, index) => {
      if (!article.objectId || !article.original_title || !article.assigned_category) {
        console.warn(`⚠️ Article at index ${index} missing required fields:`, article);
        throw new Error(`Invalid article structure at index ${index}: missing required fields`);
      }
      
      // Validate category type
      if (!validCategories.includes(article.assigned_category)) {
        console.warn(`⚠️ Invalid category "${article.assigned_category}" for article:`, article.original_title);
        // Default to UNCLEAR_NEEDS_REVIEW for invalid categories
        article.assigned_category = 'UNCLEAR_NEEDS_REVIEW';
      }
      
      return article;
    });
    
    console.log(`✅ Successfully parsed ${validatedArticles.length} articles`);
    return validatedArticles;
    
  } catch (parseError) {
    console.error('❌ Failed to parse OpenAI response:', parseError);
    console.error('🔍 Raw response content:', responseContent);
    throw new Error(`Failed to parse OpenAI response: ${parseError.message || 'Unknown parsing error'}`);
  }
}

// Mimic the actual categorizeArticles function
async function categorizeArticlesWithOpenAI(articles) {
  console.log(`🤖 Starting OpenAI categorization for ${articles.length} articles...`);
  
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build the prompt
    const prompt = buildTestPrompt(articles);
    console.log('📝 Built categorization prompt');
    console.log('🔍 Prompt length:', prompt.length, 'characters');

    // Call OpenAI API (mimicking exact settings from actual service)
    console.log('🚀 Sending request to OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    console.log('✅ Received response from OpenAI');
    console.log('📊 Usage:', response.usage);

    // Extract content
    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the response
    const categorizedArticles = parseOpenAIResponse(responseContent);
    
    console.log('🎯 Categorization Results:');
    categorizedArticles.forEach((article, index) => {
      console.log(`${index + 1}. "${article.original_title}"`);
      console.log(`   Category: ${article.assigned_category}`);
      console.log(`   Rationale: ${article.brief_rationale}`);
      console.log('');
    });

    return categorizedArticles;

  } catch (error) {
    console.error('❌ OpenAI categorization failed:', error);
    throw error;
  }
}

// Main test function
async function runTest() {
  console.log('🧪 Starting OpenAI categorization test...');
  console.log('='.repeat(60));

  try {
    // Test the categorization
    const results = await categorizeArticlesWithOpenAI(testArticles);
    
    console.log('='.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log(`📊 Processed ${results.length} articles`);
    
    // Summary
    const categoryCounts = {};
    results.forEach(article => {
      categoryCounts[article.assigned_category] = (categoryCounts[article.assigned_category] || 0) + 1;
    });
    
    console.log('\n📈 Category Distribution:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} articles`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check environment and run test
console.log('🔍 Checking environment variables...');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Found' : 'Not found');

if (!process.env.OPENAI_API_KEY) {
  console.log('❌ OPENAI_API_KEY not found in environment variables');
  console.log('Please add your OpenAI API key to the .env file:');
  console.log('OPENAI_API_KEY=your_api_key_here');
  process.exit(1);
}

// Run the test
runTest();