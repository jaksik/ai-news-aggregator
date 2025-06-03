import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface describing the properties of a Source document
export interface ISource extends Document {
  name: string;                 // Human-readable name for the source (e.g., "Google AI Blog")
  url: string;                  // The URL of the RSS feed or the HTML page to scrape
  type: 'rss' | 'html';         // Type of the source
  isEnabled: boolean;           // Flag to easily enable/disable fetching from this source
  websiteId?: string;            // Configuration for HTML scraping (only used when type is 'html')
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
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['rss', 'html'], 
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: false, 
      index: true,  
    },
    websiteId: {
      type: String,
      required: false,
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