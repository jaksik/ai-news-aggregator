import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITool extends Document {
  name: string;
  category: string;
  subcategory: string;
  url: string;
  logoUrl: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const ToolSchema: Schema<ITool> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Tool name is required.'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required.'],
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      required: [true, 'Subcategory is required.'],
      trim: true,
      index: true,
    },
    url: {
      type: String,
      required: [true, 'Tool URL is required.'],
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'URL must be a valid HTTP or HTTPS URL.'
      }
    },
    logoUrl: {
      type: String,
      required: [true, 'Logo URL is required.'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters.'],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Create indexes for efficient querying
ToolSchema.index({ category: 1, subcategory: 1 });
ToolSchema.index({ name: 'text', description: 'text' }); // Text search index

const Tool: Model<ITool> = mongoose.models.Tool || mongoose.model<ITool>('Tool', ToolSchema);

export default Tool;
