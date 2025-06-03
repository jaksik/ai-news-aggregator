require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
  try {
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

const checkCategorizedArticles = async () => {
  try {
    await connectDB();
    
    console.log('Checking categorized articles...');
    
    // Find completed articles
    const completedArticles = await Article.find({ 
      categorizationStatus: 'completed' 
    }).limit(10).select('title newsCategory techCategory categorizedAt categorizationStatus');
    
    console.log(`Found ${completedArticles.length} completed articles:`);
    console.log('');
    
    completedArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   News Category: ${article.newsCategory}`);
      console.log(`   Tech Category: ${article.techCategory}`);
      console.log(`   Categorized At: ${article.categorizedAt}`);
      console.log(`   Status: ${article.categorizationStatus}`);
      console.log('');
    });
    
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
    
    console.log('Status distribution:');
    statusCounts.forEach(status => {
      console.log(`   ${status._id || 'undefined'}: ${status.count}`);
    });
    
  } catch (error) {
    console.error('Error checking articles:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the check
checkCategorizedArticles();
