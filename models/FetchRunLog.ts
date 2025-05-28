import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. Define IItemErrorSubdoc first, as IProcessingSummarySubdoc will use it.
// Add 'export' keyword here:
export interface IItemErrorSubdoc { // <--- ADD export HERE
  itemTitle?: string;
  itemLink?: string;
  message: string;
}
const ItemErrorSchema = new Schema<IItemErrorSubdoc>({
  itemTitle: { type: String },
  itemLink: { type: String },
  message: { type: String, required: true },
}, { _id: false });


// 2. Define IProcessingSummarySubdoc next, as IFetchRunLog will use it.
// Add 'export' keyword here:
export interface IProcessingSummarySubdoc { // <--- ADD export HERE
  sourceUrl: string;
  sourceName: string;
  type: 'rss' | 'html';
  status: 'success' | 'partial_success' | 'failed';
  message: string; 
  itemsFound: number;
  itemsProcessed: number;
  newItemsAdded: number;
  itemsSkipped: number;
  errors: IItemErrorSubdoc[]; // Uses the IItemErrorSubdoc defined above
  fetchError?: string;
}

const ProcessingSummarySchema = new Schema<IProcessingSummarySubdoc>({
  sourceUrl: { type: String, required: true },
  sourceName: { type: String, required: true },
  type: { type: String, enum: ['rss', 'html'], required: true },
  status: { type: String, enum: ['success', 'partial_success', 'failed'], required: true },
  message: { type: String, default: '' }, 
  itemsFound: { type: Number, default: 0, required: true },
  itemsProcessed: { type: Number, default: 0, required: true },
  newItemsAdded: { type: Number, default: 0, required: true },
  itemsSkipped: { type: Number, default: 0, required: true },
  errors: [ItemErrorSchema], 
  fetchError: { type: String },
}, { _id: false });


// 3. Now define IFetchRunLog, which uses IProcessingSummarySubdoc.
// This one is already exported, which is good.
export interface IFetchRunLog extends Document {
  startTime: Date;
  endTime?: Date;
  status: 'in-progress' | 'completed' | 'completed_with_errors' | 'failed';
  totalSourcesAttempted: number;
  totalSourcesSuccessfullyProcessed: number;
  totalSourcesFailedWithError: number;
  totalNewArticlesAddedAcrossAllSources: number;
  orchestrationErrors: string[];
  sourceSummaries: IProcessingSummarySubdoc[]; // Correctly uses the defined interface
  createdAt?: Date;
  updatedAt?: Date;
}

// ... (rest of your FetchRunLog.ts file remains the same) ...

const FetchRunLogSchema: Schema<IFetchRunLog> = new Schema(
  {
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    status: { type: String, enum: ['in-progress', 'completed', 'completed_with_errors', 'failed'], required: true },
    totalSourcesAttempted: { type: Number, default: 0 },
    totalSourcesSuccessfullyProcessed: { type: Number, default: 0 },
    totalSourcesFailedWithError: { type: Number, default: 0 },
    totalNewArticlesAddedAcrossAllSources: { type: Number, default: 0 },
    orchestrationErrors: [{ type: String }],
    sourceSummaries: [ProcessingSummarySchema], 
  },
  {
    timestamps: true,
  }
);

FetchRunLogSchema.index({ startTime: -1 });
FetchRunLogSchema.index({ status: 1 });

const FetchRunLog: Model<IFetchRunLog> =
  mongoose.models.FetchRunLog || mongoose.model<IFetchRunLog>('FetchRunLog', FetchRunLogSchema);

export default FetchRunLog;