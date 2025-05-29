import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface describing the properties of an Article document
export interface IArticle extends Document {
  title: string;
  link: string; // This should be unique to prevent duplicate articles
  sourceName: string; // Name of the website or feed
  publishedDate?: Date; // Optional: not all sources provide this easily
  descriptionSnippet?: string; // A short summary
  guid?: string; // Optional: from RSS, can also be used for uniqueness if reliable
  fetchedAt: Date; // When your aggregator fetched this article
  isRead: boolean;
  isStarred: boolean;
  isHidden: boolean; // <-- NEW FIELD
  // You can add more fields as needed:
  // content?: string; // If you plan to store the full article content
  // imageUrl?: string;
  // categories?: string[];
}

const ArticleSchema: Schema<IArticle> = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Article title is required.'],
      trim: true,
    },
    link: {
      type: String,
      required: [true, 'Article link is required.'],
      unique: true, // Enforces uniqueness at the database level for the 'link' field
      trim: true,
      index: true, // Create an index on 'link' for faster queries
    },
    sourceName: {
      type: String,
      required: [true, 'Source name is required.'],
      trim: true,
      index: true, // Index for potential filtering/grouping by source
    },
    publishedDate: {
      type: Date,
      index: true, // Index for sorting/filtering by publication date
    },
    descriptionSnippet: {
      type: String,
      trim: true,
    },
    guid: { // Globally Unique Identifier from RSS feeds
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows multiple documents to have a null/missing guid, but if a guid exists, it must be unique
      index: true,
    },
    fetchedAt: {
      type: Date,
      default: Date.now, // Automatically set to current time when document is created
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    isHidden: { // <-- NEW FIELD DEFINITION
      type: Boolean,
      default: false, // Articles are visible by default
      index: true,    // Good to index if you'll query often for `isHidden: false`
    },
    // content: String,
    // imageUrl: String,
    // categories: [String],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps automatically
  }
);

// To prevent model overwrite errors during hot-reloading in development with Next.js
// Check if the model already exists before defining it
const Article: Model<IArticle> = mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);

export default Article;