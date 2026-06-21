// Main server file - Keep it clean!

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Database: opening the connection applies the schema; seed adds the Big Bang Thoughts if empty.
require('./db/connection');
require('./db/seed')();

// Import routes
const thoughtsRouter = require('./routes/thoughts');
const connectionsRouter = require('./routes/connections');

// Middleware
app.use(cors()); // Allow the frontend to call the API even when served from file:// during development
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/thoughts', thoughtsRouter);
app.use('/api/connections', connectionsRouter);

// Root endpoint - express.static serves index.html automatically
// No need for explicit root route since public folder contains index.html

// Start server
app.listen(PORT, () => {
  console.log(`✨ MindFull server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
