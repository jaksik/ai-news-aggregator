const mongoose = require('mongoose');
require('dotenv').config();

// Import the Article model
const Article = require('./models/Article').default;
const connectMongo = require('./lib/mongodb').default;

async function testPendingArticles() {
  console.log('\n=== TESTING PENDING ARTICLES QUERY ===');
  console.log('Starting test at:', new Date().toISOString());
  
  try {
    // Step 1: Connect to database
    console.log('\n--- Step 1: Database Connection ---');
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
    
    await connectMongo();
    console.log('✅ Successfully connected to MongoDB');
    console.log('Connection state:', mongoose.connection.readyState); // 1 = connected
    console.log('Database name:', mongoose.connection.name);
    
    // Step 2: Query for pending articles
    console.log('\n--- Step 2: Querying Pending Articles ---');
    console.log('Searching for articles with categorizationStatus: "pending"...');
    console.log('Limit: 20 articles');
    console.log('Sort order: Most recent first (by fetchedAt)');
    
    const startTime = Date.now();
    
    const pendingArticles = await Article.find({ 
      categorizationStatus: 'pending' 
    })
    .sort({ fetchedAt: -1 }) // Most recent first
    .limit(20)
    .lean(); // Use lean() for better performance when we don't need full mongoose documents
    
    const queryTime = Date.now() - startTime;
    console.log(`Query completed in ${queryTime}ms`);
    
    // Step 3: Analyze results
    console.log('\n--- Step 3: Results Analysis ---');
    console.log(`Total pending articles found: ${pendingArticles.length}`);
    
    if (pendingArticles.length === 0) {
      console.log('❌ No pending articles found in the database');
      
      // Let's check if there are any articles at all
      console.log('\n--- Additional Check: Total Articles ---');
      const totalArticles = await Article.countDocuments({});
      console.log(`Total articles in database: ${totalArticles}`);
      
      if (totalArticles > 0) {
        // Check distribution of categorization statuses
        const statusDistribution = await Article.aggregate([
          {
            $group: {
              _id: '$categorizationStatus',
              count: { $sum: 1 }
            }
          }
        ]);
        console.log('Categorization status distribution:', statusDistribution);
      }
    } else {
      console.log('✅ Found pending articles!');
      
      // Step 4: Display article details
      console.log('\n--- Step 4: Article Details ---');
      
      pendingArticles.forEach((article, index) => {
        console.log(`\n📰 Article ${index + 1}:`);
        console.log(`  ID: ${article._id}`);
        console.log(`  Title: ${article.title}`);
        console.log(`  Source: ${article.sourceName}`);
        console.log(`  Published Date: ${article.publishedDate || 'Not available'}`);
        console.log(`  Categorization Status: ${article.categorizationStatus}`);
        console.log(`  News Category: ${article.newsCategory || 'Not set'}`);
        console.log(`  Tech Category: ${article.techCategory || 'Not set'}`);
      });
      
      // Step 5: Summary statistics
      console.log('\n--- Step 5: Summary Statistics ---');
      const sources = [...new Set(pendingArticles.map(article => article.sourceName))];
      console.log(`Unique sources represented: ${sources.length}`);
      console.log(`Sources: ${sources.join(', ')}`);
      
      const oldestFetch = new Date(Math.min(...pendingArticles.map(a => new Date(a.fetchedAt).getTime())));
      const newestFetch = new Date(Math.max(...pendingArticles.map(a => new Date(a.fetchedAt).getTime())));
      console.log(`Date range (fetchedAt): ${oldestFetch.toISOString()} to ${newestFetch.toISOString()}`);
      
      const articlesWithDescription = pendingArticles.filter(a => a.descriptionSnippet && a.descriptionSnippet.trim().length > 0);
      console.log(`Articles with descriptions: ${articlesWithDescription.length}/${pendingArticles.length}`);
      
      const articlesWithPublishedDate = pendingArticles.filter(a => a.publishedDate);
      console.log(`Articles with published dates: ${articlesWithPublishedDate.length}/${pendingArticles.length}`);
    }
    
    // Step 6: Additional database info
    console.log('\n--- Step 6: Database Statistics ---');
    const totalCount = await Article.countDocuments({});
    const pendingCount = await Article.countDocuments({ categorizationStatus: 'pending' });
    const processingCount = await Article.countDocuments({ categorizationStatus: 'processing' });
    const completedCount = await Article.countDocuments({ categorizationStatus: 'completed' });
    const failedCount = await Article.countDocuments({ categorizationStatus: 'failed' });
    
    console.log(`📊 Database Overview:`);
    console.log(`  Total articles: ${totalCount}`);
    console.log(`  Pending: ${pendingCount}`);
    console.log(`  Processing: ${processingCount}`);
    console.log(`  Completed: ${completedCount}`);
    console.log(`  Failed: ${failedCount}`);
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('\n❌ ERROR OCCURRED:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Step 7: Cleanup
    console.log('\n--- Step 7: Cleanup ---');
    console.log('Closing database connection...');
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    console.log('Test completed at:', new Date().toISOString());
  }
}

// Run the test
console.log('🚀 Starting pending articles test...');
testPendingArticles().catch(console.error);