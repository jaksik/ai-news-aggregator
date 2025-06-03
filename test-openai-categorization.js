require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const testCategorizationAPI = async () => {
  try {
    console.log('Testing OpenAI API...');
    
    // Simple test with one article
    const testArticles = [
      {
        id: "test123",
        title: "Google Launches New AI Assistant",
        meta_description: "Google has unveiled a new AI assistant that can help with daily tasks and productivity."
      }
    ];

    const fullPromptContent = `
SYSTEM: You are an expert AI News Curation Assistant. Your task is to categorize AI news articles.

For the article below, assign ONE "news" category and ONE "tech" category.

NEWS CATEGORIES: TOP_STORY_CANDIDATE, SECONDARY_STORY, INDUSTRY_UPDATE, LOW_PRIORITY, UNCLEAR_NEEDS_REVIEW
TECH CATEGORIES: Product, Research and Innovation, AI Agents, Startups and Funding, Macro Shifts, None

Return your response as a JSON array with this exact format:
[
  {
    "id": "EXACT_SAME_ID_AS_PROVIDED",
    "title": "The Article's title As Provided",
    "newsCategory": "ONE_OF_THE_NEWS_CATEGORIES_ABOVE",
    "techCategory": "ONE_OF_THE_TECH_CATEGORIES_ABOVE"
  }
]

ARTICLES TO CATEGORIZE:
${JSON.stringify(testArticles, null, 2)}`;

    console.log('Sending request to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using a more reliable model
      messages: [{ role: "user", content: fullPromptContent }],
      temperature: 0.2,
    });

    const response = completion.choices[0].message.content;
    console.log('OpenAI Response:');
    console.log(response);
    
    // Try to parse the response
    try {
      const parsed = JSON.parse(response);
      console.log('\nParsed successfully:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (parseError) {
      console.log('\nFailed to parse as JSON:', parseError.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
};

testCategorizationAPI();
