const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function checkArticles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define Article schema (simplified)
    const ArticleSchema = new mongoose.Schema({
      title: String,
      link: String,
      categorizationStatus: String,
      newsCategory: String,
      techCategory: String,
      categorizedAt: Date,
    });

    const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema);

    // Count articles by categorization status
    const totalArticles = await Article.countDocuments();
    const pendingArticles = await Article.countDocuments({ categorizationStatus: 'pending' });
    const completedArticles = await Article.countDocuments({ categorizationStatus: 'completed' });
    const processingArticles = await Article.countDocuments({ categorizationStatus: 'processing' });
    const failedArticles = await Article.countDocuments({ categorizationStatus: 'failed' });

    console.log('\n=== ARTICLE CATEGORIZATION STATUS ===');
    console.log(`Total Articles: ${totalArticles}`);
    console.log(`Pending: ${pendingArticles}`);
    console.log(`Completed: ${completedArticles}`);
    console.log(`Processing: ${processingArticles}`);
    console.log(`Failed: ${failedArticles}`);

    // Show some sample pending articles
    if (pendingArticles > 0) {
      console.log('\n=== SAMPLE PENDING ARTICLES ===');
      const samplePending = await Article.find({ categorizationStatus: 'pending' }).limit(5);
      samplePending.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title}`);
        console.log(`   Status: ${article.categorizationStatus}`);
        console.log(`   News Category: ${article.newsCategory || 'None'}`);
        console.log(`   Tech Category: ${article.techCategory || 'None'}`);
        console.log('');
      });
    }

    // Show some sample completed articles
    if (completedArticles > 0) {
      console.log('\n=== SAMPLE COMPLETED ARTICLES ===');
      const sampleCompleted = await Article.find({ categorizationStatus: 'completed' }).limit(3);
      sampleCompleted.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title}`);
        console.log(`   Status: ${article.categorizationStatus}`);
        console.log(`   News Category: ${article.newsCategory || 'None'}`);
        console.log(`   Tech Category: ${article.techCategory || 'None'}`);
        console.log(`   Categorized At: ${article.categorizedAt || 'None'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkArticles();
