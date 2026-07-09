const mongoose = require('mongoose');

// Cache the connection promise (not just a boolean) so that concurrent
// requests during a serverless cold start all await the same connection
// attempt instead of each calling mongoose.connect() separately.
let connectionPromise = null;

function connectDB() {
    if (mongoose.connection.readyState === 1) return Promise.resolve();
    if (connectionPromise) return connectionPromise;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        return Promise.reject(new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.'));
    }
    connectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
        .then(() => console.log('  ✓ Connected to MongoDB'))
        .catch((err) => { connectionPromise = null; throw err; });
    return connectionPromise;
}

module.exports = { connectDB };
