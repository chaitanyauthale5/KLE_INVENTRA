import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { connectDB } from './config/db.js';

// Ensure .env values override any existing environment variables (e.g., system MONGO_URI)
// Resolve backend/.env explicitly relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
// Load local .env without overriding environment provided by the host (e.g., Render)
dotenv.config({ path: envPath });
console.log(`[Server] Loaded .env from: ${envPath}`);

const PORT = process.env.PORT || 5000;

// Start server only after DB connection
(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
