const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Checking environment variables...');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Found' : 'Not found');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');
console.log('MONGODB_URL:', process.env.MONGODB_URL ? 'Found' : 'Not found');

// List all env variables that contain 'mongo' or 'db'
console.log('\n🔍 All environment variables containing "mongo" or "db":');
Object.keys(process.env).forEach(key => {
    if (key.toLowerCase().includes('mongo') || key.toLowerCase().includes('db')) {
        console.log(`${key}: ${process.env[key] ? 'Set' : 'Not set'}`);
    }
});

// Try to find the correct MongoDB URI
let mongoUri = process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    process.env.MONGODB_URL;

if (!mongoUri) {
    console.log('\n❌ No MongoDB URI found in environment variables');
    console.log('Please check your .env file and make sure it contains one of:');
    console.log('- MONGODB_URI=your_connection_string');
    console.log('- MONGO_URI=your_connection_string');
    console.log('- DATABASE_URL=your_connection_string');
    process.exit(1);
}

console.log('\n✅ Found MongoDB URI, attempting connection...');

// Article Schema (simplified for script)
const ArticleSchema = new mongoose.Schema({
    title: String,
    link: String,
    sourceName: String,
    publishedDate: Date,
    descriptionSnippet: String,
    newsCategory: String,
    techCategory: String,
    categorizationStatus: String,
    categorizedAt: Date,
    fetchedAt: Date,
}, {
    timestamps: true,
});

const Article = mongoose.model('Article', ArticleSchema);

async function testNewsCategoryArticles() {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Find articles with newsCategory attribute (not null/undefined)
        console.log('\n🔍 Searching for articles with newsCategory...');

        const articles = await Article.find({
            newsCategory: { $exists: true, $ne: null, $ne: '' }
        })
            .limit(30)
            .sort({ categorizedAt: -1, createdAt: -1 })
            .select('title sourceName newsCategory techCategory categorizationStatus categorizedAt publishedDate')
            .lean();

        console.log(`\n📊 Found ${articles.length} articles with newsCategory:`);
        console.log('='.repeat(80));

        articles.forEach((article, index) => {
            console.log(`\n${index + 1}. ${article.title}`);
            console.log(`   Description: ${article.descriptionSnippet}`);
            console.log(`   Source: ${article.sourceName}`);
            console.log(`   News Category: ${article.newsCategory}`);
            console.log(`   Tech Category: ${article.techCategory || 'None'}`);
        });

        // Summary statistics
        console.log('\n' + '='.repeat(80));
        console.log('📈 SUMMARY STATISTICS:');
        console.log(`Total articles found: ${articles.length}`);

        // Count by news category
        const newsCategoryCounts = {};
        articles.forEach(article => {
            if (article.newsCategory) {
                newsCategoryCounts[article.newsCategory] = (newsCategoryCounts[article.newsCategory] || 0) + 1;
            }
        });

        console.log('\n📰 News Categories:');
        Object.entries(newsCategoryCounts).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} articles`);
        });

        // Count by categorization status
        const statusCounts = {};
        articles.forEach(article => {
            statusCounts[article.categorizationStatus] = (statusCounts[article.categorizationStatus] || 0) + 1;
        });

        console.log('\n🏷️ Categorization Status:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${status}: ${count} articles`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
testNewsCategoryArticles();