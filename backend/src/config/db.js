import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set in environment');
  }
  // Basic validation: must start with mongodb:// or mongodb+srv://
  const isMongoLike = /^(mongodb(\+srv)?):\/\//i.test(uri);
  if (!isMongoLike) {
    throw new Error(
      `MONGO_URI looks invalid. Expected it to start with "mongodb://" or "mongodb+srv://" but got: ${uri}`
    );
  }

  // Diagnostics: log a masked URI and warn about common mistakes
  try {
    const masked = uri.replace(/:\/\/(.*?):(.*?)@/, (m, user) => `://${user}:******@`);
    console.log(`[DB] Using MONGO_URI: ${masked}`);
    if (/sih@2025/.test(uri) || /@\d{4}@/.test(uri)) {
      console.warn('[DB] Warning: It looks like the password contains an unencoded "@". Encode "@" as %40.');
    }
  } catch (_) {
    // best-effort logging only
  }
  try {
    await mongoose.connect(uri, {
      // Mongoose 8 has sensible defaults; options left empty intentionally
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};
