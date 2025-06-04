import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for individual article processing results
export interface IArticleCategorizationSummary {
  articleId: string;
  title: string;
  newsCategory: string;
  techCategory: string;
  aiRationale: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  processingTimeMs?: number;
}

// Interface for category distribution stats
export interface ICategoryDistribution {
  'Top Story Candidate': number;
  'Solid News': number;
  'Interesting but Lower Priority': number;
  'Likely Noise or Opinion': number;
}

export interface ITechCategoryDistribution {
  'Products and Updates': number;
  'Developer Tools': number;
  'Research and Innovation': number;
  'Industry Trends': number;
  'Startups and Funding': number;
  'Not Relevant': number;
}

// Interface for OpenAI usage tracking
export interface IOpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  modelUsed: string;
}

// Main interface for the categorization run log
export interface ICategorizationRunLog extends Document {
  // Timing and status
  startTime: Date;
  endTime?: Date;
  status: 'in-progress' | 'completed' | 'completed_with_errors' | 'failed';
  processingTimeMs?: number;
  
  // Overall statistics
  totalArticlesAttempted: number;
  totalArticlesSuccessful: number;
  totalArticlesFailed: number;
  
  // Category distributions
  newsCategoryDistribution: ICategoryDistribution;
  techCategoryDistribution: ITechCategoryDistribution;
  
  // OpenAI usage and costs
  openaiUsage: IOpenAIUsage;
  
  // Detailed results for each article
  articleSummaries: IArticleCategorizationSummary[];
  
  // Error tracking
  orchestrationErrors: string[];
  
  // Configuration used for this run
  articleLimit: number;
  openaiModel: string;
  
  // Optional metadata
  triggeredBy?: 'manual' | 'scheduled' | 'api';
  notes?: string;
}

// Category distribution schema
const CategoryDistributionSchema = new Schema({
  'Top Story Candidate': { type: Number, default: 0 },
  'Solid News': { type: Number, default: 0 },
  'Interesting but Lower Priority': { type: Number, default: 0 },
  'Likely Noise or Opinion': { type: Number, default: 0 }
}, { _id: false });

// Tech category distribution schema
const TechCategoryDistributionSchema = new Schema({
  'Products and Updates': { type: Number, default: 0 },
  'Developer Tools': { type: Number, default: 0 },
  'Research and Innovation': { type: Number, default: 0 },
  'Industry Trends': { type: Number, default: 0 },
  'Startups and Funding': { type: Number, default: 0 },
  'Not Relevant': { type: Number, default: 0 }
}, { _id: false });

// OpenAI usage schema
const OpenAIUsageSchema = new Schema({
  promptTokens: { type: Number, required: true },
  completionTokens: { type: Number, required: true },
  totalTokens: { type: Number, required: true },
  estimatedCostUSD: { type: Number, required: true },
  modelUsed: { type: String, required: true }
}, { _id: false });

// Article categorization summary schema
const ArticleCategorizationSummarySchema = new Schema({
  articleId: { type: String, required: true },
  title: { type: String, required: true },
  newsCategory: { type: String, required: true },
  techCategory: { type: String, required: true },
  aiRationale: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['success', 'failed'], 
    required: true 
  },
  errorMessage: { type: String },
  processingTimeMs: { type: Number }
}, { _id: false });

// Main categorization run log schema
const CategorizationRunLogSchema: Schema<ICategorizationRunLog> = new Schema(
  {
    // Timing and status
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    endTime: {
      type: Date,
      index: true
    },
    status: {
      type: String,
      enum: ['in-progress', 'completed', 'completed_with_errors', 'failed'],
      default: 'in-progress',
      required: true,
      index: true
    },
    processingTimeMs: {
      type: Number
    },
    
    // Overall statistics
    totalArticlesAttempted: {
      type: Number,
      required: true,
      default: 0
    },
    totalArticlesSuccessful: {
      type: Number,
      required: true,
      default: 0
    },
    totalArticlesFailed: {
      type: Number,
      required: true,
      default: 0
    },
    
    // Category distributions
    newsCategoryDistribution: {
      type: CategoryDistributionSchema,
      required: true,
      default: () => ({})
    },
    techCategoryDistribution: {
      type: TechCategoryDistributionSchema,
      required: true,
      default: () => ({})
    },
    
    // OpenAI usage and costs
    openaiUsage: {
      type: OpenAIUsageSchema,
      required: true
    },
    
    // Detailed results
    articleSummaries: {
      type: [ArticleCategorizationSummarySchema],
      default: []
    },
    
    // Error tracking
    orchestrationErrors: {
      type: [String],
      default: []
    },
    
    // Configuration
    articleLimit: {
      type: Number,
      required: true
    },
    openaiModel: {
      type: String,
      required: true
    },
    
    // Metadata
    triggeredBy: {
      type: String,
      enum: ['manual', 'scheduled', 'api'],
      default: 'manual'
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'categorizationrunlogs'
  }
);

// Indexes for better query performance
CategorizationRunLogSchema.index({ startTime: -1 }); // Recent runs first
CategorizationRunLogSchema.index({ status: 1, startTime: -1 }); // Filter by status
CategorizationRunLogSchema.index({ 'articleSummaries.articleId': 1 }); // Find runs for specific articles

// Helper methods
CategorizationRunLogSchema.methods.calculateSuccessRate = function(): number {
  if (this.totalArticlesAttempted === 0) return 0;
  return (this.totalArticlesSuccessful / this.totalArticlesAttempted) * 100;
};

CategorizationRunLogSchema.methods.getDurationInSeconds = function(): number {
  if (!this.processingTimeMs) return 0;
  return Math.round(this.processingTimeMs / 1000);
};

// Static methods for common queries
CategorizationRunLogSchema.statics.findRecentRuns = function(limit: number = 10) {
  return this.find()
    .sort({ startTime: -1 })
    .limit(limit)
    .exec();
};

CategorizationRunLogSchema.statics.findRunsInProgress = function() {
  return this.find({ status: 'in-progress' }).exec();
};

// Prevent model overwrite during hot-reloading in development
const CategorizationRunLog: Model<ICategorizationRunLog> = 
  mongoose.models.CategorizationRunLog || 
  mongoose.model<ICategorizationRunLog>('CategorizationRunLog', CategorizationRunLogSchema);

export default CategorizationRunLog;