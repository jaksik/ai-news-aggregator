import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for the plain object type
export interface ITool {
  _id: string; // Plain objects will always have _id as string after conversion
  name: string;
  category: string;
  subcategory?: string; // Optional based on schema
  url: string;
  logoUrl?: string; // Optional based on schema
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for the Mongoose document
export interface IToolDocument extends Document {
  // _id is inherited from Document and is an ObjectId by default
  name: string;
  category: string;
  subcategory?: string; // Optional based on schema
  url: string;
  logoUrl?: string; // Optional based on schema
  description: string;
  createdAt: Date; // Provided by timestamps: true
  updatedAt: Date; // Provided by timestamps: true
}

const ToolSchema: Schema<IToolDocument> = new Schema(
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
      // required: [true, 'Subcategory is required.'], // Removed required constraint
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
      // required: [true, 'Logo URL is required.'], // Removed required constraint
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

// const Tool: Model<ITool> = mongoose.models.Tool || mongoose.model<ITool>('Tool', ToolSchema);
const Tool: Model<IToolDocument> = mongoose.models.Tool || mongoose.model<IToolDocument>('Tool', ToolSchema);

export default Tool;
