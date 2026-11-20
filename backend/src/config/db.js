import mongoose from 'mongoose';
import { config } from './env.js';

/**
 * Connect to MongoDB (Atlas or local).
 * Retries on failure and logs connection state.
 */
export async function connectDB() {
  const uri = config.mongodbUri;

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  let retries = 0;
  const maxRetries = 5;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000,
      });
      return mongoose.connection;
    } catch (err) {
      retries += 1;
      console.error(`[db] Connection attempt ${retries}/${maxRetries} failed: ${err.message}`);
      if (retries >= maxRetries) throw err;
      await new Promise((res) => setTimeout(res, 3000 * retries));
    }
  }
}

export default connectDB;
