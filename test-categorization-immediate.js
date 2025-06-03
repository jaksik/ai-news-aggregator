require('dotenv').config({ path: '.env.local' });

// Test the AI categorization service directly
const test = async () => {
  try {
    console.log('Testing AI categorization service...');
    
    // First, let's check current state
    console.log('\n=== BEFORE CATEGORIZATION ===');
    const response1 = await fetch('http://localhost:3000/api/ai/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result1 = await response1.json();
    console.log('API Response:', result1);
    
    // Wait a moment for any async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check database immediately after
    console.log('\n=== CHECKING DATABASE AFTER API CALL ===');
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const collection = db.collection('articles');
    
    const completed = await collection.countDocuments({ categorizationStatus: 'completed' });
    console.log('Completed articles in DB:', completed);
    
    const processing = await collection.countDocuments({ categorizationStatus: 'processing' });
    console.log('Processing articles in DB:', processing);
    
    const withCategories = await collection.countDocuments({ 
      $or: [
        { newsCategory: { $exists: true, $ne: null } },
        { techCategory: { $exists: true, $ne: null } }
      ]
    });
    console.log('Articles with categories in DB:', withCategories);
    
    // Look for the most recently updated articles
    const recentlyUpdated = await collection.find({})
      .sort({ updatedAt: -1 })
      .limit(3)
      .toArray();
    
    console.log('\nMost recently updated articles:');
    recentlyUpdated.forEach((article, i) => {
      console.log(`${i+1}. ${article.title}`);
      console.log(`   Status: ${article.categorizationStatus}`);
      console.log(`   News: ${article.newsCategory}`);
      console.log(`   Tech: ${article.techCategory}`);
      console.log(`   Updated: ${article.updatedAt}`);
      console.log('');
    });
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('Test error:', error);
  }
};

test();
