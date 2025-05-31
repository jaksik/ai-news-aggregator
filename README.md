# AI News Aggregator - Comprehensive Project Documentation

## 🎯 Project Overview

The AI News Aggregator is a **Next.js-based web application** that automatically collects, processes, and displays articles from various AI/tech news sources. The system supports both **RSS feeds** and **HTML website scraping**, with advanced anti-bot protection capabilities for difficult sites.

### 🏗️ Current Architecture Status
**RECENTLY COMPLETED**: Major 4-phase backend refactoring (2024-2025) that transformed the system from a monolithic architecture into a clean, modular service-oriented design. **All phases are complete and production-ready.**

---

## 🛠️ Technology Stack

### Core Framework
- **Next.js 15.3.2** (React 19) - Full-stack web framework
- **TypeScript 5** - Type safety and enhanced development experience
- **Tailwind CSS 4** - Utility-first CSS framework

### Backend & Database
- **MongoDB** with **Mongoose 8.15.1** - Document database for articles, sources, logs
- **NextAuth.js 4.24.11** - Authentication (Google, GitHub OAuth)
- **Node.js** server-side processing

### Content Processing
- **RSS Parser 3.13.0** - RSS feed parsing and validation
- **Cheerio 1.0.0** - Server-side HTML parsing and manipulation
- **Puppeteer 24.9.0** - Browser automation for anti-bot protection
- **Axios 1.9.0** - HTTP client for web requests

### Development & Deployment
- **ESLint 9** - Code linting and style enforcement
- **Vercel** - Deployment platform (configured)

---

## 📊 Data Models & Database Schema

### Core Entities

#### 1. Article (`models/Article.ts`)
```typescript
interface IArticle {
  title: string;                    // Article headline
  link: string;                     // Unique URL (indexed, prevents duplicates)
  sourceName: string;               // Name of source website/feed
  publishedDate?: Date;             // Publication date (when available)
  descriptionSnippet?: string;      // Article summary/excerpt
  guid?: string;                    // RSS GUID (sparse unique index)
  fetchedAt: Date;                  // When aggregator found this article
  isRead: boolean;                  // User read status
  isStarred: boolean;               // User bookmark status
  isHidden: boolean;                // User hide status
}
```

#### 2. Source (`models/Source.ts`)
```typescript
interface ISource {
  name: string;                     // Human-readable source name
  url: string;                      // RSS feed URL or website URL
  type: 'rss' | 'html';            // Processing type
  isEnabled: boolean;               // Enable/disable fetching
  scrapingConfig?: {                // HTML scraping configuration
    websiteId: string;              // References websiteConfigs.ts
    maxArticles?: number;           // Override default limits
    customSelectors?: { ... };      // Custom CSS selectors
  };
  lastFetchedAt?: Date;            // Last fetch timestamp
  lastStatus?: string;             // Last fetch status
  lastFetchMessage?: string;       // Detailed last fetch result
  lastError?: string;              // Last error message
}
```

#### 3. FetchRunLog (`models/FetchRunLog.ts`)
```typescript
interface IFetchRunLog {
  runId: string;                   // Unique run identifier
  startTime: Date;                 // Fetch run start time
  endTime?: Date;                  // Fetch run completion time
  totalSources: number;            // Number of sources processed
  successfulSources: number;       // Sources that fetched successfully
  totalNewArticles: number;        // New articles added across all sources
  sources: Array<{                 // Per-source results
    sourceId: string;
    sourceName: string;
    status: 'success' | 'partial_success' | 'failed';
    // ... detailed results
  }>;
}
```

---

## 🏛️ Service-Oriented Architecture (Post-Refactoring)

### 📁 Service Layer (`lib/services/`)

The system uses a **modular service architecture** where each service has a single responsibility:

#### 1. **Main Orchestrator**
- **`fetcher.ts`** (80 lines) - Main coordinator that delegates to specialized processors

#### 2. **Type-Specific Processors**
- **`rssProcessor.ts`** - Handles RSS feed parsing and article extraction
- **`htmlProcessor.ts`** - Handles website scraping and article extraction

#### 3. **Supporting Services**
- **`articleProcessor.ts`** - Article saving, duplicate checking, database operations
- **`scraperSelector.ts`** - Strategy-based scraper selection (standard vs enhanced)
- **`configurationManager.ts`** - Centralized configuration validation and merging

### 🔄 Processing Flow

```
Source Request → fetcher.ts → {RSS or HTML?}
                    ↓                ↓
                RSSProcessor    HTMLProcessor
                    ↓                ↓
               ArticleProcessor ← ScraperSelector
                    ↓          ← ConfigurationManager
                Database
```

---

## 🌐 Web Scraping System

### Dual-Mode Scraping Strategy

The system uses a **intelligent fallback approach**:

