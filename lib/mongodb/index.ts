import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Extend the NodeJS Global type with the mongoose property
declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
global.mongooseCache = cached;


async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) {
    // console.log('Using cached MongoDB connection.');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable Mongoose's buffering if you prefer to handle connection errors explicitly
    };

    // console.log('Creating new MongoDB connection promise.');
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      // console.log('New MongoDB connection established.');
      return mongooseInstance;
    });
  }

  try {
    // console.log('Awaiting MongoDB connection promise.');
    cached.conn = await cached.promise;
  } catch (e) {
    // console.error('MongoDB connection error:', e);
    cached.promise = null; // Reset promise on error
    throw e; // Re-throw error to be caught by caller
  }

  return cached.conn;
}

export default dbConnect;