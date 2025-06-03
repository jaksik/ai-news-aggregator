require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Article schema (matching the TypeScript interface)
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

const debugCategorization = async () => {
  try {
    await connectDB();
    
    console.log('=== DEBUGGING CATEGORIZATION STATUS ===\n');
    
    // Check total articles
    const totalArticles = await Article.countDocuments();
    console.log(`Total articles in database: ${totalArticles}`);
    
    // Check status distribution
    const statusCounts = await Article.aggregate([
      {
        $group: {
          _id: '$categorizationStatus',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    console.log('\nStatus distribution:');
    statusCounts.forEach(status => {
      console.log(`  ${status._id || 'undefined'}: ${status.count}`);
    });
    
    // Check for any articles with newsCategory or techCategory
    const articlesWithCategories = await Article.find({
      $or: [
        { newsCategory: { $exists: true, $ne: null } },
        { techCategory: { $exists: true, $ne: null } }
      ]
    }).limit(5);
    
    console.log(`\nArticles with categories: ${articlesWithCategories.length}`);
    
    if (articlesWithCategories.length > 0) {
      console.log('\nSample articles with categories:');
      articlesWithCategories.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title}`);
        console.log(`   News Category: ${article.newsCategory || 'undefined'}`);
        console.log(`   Tech Category: ${article.techCategory || 'undefined'}`);
        console.log(`   Status: ${article.categorizationStatus || 'undefined'}`);
        console.log(`   Categorized At: ${article.categorizedAt || 'undefined'}`);
        console.log('');
      });
    }
    
    // Check specifically for completed status
    const completedArticles = await Article.find({ categorizationStatus: 'completed' });
    console.log(`Articles with 'completed' status: ${completedArticles.length}`);
    
    // Check for processing status
    const processingArticles = await Article.find({ categorizationStatus: 'processing' });
    console.log(`Articles with 'processing' status: ${processingArticles.length}`);
    
    // Sample some pending articles to check their structure
    const pendingArticles = await Article.find({ categorizationStatus: 'pending' })
      .limit(3)
      .select('_id title categorizationStatus newsCategory techCategory categorizedAt');
    
    console.log('\nSample pending articles:');
    pendingArticles.forEach((article, index) => {
      console.log(`${index + 1}. ID: ${article._id}`);
      console.log(`   Title: ${article.title}`);
      console.log(`   Status: ${article.categorizationStatus}`);
      console.log(`   News Category: ${article.newsCategory || 'undefined'}`);
      console.log(`   Tech Category: ${article.techCategory || 'undefined'}`);
      console.log(`   Categorized At: ${article.categorizedAt || 'undefined'}`);
      console.log('');
    });
    
    // Check if there are any articles that were recently modified
    const recentlyModified = await Article.find({})
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('_id title categorizationStatus newsCategory techCategory updatedAt');
    
    console.log('\nMost recently modified articles:');
    recentlyModified.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   Status: ${article.categorizationStatus}`);
      console.log(`   News Category: ${article.newsCategory || 'undefined'}`);
      console.log(`   Tech Category: ${article.techCategory || 'undefined'}`);
      console.log(`   Updated At: ${article.updatedAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error debugging categorization:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the debug
debugCategorization();