1. **Standard HTTP Scraping** (Primary)
   - Fast, low resource usage
   - Works for most sites
   - Uses `cheerio` for HTML parsing

2. **Enhanced Puppeteer Scraping** (Fallback)
   - Full browser simulation
   - Bypasses anti-bot protections
   - Automatic resource cleanup

### 🎯 Scraper Selection Logic (`scraperSelector.ts`)

```typescript
// Sites requiring enhanced scraping
ENHANCED_SCRAPER_SITES = ['scale-blog', ...]

// Automatic selection based on:
// 1. Force strategy (if specified)
// 2. Known difficult sites → enhanced
// 3. Known easy sites → standard  
// 4. Default → auto (try standard first)
```

### 📝 Website Configurations (`lib/scrapers/websiteConfigs.ts`)

Pre-configured scraping rules for specific websites:

```typescript
export const websiteConfigs = {
  'scale-blog': {
    websiteId: 'scale-blog',
    name: 'Scale AI Blog',
    baseUrl: 'https://scale.com',
    articleSelector: 'a[href*="/blog/"]',
    titleSelector: 'h1, h2, h3',
    // ... more selectors
  },
  'anthropic-news': { /* ... */ },
  'elevenlabs-blog': { /* ... */ },
  // Add new sites here
};
```

---

## 🔧 Configuration & Environment

### Required Environment Variables

Create `.env.local` in project root:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/news-aggregator
# OR MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/database

# Authentication (NextAuth.js)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# Application Settings
MAX_ARTICLES_PER_SOURCE=20  # Global article limit (overrides all other limits)
```

### 📊 Article Limiting System (`lib/config/articleLimits.ts`)

**Centralized article limiting** with environment variable precedence:

```typescript
// Priority order:
// 1. MAX_ARTICLES_PER_SOURCE (env) - HIGHEST PRIORITY
// 2. Source-specific limit (database)
// 3. Website config limit (websiteConfigs.ts)
// 4. Default fallback (20)
```

---

## 🚀 Development Guide

### Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Start development server
npm run dev
# Opens on http://localhost:3000 (or next available port)

# Build for production
npm run build
npm start
```

### 🧪 Testing Endpoints

The system includes comprehensive test endpoints for validation:

- **`/api/test/phase4-complete`** - Complete integration test
- **`/api/test/scale-scraping`** - Scale AI scraping validation  
- **`/api/test/configuration-manager`** - Configuration service test
- **`/api/test/scraper-selector`** - Scraper selection test
- **`/api/test/article-limits`** - Article limiting system test

### Adding New News Sources

#### For RSS Sources:
1. Add source via UI: Dashboard → Sources → Add Source
2. Set type to "RSS" and provide feed URL

#### For HTML Sources:
1. **Add website configuration** in `lib/scrapers/websiteConfigs.ts`:
```typescript
'new-site-id': {
  websiteId: 'new-site-id',
  name: 'Site Name',
  baseUrl: 'https://example.com',
  articleSelector: 'article, .post',
  titleSelector: 'h1, h2',
  dateSelector: '.date, time',
  // ... configure selectors
}
```

2. **Add source via UI** with `websiteId: 'new-site-id'` in scrapingConfig

3. **Test the configuration** using test endpoints

### 🔧 Common Maintenance Tasks

#### Debugging Scraping Issues:
```bash
# Check specific site scraping
curl "http://localhost:3000/api/test/scale-scraping"

# View recent fetch logs
# Navigate to: /dashboard/logs
```

#### Monitoring Article Limits:
```bash
# Test current limit configuration
curl "http://localhost:3000/api/test/article-limits"
```

#### Adding Anti-Bot Protection:
1. Add site to `ENHANCED_SCRAPER_SITES` in `scraperSelector.ts`
2. Configure selectors in `websiteConfigs.ts`
3. Test with enhanced scraper endpoint

---

## 🏗️ Architecture Evolution History

### Phase 1: Article Processing Extraction ✅
- Extracted article saving/checking logic into `ArticleProcessor`
- Created `processRSSArticle()` and `processHTMLArticle()` methods

### Phase 2: Scraper Selection Logic Extraction ✅
- Created `ScraperSelector` service
- Replaced hardcoded `difficultSites` array with strategy-based selection
- Added site management capabilities

### Phase 3: Configuration Management Extraction ✅
- Implemented `ConfigurationManager` singleton
- Centralized configuration validation and merging
- Unified RSS and HTML source configuration

### Phase 4: RSS/HTML Processing Separation ✅
- Created dedicated `RSSProcessor` and `HTMLProcessor`
- Complete separation of concerns
- **73% code reduction** in main fetcher (300+ → 80 lines)

---

## 🔒 Security & Authentication

