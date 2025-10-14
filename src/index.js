// Main server file - Keep it clean!

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const memoriesRouter = require('./routes/memories');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/memories', memoriesRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.send('MindFull API - Fill your mind with stars');
});

// Start server
app.listen(PORT, () => {
  console.log(`✨ MindFull server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});