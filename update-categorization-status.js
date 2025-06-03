require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-news-aggregator');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Article schema (simplified for this script)
const ArticleSchema = new mongoose.Schema({
  title: String,
  link: String,
  sourceName: String,
  publishedDate: Date,
  descriptionSnippet: String,
  guid: String,
  fetchedAt: Date,
  newsCategory: String,
  techCategory: String,
  categorizationStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  categorizedAt: Date,
  isRead: { type: Boolean, default: false },
  isStarred: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false }
}, { timestamps: true });

const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema);

const updateArticles = async () => {
  try {
    await connectDB();
    
    console.log('Finding articles without categorizationStatus...');
    
    // Find articles that don't have categorizationStatus set
    const articlesWithoutStatus = await Article.find({
      $or: [
        { categorizationStatus: { $exists: false } },
        { categorizationStatus: null }
      ]
    }).limit(20);
    
    console.log(`Found ${articlesWithoutStatus.length} articles without categorization status`);
    
    if (articlesWithoutStatus.length === 0) {
      console.log('No articles found without categorization status. Checking all articles...');
      
      // Check total articles in database
      const totalArticles = await Article.countDocuments();
      console.log(`Total articles in database: ${totalArticles}`);
      
      // Show sample of existing articles with their status
      const sampleArticles = await Article.find({}).limit(5).select('title categorizationStatus newsCategory techCategory');
      console.log('\nSample articles and their current status:');
      sampleArticles.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title}`);
        console.log(`   Status: ${article.categorizationStatus || 'undefined'}`);
        console.log(`   News Category: ${article.newsCategory || 'none'}`);
        console.log(`   Tech Category: ${article.techCategory || 'none'}`);
        console.log('');
      });
      
      return;
    }
    
    // Update articles to have pending status
    const updateResult = await Article.updateMany(
      {
        $or: [
          { categorizationStatus: { $exists: false } },
          { categorizationStatus: null }
        ]
      },
      { 
        $set: { categorizationStatus: 'pending' }
      },
      { limit: 20 }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} articles to have categorizationStatus: 'pending'`);
    
    // Verify the update
    const pendingArticles = await Article.find({ categorizationStatus: 'pending' }).limit(5);
    console.log('\nSample of updated articles:');
    pendingArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   Status: ${article.categorizationStatus}`);
      console.log(`   ID: ${article._id}`);
      console.log('');
    });
    
    console.log('\nUpdate completed successfully!');
    
  } catch (error) {
    console.error('Error updating articles:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the update
updateArticles();