### Authentication System
- **NextAuth.js** handles OAuth flows
- **Google & GitHub** OAuth providers configured
- **Session-based authentication** with secure cookies

### Web Scraping Security
- **User-Agent rotation** to appear as real browsers
- **Rate limiting** and request delays
- **Resource cleanup** to prevent memory leaks
- **Error isolation** to prevent system crashes

---

## 📁 Key File Locations

### Core Services
- `lib/services/fetcher.ts` - Main orchestrator
- `lib/services/rssProcessor.ts` - RSS processing
- `lib/services/htmlProcessor.ts` - HTML processing
- `lib/services/articleProcessor.ts` - Article database operations
- `lib/services/scraperSelector.ts` - Scraper selection logic
- `lib/services/configurationManager.ts` - Configuration management

### Scraping System
- `lib/scrapers/htmlScraper.ts` - Standard HTTP scraping
- `lib/scrapers/puppeteerScraper.ts` - Enhanced browser scraping
- `lib/scrapers/websiteConfigs.ts` - Site-specific configurations

### Data Models
- `models/Article.ts` - Article schema
- `models/Source.ts` - News source schema
- `models/FetchRunLog.ts` - Fetch operation logging

### Configuration
- `lib/config/articleLimits.ts` - Article limiting system
- `lib/mongodb/index.ts` - Database connection

---

## 🚨 Known Issues & Solutions

### Scale AI Scraping ✅ SOLVED
- **Issue**: Anti-bot protection blocking scraping
- **Solution**: Enhanced Puppeteer scraper with realistic browser simulation
- **Status**: Working correctly (10 articles found in tests)

### TypeScript Errors ✅ SOLVED
- **Issue**: Type mismatches in service integrations
- **Solution**: Proper union types and null safety checks
- **Status**: All errors resolved

---

## 🔄 Common Development Patterns

### Adding a New Service:
1. Create service in `lib/services/`
2. Define clear interfaces and error handling
3. Add comprehensive logging
4. Create test endpoint in `pages/api/test/`
5. Integrate with main fetcher if needed

### Modifying Scraping Logic:
1. Update `websiteConfigs.ts` for site-specific changes
2. Modify `scraperSelector.ts` for selection logic
3. Update `htmlProcessor.ts` for processing changes
4. Test with relevant test endpoints

### Database Schema Changes:
1. Update model interfaces in `models/`
2. Test with existing data
3. Create migration script if needed
4. Update related services

---

## 📈 Performance & Monitoring

### Resource Management
- **Browser cleanup** for Puppeteer instances
- **Connection pooling** for MongoDB
- **Memory management** in long-running processes

### Error Handling
- **Service-level isolation** - errors in one service don't affect others
- **Comprehensive logging** for debugging
- **Graceful degradation** when services fail

### Monitoring Points
- Fetch success rates per source
- Article processing performance
- Memory usage during scraping
- Database operation timing

---

## 🎯 Next Steps & Future Enhancements

### Immediate Opportunities
- **Performance monitoring** dashboard
- **Advanced filtering** and search capabilities
- **Email notifications** for fetch failures
- **Bulk source management** tools

### Architecture Extensions
- **Plugin system** for custom processors
- **Real-time updates** with WebSockets
- **Caching layer** for improved performance
- **Microservices** deployment option

---

## 🆘 Troubleshooting Guide

### Common Issues

#### 1. Scraping Failures
```bash
# Check scraper test endpoints
curl "http://localhost:3000/api/test/scraper-selector"

# Review website configuration
# Edit lib/scrapers/websiteConfigs.ts
```

#### 2. Database Connection Issues
```bash
# Verify MONGODB_URI in .env.local
# Check MongoDB service status
# Review lib/mongodb/index.ts for connection logic
```

#### 3. Authentication Problems
```bash
# Verify OAuth credentials in .env.local
# Check NEXTAUTH_URL and NEXTAUTH_SECRET
# Review pages/api/auth/[...nextauth].ts
```

#### 4. TypeScript Errors
```bash
# Run type checking
npm run type-check

# Check service interfaces in lib/services/
# Verify model definitions in models/
```

---

## 📚 Additional Resources

### Development
- **Next.js Documentation**: https://nextjs.org/docs
- **MongoDB Mongoose**: https://mongoosejs.com/docs
- **Puppeteer Guide**: https://pptr.dev/

### Project-Specific
- `PHASE4_COMPLETION_SUMMARY.md` - Detailed refactoring documentation
- `pages/api/test/` - All test endpoints for validation
- Comments in service files for implementation details

---

**Last Updated**: May 31, 2025  
**Architecture Version**: Phase 4 Complete  
**Status**: ✅ Production Ready

---

This README provides complete context for any AI assistant working on this project. The system is fully functional, well-tested, and ready for further development or maintenance.