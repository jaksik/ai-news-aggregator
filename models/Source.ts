import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface describing the properties of a Source document
export interface ISource extends Document {
  name: string;                 // Human-readable name for the source (e.g., "Google AI Blog")
  url: string;                  // The URL of the RSS feed or the HTML page to scrape
  type: 'rss' | 'html';         // Type of the source
  isEnabled: boolean;           // Flag to easily enable/disable fetching from this source
  scrapingConfig?: {            // Configuration for HTML scraping (only used when type is 'html')
    websiteId: string;          // ID of the website configuration to use
    maxArticles?: number;       // Max articles to scrape per fetch
    customSelectors?: {         // Optional custom selectors that override defaults
      articleSelector?: string;
      titleSelector?: string;
      urlSelector?: string;
      dateSelector?: string;
      descriptionSelector?: string;
    };
  };
  lastFetchedAt?: Date;         // Timestamp of the last time a fetch was attempted for this source
  lastStatus?: string;          // Brief status of the last fetch (e.g., "Success", "Failed", "No new articles")
  lastFetchMessage?: string;    // A more detailed message from the last fetch (e.g., "Added 5 new articles", "Fetch timeout")
  lastError?: string;           // Stores the error message if the last fetch attempt failed specifically for this source
  createdAt?: Date;             // Automatically added by timestamps
  updatedAt?: Date;             // Automatically added by timestamps
}

const SourceSchema: Schema<ISource> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Source name is required.'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Source URL is required.'],
      unique: true, // Ensures each source URL is unique in the database
      trim: true,
      index: true,  // Index this field for faster queries if you search/filter by URL
    },
    type: {
      type: String,
      enum: ['rss', 'html'], // Source type must be one of these values
      required: [true, 'Source type (rss or html) is required.'],
    },
    isEnabled: {
      type: Boolean,
      default: true, // New sources will be enabled by default
      index: true,   // Index for quickly finding all enabled sources
    },
    scrapingConfig: {
      type: {
        websiteId: {
          type: String,
          required: true,
        },
        maxArticles: {
          type: Number,
          min: 1,
          max: 50,
          default: 20,
        },
        customSelectors: {
          type: {
            articleSelector: String,
            titleSelector: String,
            urlSelector: String,
            dateSelector: String,
            descriptionSelector: String,
          },
          required: false,
        },
      },
      required: false, // Only required for HTML sources
    },
    lastFetchedAt: {
      type: Date,
    },
    lastStatus: {
      type: String,
      trim: true,
    },
    lastFetchMessage: {
      type: String,
      trim: true,
    },
    lastError: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// This prevents Mongoose from recompiling the model if it already exists,
// which can happen during Next.js hot-reloading in development.
const Source: Model<ISource> = mongoose.models.Source || mongoose.model<ISource>('Source', SourceSchema);

export default Source;