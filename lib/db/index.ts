// File: /lib/mongodb/index.ts
import mongoose, { Mongoose } from 'mongoose';
import { database } from '../config';

if (!database.uri) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Augment the NodeJS Global type for caching in development
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}


async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: database.options?.maxPoolSize,
      serverSelectionTimeoutMS: database.options?.serverSelectionTimeoutMS,
    };
    cached.promise = mongoose.connect(database.uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: unknown) { // Use unknown for catch
    cached.promise = null;
    console.error('MongoDB connection error:', e);
    throw e; 
  }

  return cached.conn;
}

export default dbConnect;