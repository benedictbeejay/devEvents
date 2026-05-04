import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI environment variable.");
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Extend the global object type so we can safely store a cached connection in development.
type GlobalWithMongoose = typeof globalThis & {
  _mongoose?: MongooseCache;
};

const globalForMongoose = globalThis as GlobalWithMongoose;

// Reuse an existing cache if it exists, otherwise initialize one.
const cached: MongooseCache = globalForMongoose._mongoose ?? {
  conn: null,
  promise: null,
};

globalForMongoose._mongoose = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  // Return the existing connection immediately when available.
  if (cached.conn) {
    return cached.conn;
  }

  // Create one in-flight promise and share it across concurrent requests.
  if (!cached.promise) {
    const options: mongoose.ConnectOptions = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, options);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset the promise so future calls can retry the connection.
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectToDatabase;
